import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    return user ?? null;
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  returns: v.union(
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.image !== undefined) updateData.image = updates.image;

    await ctx.db.patch(userId, updateData);
    return null;
  },
});

// Search users by email (for adding to groups)
export const searchUsersByEmail = query({
  args: { emailQuery: v.string() },
  returns: v.array(
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
    })
  ),
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    
    // Simple email search (case-insensitive)
    return allUsers.filter((user) =>
      user.email?.toLowerCase().includes(args.emailQuery.toLowerCase())
    );
  },
});
