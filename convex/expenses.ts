import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new expense
export const createExpense = mutation({
  args: {
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(),
    currency: v.string(),
    paidBy: v.id("users"),
    category: v.optional(v.string()),
    date: v.number(),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    splitType: v.union(
      v.literal("equal"),
      v.literal("custom"),
      v.literal("percentage")
    ),
    splits: v.array(
      v.object({
        userId: v.id("users"),
        amount: v.number(), // For custom splits, or percentage (0-100)
      })
    ),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const { splitType, splits, ...expenseData } = args;

    // Verify all split users are members of the group
    for (const split of splits) {
      const membership = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_and_user", (q) =>
          q.eq("groupId", args.groupId).eq("userId", split.userId)
        )
        .first();

      if (!membership) {
        throw new Error("All split users must be members of the group");
      }
    }

    // Create the expense
    const expenseId = await ctx.db.insert("expenses", expenseData);

    // Calculate split amounts based on type
    let splitAmounts: { userId: Id<"users">; amount: number }[] = [];

    if (splitType === "equal") {
      const amountPerPerson = Math.floor(args.amount / splits.length);
      const remainder = args.amount - amountPerPerson * splits.length;

      splitAmounts = splits.map((split, index) => ({
        userId: split.userId,
        amount: amountPerPerson + (index === 0 ? remainder : 0),
      }));
    } else if (splitType === "percentage") {
      // Validate percentages add up to 100
      const totalPercentage = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error("Percentages must add up to 100");
      }

      splitAmounts = splits.map((split) => ({
        userId: split.userId,
        amount: Math.floor((args.amount * split.amount) / 100),
      }));

      // Adjust for rounding errors
      const totalSplit = splitAmounts.reduce((sum, s) => sum + s.amount, 0);
      if (totalSplit !== args.amount) {
        splitAmounts[0].amount += args.amount - totalSplit;
      }
    } else {
      // Custom splits
      const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
      if (totalSplit !== args.amount) {
        throw new Error("Custom split amounts must add up to total amount");
      }
      splitAmounts = splits;
    }

    // Create expense splits
    for (const split of splitAmounts) {
      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: split.userId,
        amount: split.amount,
        isPaid: split.userId === args.paidBy, // Payer's split is automatically paid
      });
    }

    return expenseId;
  },
});

// Get all expenses for a group
export const getGroupExpenses = query({
  args: { groupId: v.id("groups") },
  returns: v.array(
    v.object({
      _id: v.id("expenses"),
      _creationTime: v.number(),
      groupId: v.id("groups"),
      description: v.string(),
      amount: v.number(),
      currency: v.string(),
      paidBy: v.id("users"),
      paidByName: v.string(),
      category: v.optional(v.string()),
      date: v.number(),
      imageUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
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
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    const expensesWithDetails = await Promise.all(
      expenses.map(async (expense) => {
        const payer = await ctx.db.get(expense.paidBy);
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
          ...expense,
          paidByName: payer?.name ?? "Unknown",
          splits: splitsWithNames,
        };
      })
    );

    return expensesWithDetails;
  },
});

// Get expense details
export const getExpenseDetails = query({
  args: { expenseId: v.id("expenses") },
  returns: v.union(
    v.object({
      _id: v.id("expenses"),
      _creationTime: v.number(),
      groupId: v.id("groups"),
      description: v.string(),
      amount: v.number(),
      currency: v.string(),
      paidBy: v.id("users"),
      paidByName: v.string(),
      category: v.optional(v.string()),
      date: v.number(),
      imageUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      splits: v.array(
        v.object({
          userId: v.id("users"),
          userName: v.string(),
          userEmail: v.string(),
          amount: v.number(),
          isPaid: v.boolean(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) return null;

    const payer = await ctx.db.get(expense.paidBy);
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    const splitsWithDetails = await Promise.all(
      splits.map(async (split) => {
        const user = await ctx.db.get(split.userId);
        return {
          userId: split.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          amount: split.amount,
          isPaid: split.isPaid,
        };
      })
    );

    return {
      ...expense,
      paidByName: payer?.name ?? "Unknown",
      splits: splitsWithDetails,
    };
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user is admin or creator of the expense
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", expense.groupId).eq("userId", args.userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "admin" && expense.paidBy !== args.userId)
    ) {
      throw new Error("Only admins or expense creator can delete expenses");
    }

    // Delete all splits
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    for (const split of splits) {
      await ctx.db.delete(split._id);
    }

    // Delete the expense
    await ctx.db.delete(args.expenseId);
    return null;
  },
});

// Calculate balances for a group
export const getGroupBalances = query({
  args: { groupId: v.id("groups") },
  returns: v.object({
    balances: v.array(
      v.object({
        userId: v.id("users"),
        userName: v.string(),
        userEmail: v.string(),
        balance: v.number(), // Positive = owed to them, Negative = they owe
      })
    ),
    settlements: v.array(
      v.object({
        from: v.id("users"),
        fromName: v.string(),
        to: v.id("users"),
        toName: v.string(),
        amount: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all expenses for the group
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get all settlements
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Calculate net balance for each user
    const balanceMap = new Map<Id<"users">, number>();

    // Process expenses
    for (const expense of expenses) {
      const splits = await ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      // Payer gets credited
      balanceMap.set(
        expense.paidBy,
        (balanceMap.get(expense.paidBy) || 0) + expense.amount
      );

      // Each split participant gets debited
      for (const split of splits) {
        balanceMap.set(
          split.userId,
          (balanceMap.get(split.userId) || 0) - split.amount
        );
      }
    }

    // Process settlements
    for (const settlement of settlements) {
      // From user paid, so their debt decreases (balance increases)
      balanceMap.set(
        settlement.fromUser,
        (balanceMap.get(settlement.fromUser) || 0) + settlement.amount
      );

      // To user received, so their credit decreases (balance decreases)
      balanceMap.set(
        settlement.toUser,
        (balanceMap.get(settlement.toUser) || 0) - settlement.amount
      );
    }

    // Get user details and format balances
    const balances = await Promise.all(
      Array.from(balanceMap.entries()).map(async ([userId, balance]) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          balance: Math.round(balance), // Round to avoid floating point issues
        };
      })
    );

    // Calculate suggested settlements using greedy algorithm
    const suggestedSettlements = calculateSettlements(balances);

    return {
      balances: balances.sort((a, b) => b.balance - a.balance),
      settlements: suggestedSettlements,
    };
  },
});

// Helper function to calculate optimal settlements
function calculateSettlements(
  balances: Array<{
    userId: Id<"users">;
    userName: string;
    userEmail: string;
    balance: number;
  }>
): Array<{
  from: Id<"users">;
  fromName: string;
  to: Id<"users">;
  toName: string;
  amount: number;
}> {
  const settlements: Array<{
    from: Id<"users">;
    fromName: string;
    to: Id<"users">;
    toName: string;
    amount: number;
  }> = [];

  // Separate debtors (negative balance) and creditors (positive balance)
  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const creditors = balances
    .filter((b) => b.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.balance, creditor.balance);

    if (amount > 0) {
      settlements.push({
        from: debtor.userId,
        fromName: debtor.userName,
        to: creditor.userId,
        toName: creditor.userName,
        amount,
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance === 0) i++;
    if (creditor.balance === 0) j++;
  }

  return settlements;
}
