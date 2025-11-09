import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Record a settlement (payment)
export const createSettlement = mutation({
  args: {
    groupId: v.id("groups"),
    fromUser: v.id("users"),
    toUser: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("settlements"),
  handler: async (ctx, args) => {
    // Verify both users are members of the group
    const fromMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.fromUser)
      )
      .first();

    const toMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.toUser)
      )
      .first();

    if (!fromMembership || !toMembership) {
      throw new Error("Both users must be members of the group");
    }

    if (args.amount <= 0) {
      throw new Error("Settlement amount must be positive");
    }

    // Create the settlement
    const settlementId = await ctx.db.insert("settlements", args);

    return settlementId;
  },
});

// Get all settlements for a group
export const getGroupSettlements = query({
  args: { groupId: v.id("groups") },
  returns: v.array(
    v.object({
      _id: v.id("settlements"),
      _creationTime: v.number(),
      groupId: v.id("groups"),
      fromUser: v.id("users"),
      fromUserName: v.string(),
      toUser: v.id("users"),
      toUserName: v.string(),
      amount: v.number(),
      currency: v.string(),
      date: v.number(),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    const settlementsWithNames = await Promise.all(
      settlements.map(async (settlement) => {
        const fromUser = await ctx.db.get(settlement.fromUser);
        const toUser = await ctx.db.get(settlement.toUser);

        return {
          ...settlement,
          fromUserName: fromUser?.name ?? "Unknown",
          toUserName: toUser?.name ?? "Unknown",
        };
      })
    );

    return settlementsWithNames;
  },
});

// Get settlements for a specific user
export const getUserSettlements = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("settlements"),
      _creationTime: v.number(),
      groupId: v.id("groups"),
      groupName: v.string(),
      fromUser: v.id("users"),
      fromUserName: v.string(),
      toUser: v.id("users"),
      toUserName: v.string(),
      amount: v.number(),
      currency: v.string(),
      date: v.number(),
      notes: v.optional(v.string()),
      type: v.union(v.literal("paid"), v.literal("received")),
    })
  ),
  handler: async (ctx, args) => {
    // Get settlements where user paid
    const paidSettlements = await ctx.db
      .query("settlements")
      .withIndex("by_from_user", (q) => q.eq("fromUser", args.userId))
      .collect();

    // Get settlements where user received
    const receivedSettlements = await ctx.db
      .query("settlements")
      .withIndex("by_to_user", (q) => q.eq("toUser", args.userId))
      .collect();

    const allSettlements = [
      ...paidSettlements.map((s) => ({ ...s, type: "paid" as const })),
      ...receivedSettlements.map((s) => ({ ...s, type: "received" as const })),
    ];

    const settlementsWithDetails = await Promise.all(
      allSettlements.map(async (settlement) => {
        const fromUser = await ctx.db.get(settlement.fromUser);
        const toUser = await ctx.db.get(settlement.toUser);
        const group = await ctx.db.get(settlement.groupId);

        return {
          ...settlement,
          fromUserName: fromUser?.name ?? "Unknown",
          toUserName: toUser?.name ?? "Unknown",
          groupName: group?.name ?? "Unknown",
        };
      })
    );

    // Sort by date descending
    return settlementsWithDetails.sort((a, b) => b.date - a.date);
  },
});

// Delete a settlement
export const deleteSettlement = mutation({
  args: {
    settlementId: v.id("settlements"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settlement = await ctx.db.get(args.settlementId);
    if (!settlement) {
      throw new Error("Settlement not found");
    }

    // Check if user is admin or one of the parties involved
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", settlement.groupId).eq("userId", args.userId)
      )
      .first();

    const isInvolved =
      settlement.fromUser === args.userId || settlement.toUser === args.userId;

    if (!membership || (membership.role !== "admin" && !isInvolved)) {
      throw new Error(
        "Only admins or involved parties can delete settlements"
      );
    }

    await ctx.db.delete(args.settlementId);
    return null;
  },
});
