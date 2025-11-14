import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'owwn_';
  let key = prefix;
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Simple hash function for storing API keys
async function hashApiKey(key: string): Promise<string> {
  // In production, use a proper hashing library
  // For now, we'll store a simple hash
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create a new API key
export const createApiKey = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.object({
    id: v.id("apiKeys"),
    key: v.string(), // Return the plain key only once
    name: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generate a new API key
    const plainKey = generateApiKey();
    const hashedKey = await hashApiKey(plainKey);

    // Calculate expiration if provided
    const expiresAt = args.expiresInDays 
      ? Date.now() + (args.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Store the hashed key
    const keyId = await ctx.db.insert("apiKeys", {
      userId: args.userId,
      key: hashedKey,
      name: args.name,
      isActive: true,
      expiresAt,
    });

    // Return the plain key (this is the only time it will be shown)
    return {
      id: keyId,
      key: plainKey,
      name: args.name,
    };
  },
});

// Get all API keys for a user
export const getUserApiKeys = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("apiKeys"),
      _creationTime: v.number(),
      name: v.string(),
      lastUsed: v.optional(v.number()),
      expiresAt: v.optional(v.number()),
      isActive: v.boolean(),
      keyPreview: v.string(), // Show only last 4 characters
    })
  ),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return keys.map((key) => ({
      _id: key._id,
      _creationTime: key._creationTime,
      name: key.name,
      lastUsed: key.lastUsed,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
      keyPreview: `****${key.key.slice(-4)}`,
    }));
  },
});

// Revoke an API key
export const revokeApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    
    if (!key || key.userId !== args.userId) {
      throw new Error("API key not found or unauthorized");
    }

    await ctx.db.patch(args.keyId, { isActive: false });
    return null;
  },
});

// Delete an API key
export const deleteApiKey = mutation({
  args: {
    keyId: v.id("apiKeys"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    
    if (!key || key.userId !== args.userId) {
      throw new Error("API key not found or unauthorized");
    }

    await ctx.db.delete(args.keyId);
    return null;
  },
});

// Verify an API key (used by MCP server)
export const verifyApiKey = mutation({
  args: { key: v.string() },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      keyId: v.id("apiKeys"),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const hashedKey = await hashApiKey(args.key);
    
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", hashedKey))
      .first();

    if (!apiKey) {
      return null;
    }

    // Check if key is active
    if (!apiKey.isActive) {
      return null;
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return null;
    }

    // Update last used timestamp
    await ctx.db.patch(apiKey._id, { lastUsed: Date.now() });

    return {
      userId: apiKey.userId,
      keyId: apiKey._id,
    };
  },
});

// Create MCP session
export const createSession = mutation({
  args: {
    sessionId: v.string(),
    userId: v.id("users"),
    keyId: v.id("apiKeys"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("mcpSessions", {
      sessionId: args.sessionId,
      userId: args.userId,
      keyId: args.keyId,
      lastActivity: Date.now(),
    });
    return null;
  },
});

// Get MCP session
export const getSession = query({
  args: { sessionId: v.string() },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      keyId: v.id("apiKeys"),
      lastActivity: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("mcpSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired (1 hour timeout)
    if (Date.now() - session.lastActivity > 3600000) {
      return null;
    }

    return {
      userId: session.userId,
      keyId: session.keyId,
      lastActivity: session.lastActivity,
    };
  },
});

// Update session activity
export const updateSessionActivity = mutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("mcpSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { lastActivity: Date.now() });
    }
    return null;
  },
});

// Delete session
export const deleteSession = mutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("mcpSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});
