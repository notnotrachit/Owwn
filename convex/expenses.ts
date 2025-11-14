import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
    paidByMultiple: v.optional(v.array(
      v.object({
        userId: v.id("users"),
        amount: v.number(), // Amount this user paid in cents
      })
    )),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    const { splitType, splits, paidByMultiple, ...expenseData } = args;

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

    // Validate multiple payers if provided
    if (paidByMultiple && paidByMultiple.length > 0) {
      const totalPaid = paidByMultiple.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid !== args.amount) {
        throw new Error("Total paid amounts must equal expense amount");
      }
      
      // Verify all payers are members of the group
      for (const payer of paidByMultiple) {
        const membership = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", args.groupId).eq("userId", payer.userId)
          )
          .first();

        if (!membership) {
          throw new Error("All payers must be members of the group");
        }
      }
    }

    // Create the expense
    const expenseId = await ctx.db.insert("expenses", expenseData);

    // Create payment records
    if (paidByMultiple && paidByMultiple.length > 0) {
      // Multiple payers
      for (const payer of paidByMultiple) {
        await ctx.db.insert("expensePayments", {
          expenseId,
          userId: payer.userId,
          amount: payer.amount,
        });
      }
    } else {
      // Single payer
      await ctx.db.insert("expensePayments", {
        expenseId,
        userId: args.paidBy,
        amount: args.amount,
      });
    }

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
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
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
          ...expense,
          paidByName: payer?.name ?? "Unknown",
          payments: paymentsWithNames,
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
    
    const payments = await ctx.db
      .query("expensePayments")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
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
      payments: paymentsWithNames,
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

      // Get payment records (supports multiple payers)
      const payments = await ctx.db
        .query("expensePayments")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();

      // Each payer gets credited for what they paid
      for (const payment of payments) {
        balanceMap.set(
          payment.userId,
          (balanceMap.get(payment.userId) || 0) + payment.amount
        );
      }

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
      // From user paid, so their balance increases (debt reduced)
      balanceMap.set(
        settlement.fromUser,
        (balanceMap.get(settlement.fromUser) || 0) + settlement.amount
      );

      // To user received, so their balance decreases (credit reduced)
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
    .map((b) => ({ ...b })) // Create copies to avoid mutating original balances
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

// Calculate pairwise balances between a specific user and all other group members
export const getPairwiseBalances = query({
  args: { 
    groupId: v.id("groups"),
    userId: v.id("users")
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      userName: v.string(),
      userEmail: v.string(),
      balance: v.number(), // Positive = they owe you, Negative = you owe them
    })
  ),
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

    // Calculate pairwise balance between current user and each other user
    const pairwiseBalances = new Map<Id<"users">, number>();

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

      // Find what current user paid and owes
      const userPayment = payments.find(p => p.userId === args.userId)?.amount || 0;
      const userSplit = splits.find(s => s.userId === args.userId)?.amount || 0;

      // For each other user, calculate pairwise balance
      for (const split of splits) {
        if (split.userId === args.userId) continue;

        const otherUserPayment = payments.find(p => p.userId === split.userId)?.amount || 0;
        
        // If current user paid and other user has a split, other user owes current user
        if (userPayment > 0) {
          const shareOfPayment = (userPayment * split.amount) / expense.amount;
          pairwiseBalances.set(
            split.userId,
            (pairwiseBalances.get(split.userId) || 0) + shareOfPayment
          );
        }

        // If other user paid and current user has a split, current user owes other user
        if (otherUserPayment > 0 && userSplit > 0) {
          const shareOfPayment = (otherUserPayment * userSplit) / expense.amount;
          pairwiseBalances.set(
            split.userId,
            (pairwiseBalances.get(split.userId) || 0) - shareOfPayment
          );
        }
      }
    }

    // Process settlements between current user and others
    for (const settlement of settlements) {
      if (settlement.fromUser === args.userId) {
        // Current user paid someone - reduces what current user owes them
        pairwiseBalances.set(
          settlement.toUser,
          (pairwiseBalances.get(settlement.toUser) || 0) + settlement.amount
        );
      } else if (settlement.toUser === args.userId) {
        // Someone paid current user - reduces what they owe current user
        pairwiseBalances.set(
          settlement.fromUser,
          (pairwiseBalances.get(settlement.fromUser) || 0) - settlement.amount
        );
      }
    }

    // Get user details and format balances
    const balances = await Promise.all(
      Array.from(pairwiseBalances.entries()).map(async ([userId, balance]) => {
        const user = await ctx.db.get(userId);
        return {
          userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          balance: Math.round(balance),
        };
      })
    );

    return balances.filter(b => b.balance !== 0);
  },
});

// Create a settlement/payment between group members
export const createSettlement = mutation({
  args: {
    groupId: v.id("groups"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("settlements"),
  handler: async (ctx, args) => {
    // Verify group exists
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Create the settlement
    const settlementId = await ctx.db.insert("settlements", {
      groupId: args.groupId,
      fromUser: args.fromUserId,
      toUser: args.toUserId,
      amount: args.amount,
      currency: group.currency || "USD",
      date: Date.now(),
      notes: args.notes,
    });

    return settlementId;
  },
});
