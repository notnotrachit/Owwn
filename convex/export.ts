import { v } from "convex/values";
import { query } from "./_generated/server";

// Export all group data
export const exportGroupData = query({
  args: { 
    groupId: v.id("groups"),
    userId: v.id("users")
  },
  returns: v.object({
    group: v.object({
      _id: v.id("groups"),
      name: v.string(),
      description: v.optional(v.string()),
      currency: v.optional(v.string()),
      currencySymbol: v.optional(v.string()),
      createdAt: v.number(),
    }),
    members: v.array(
      v.object({
        _id: v.id("users"),
        name: v.string(),
        email: v.string(),
        role: v.union(v.literal("admin"), v.literal("member")),
      })
    ),
    expenses: v.array(
      v.object({
        _id: v.id("expenses"),
        description: v.string(),
        amount: v.number(),
        currency: v.string(),
        category: v.optional(v.string()),
        date: v.number(),
        notes: v.optional(v.string()),
        paidBy: v.object({
          userId: v.id("users"),
          userName: v.string(),
        }),
        payments: v.array(
          v.object({
            userId: v.id("users"),
            userName: v.string(),
            amount: v.number(),
          })
        ),
        splits: v.array(
          v.object({
            userId: v.id("users"),
            userName: v.string(),
            amount: v.number(),
            isPaid: v.boolean(),
          })
        ),
      })
    ),
    settlements: v.array(
      v.object({
        _id: v.id("settlements"),
        fromUser: v.object({
          userId: v.id("users"),
          userName: v.string(),
        }),
        toUser: v.object({
          userId: v.id("users"),
          userName: v.string(),
        }),
        amount: v.number(),
        currency: v.string(),
        date: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    balances: v.array(
      v.object({
        userId: v.id("users"),
        userName: v.string(),
        userEmail: v.string(),
        balance: v.number(),
      })
    ),
    exportedAt: v.number(),
    exportedBy: v.object({
      userId: v.id("users"),
      userName: v.string(),
    }),
  }),
  handler: async (ctx, args) => {
    // Verify user is a member of the group
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .first();

    if (!membership) {
      throw new Error("You must be a member of this group to export data");
    }

    // Get group details
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Get all members
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m.userId,
          name: user?.name ?? "Unknown",
          email: user?.email ?? "",
          role: m.role,
        };
      })
    );

    // Get all expenses with details
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const expensesWithDetails = await Promise.all(
      expenses.map(async (expense) => {
        const payer = await ctx.db.get(expense.paidBy);
        
        const payments = await ctx.db
          .query("expensePayments")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();

        const paymentsWithNames = await Promise.all(
          payments.map(async (payment) => {
            const user = await ctx.db.get(payment.userId);
            return {
              userId: payment.userId,
              userName: user?.name ?? "Unknown",
              amount: payment.amount,
            };
          })
        );

        const splits = await ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect();

        const splitsWithNames = await Promise.all(
          splits.map(async (split) => {
            const user = await ctx.db.get(split.userId);
            return {
              userId: split.userId,
              userName: user?.name ?? "Unknown",
              amount: split.amount,
              isPaid: split.isPaid,
            };
          })
        );

        return {
          _id: expense._id,
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          date: expense.date,
          notes: expense.notes,
          paidBy: {
            userId: expense.paidBy,
            userName: payer?.name ?? "Unknown",
          },
          payments: paymentsWithNames,
          splits: splitsWithNames,
        };
      })
    );

    // Get all settlements
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const settlementsWithDetails = await Promise.all(
      settlements.map(async (settlement) => {
        const fromUser = await ctx.db.get(settlement.fromUser);
        const toUser = await ctx.db.get(settlement.toUser);
        
        return {
          _id: settlement._id,
          fromUser: {
            userId: settlement.fromUser,
            userName: fromUser?.name ?? "Unknown",
          },
          toUser: {
            userId: settlement.toUser,
            userName: toUser?.name ?? "Unknown",
          },
          amount: settlement.amount,
          currency: settlement.currency,
          date: settlement.date,
          notes: settlement.notes,
        };
      })
    );

    // Calculate balances
    const balanceMap = new Map<string, number>();

    // Process expenses
    for (const expense of expenses) {
      const splits = await ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      const payments = await ctx.db
        .query("expensePayments")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      for (const payment of payments) {
        balanceMap.set(
          payment.userId,
          (balanceMap.get(payment.userId) || 0) + payment.amount
        );
      }

      for (const split of splits) {
        balanceMap.set(
          split.userId,
          (balanceMap.get(split.userId) || 0) - split.amount
        );
      }
    }

    // Process settlements
    for (const settlement of settlements) {
      balanceMap.set(
        settlement.fromUser,
        (balanceMap.get(settlement.fromUser) || 0) + settlement.amount
      );
      balanceMap.set(
        settlement.toUser,
        (balanceMap.get(settlement.toUser) || 0) - settlement.amount
      );
    }

    const balances = await Promise.all(
      memberships.map(async (membership) => {
        const balance = balanceMap.get(membership.userId) || 0;
        const user = await ctx.db.get(membership.userId);
        return {
          userId: membership.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          balance: Math.round(balance),
        };
      })
    );

    // Get exporter details
    const exporter = await ctx.db.get(args.userId);

    return {
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        currency: group.currency,
        currencySymbol: group.currencySymbol,
        createdAt: group._creationTime,
      },
      members,
      expenses: expensesWithDetails,
      settlements: settlementsWithDetails,
      balances: balances.sort((a, b) => b.balance - a.balance),
      exportedAt: Date.now(),
      exportedBy: {
        userId: args.userId,
        userName: exporter?.name ?? "Unknown",
      },
    };
  },
});
