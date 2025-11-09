import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new group
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    imageUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
    currencySymbol: v.optional(v.string()),
    memberIds: v.optional(v.array(v.id("users"))),
  },
  returns: v.id("groups"),
  handler: async (ctx, args) => {
    const { memberIds, ...groupData } = args;

    // Create the group with default currency if not provided
    const groupId = await ctx.db.insert("groups", {
      ...groupData,
      currency: groupData.currency || "USD",
      currencySymbol: groupData.currencySymbol || "$",
    });

    // Add creator as admin
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: args.createdBy,
      role: "admin",
    });

    // Add other members
    if (memberIds) {
      for (const userId of memberIds) {
        if (userId !== args.createdBy) {
          await ctx.db.insert("groupMembers", {
            groupId,
            userId,
            role: "member",
          });
        }
      }
    }

    return groupId;
  },
});

// Get all groups for a user
export const getUserGroups = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      imageUrl: v.optional(v.string()),
      currency: v.optional(v.string()),
      currencySymbol: v.optional(v.string()),
      role: v.union(v.literal("admin"), v.literal("member")),
      memberCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all group memberships for this user
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get group details for each membership
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        // Count members
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", membership.groupId))
          .collect();

        return {
          ...group,
          role: membership.role,
          memberCount: members.length,
        };
      })
    );

    return groups.filter((g) => g !== null) as any;
  },
});

// Get group details with members
export const getGroupDetails = query({
  args: { groupId: v.id("groups") },
  returns: v.union(
    v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      imageUrl: v.optional(v.string()),
      currency: v.optional(v.string()),
      currencySymbol: v.optional(v.string()),
      members: v.array(
        v.object({
          _id: v.id("users"),
          _creationTime: v.number(),
          name: v.optional(v.string()),
          email: v.optional(v.string()),
          emailVerificationTime: v.optional(v.number()),
          phone: v.optional(v.string()),
          phoneVerificationTime: v.optional(v.number()),
          image: v.optional(v.string()),
          isAnonymous: v.optional(v.boolean()),
          role: v.union(v.literal("admin"), v.literal("member")),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    // Get all members
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;
        return {
          ...user,
          role: membership.role,
        };
      })
    );

    return {
      ...group,
      members: members.filter((m) => m !== null) as any,
    };
  },
});

// Add member to group
export const addGroupMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
    addedBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if the person adding is an admin
    const adderMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.addedBy)
      )
      .first();

    if (!adderMembership || adderMembership.role !== "admin") {
      throw new Error("Only admins can add members");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .first();

    if (existingMembership) {
      throw new Error("User is already a member");
    }

    // Add the member
    await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: args.userId,
      role: "member",
    });

    return null;
  },
});

// Remove member from group
export const removeGroupMember = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
    removedBy: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if the person removing is an admin or removing themselves
    const removerMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.removedBy)
      )
      .first();

    if (!removerMembership) {
      throw new Error("You are not a member of this group");
    }

    const isSelfRemoval = args.userId === args.removedBy;
    if (!isSelfRemoval && removerMembership.role !== "admin") {
      throw new Error("Only admins can remove other members");
    }

    // Find and remove the membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return null;
  },
});

// Update group details
export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { groupId, userId, ...updates } = args;

    // Check if user is an admin
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", groupId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only admins can update group details");
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;

    await ctx.db.patch(groupId, updateData);
    return null;
  },
});
