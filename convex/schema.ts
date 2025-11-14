import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  
  // Override the default users table from authTables to include name
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  // Groups table (e.g., "Roommates", "Trip to Paris")
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    imageUrl: v.optional(v.string()),
    currency: v.optional(v.string()), // e.g., "USD", "EUR", "INR"
    currencySymbol: v.optional(v.string()), // e.g., "$", "€", "₹"
  }).index("by_creator", ["createdBy"]),

  // Group members
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"]),

  // Expenses
  expenses: defineTable({
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(), // Total amount in cents
    currency: v.string(), // e.g., "USD", "EUR"
    paidBy: v.id("users"), // Who paid for this expense
    category: v.optional(v.string()), // e.g., "Food", "Transport", "Entertainment"
    date: v.number(), // Timestamp
    imageUrl: v.optional(v.string()), // Receipt image
    notes: v.optional(v.string()),
  })
    .index("by_group", ["groupId"])
    .index("by_payer", ["paidBy"])
    .index("by_group_and_date", ["groupId", "date"]),

  // Expense splits (who owes what for each expense)
  expenseSplits: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    amount: v.number(), // Amount this user owes in cents
    isPaid: v.boolean(), // Whether this split has been settled
  })
    .index("by_expense", ["expenseId"])
    .index("by_user", ["userId"])
    .index("by_expense_and_user", ["expenseId", "userId"]),

  // Expense payments (who paid what for each expense)
  expensePayments: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    amount: v.number(), // Amount this user paid in cents
  })
    .index("by_expense", ["expenseId"])
    .index("by_user", ["userId"])
    .index("by_expense_and_user", ["expenseId", "userId"]),

  // Settlements (when someone pays back their debt)
  settlements: defineTable({
    groupId: v.id("groups"),
    fromUser: v.id("users"), // Who is paying
    toUser: v.id("users"), // Who is receiving
    amount: v.number(), // Amount in cents
    currency: v.string(),
    date: v.number(), // Timestamp
    notes: v.optional(v.string()),
  })
    .index("by_group", ["groupId"])
    .index("by_from_user", ["fromUser"])
    .index("by_to_user", ["toUser"])
    .index("by_group_and_date", ["groupId", "date"]),

  // API Keys for MCP server access
  apiKeys: defineTable({
    userId: v.id("users"),
    key: v.string(), // Hashed API key
    name: v.string(), // User-friendly name for the key
    lastUsed: v.optional(v.number()), // Timestamp of last use
    expiresAt: v.optional(v.number()), // Optional expiration timestamp
    isActive: v.boolean(), // Whether the key is active
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"]),

  // MCP Sessions for tracking active connections
  mcpSessions: defineTable({
    sessionId: v.string(),
    userId: v.id("users"),
    keyId: v.id("apiKeys"),
    lastActivity: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),
});
