import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// Generate session ID
function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// MCP SSE endpoint (GET) - For receiving messages from server
http.route({
  path: "/mcp",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    // Verify API key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const verification = await ctx.runMutation(api.apiKeys.verifyApiKey, { key: apiKey });
    if (!verification) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check for session ID
    let sessionId = req.headers.get("Mcp-Session-Id");
    
    if (!sessionId) {
      // New session - generate ID and store in database
      sessionId = generateSessionId();
      await ctx.runMutation(api.apiKeys.createSession, {
        sessionId,
        userId: verification.userId,
        keyId: verification.keyId,
      });
    } else {
      // Validate existing session from database
      const session = await ctx.runQuery(api.apiKeys.getSession, { sessionId });
      if (!session) {
        return new Response("Session not found", { status: 404 });
      }
      // Update last activity
      await ctx.runMutation(api.apiKeys.updateSessionActivity, { sessionId });
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send endpoint event
        const endpointUrl = new URL(req.url);
        endpointUrl.pathname = "/mcp";
        const endpointEvent = `event: endpoint\ndata: ${endpointUrl.toString()}\n\n`;
        controller.enqueue(encoder.encode(endpointEvent));

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": ping\n\n"));
          } catch (e) {
            clearInterval(pingInterval);
          }
        }, 30000);

        // Clean up on close
        setTimeout(() => {
          clearInterval(pingInterval);
          controller.close();
        }, 300000); // Close after 5 minutes
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Mcp-Session-Id": sessionId,
      },
    });
  }),
});

// MCP DELETE endpoint - For terminating sessions
http.route({
  path: "/mcp",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    const sessionId = req.headers.get("Mcp-Session-Id");
    if (!sessionId) {
      return new Response("No session ID provided", { status: 400 });
    }

    // Delete the session from database
    const session = await ctx.runQuery(api.apiKeys.getSession, { sessionId });
    if (session) {
      await ctx.runMutation(api.apiKeys.deleteSession, { sessionId });
    }

    return new Response(null, { status: 204 });
  }),
});

// MCP POST endpoint - For sending messages to server
http.route({
  path: "/mcp",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // Verify API key
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Unauthorized" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = authHeader.substring(7);
      const verification = await ctx.runMutation(api.apiKeys.verifyApiKey, { key: apiKey });
      if (!verification) {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Unauthorized" } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const userId = verification.userId;

      // Check session ID
      const sessionId = req.headers.get("Mcp-Session-Id");
      if (sessionId) {
        const session = await ctx.runQuery(api.apiKeys.getSession, { sessionId });
        if (!session) {
          return new Response("Session not found", { status: 404 });
        }
        // Update session activity
        await ctx.runMutation(api.apiKeys.updateSessionActivity, { sessionId });
      }

      // Parse JSON-RPC request
      const message = await req.json();
      const { jsonrpc, method, params, id } = message;

      if (jsonrpc !== "2.0") {
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Handle initialization
      if (method === "initialize") {
        // Generate and store session ID if not present
        let newSessionId = sessionId;
        if (!newSessionId) {
          newSessionId = generateSessionId();
          await ctx.runMutation(api.apiKeys.createSession, {
            sessionId: newSessionId,
            userId: verification.userId,
            keyId: verification.keyId,
          });
        }

        const result = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            serverInfo: {
              name: "Owwn MCP Server",
              version: "1.0.0",
            },
          },
        };
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Mcp-Session-Id": newSessionId,
          },
        });
      }

      // Handle tools/list
      if (method === "tools/list") {
        const result = {
          jsonrpc: "2.0",
          id,
          result: {
            tools: [
              {
                name: "list_groups",
                description: "List all groups the user is a member of",
                inputSchema: {
                  type: "object",
                  properties: {},
                },
              },
              {
                name: "get_group_details",
                description: "Get detailed information about a specific group",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string", description: "The ID of the group" },
                  },
                  required: ["groupId"],
                },
              },
              {
                name: "list_expenses",
                description: "List all expenses for a specific group",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string", description: "The ID of the group" },
                  },
                  required: ["groupId"],
                },
              },
              {
                name: "create_expense",
                description: "Create a new expense/transaction in a group. The expense will be split equally among all group members by default.",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string", description: "The ID of the group" },
                    description: { type: "string", description: "Description of the expense (e.g., 'Dinner at restaurant')" },
                    amount: { type: "number", description: "Amount in currency (e.g., 25.50)" },
                    category: {
                      type: "string",
                      enum: ["food", "transport", "entertainment", "utilities", "shopping", "other"],
                      description: "Category of the expense",
                    },
                    paidBy: { 
                      type: "string", 
                      description: "User ID of who paid (optional, defaults to authenticated user)" 
                    },
                  },
                  required: ["groupId", "description", "amount"],
                },
              },
              {
                name: "add_group_member",
                description: "Add a new member to a group by email",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string", description: "The ID of the group" },
                    email: { type: "string", description: "Email address of the user to add" },
                  },
                  required: ["groupId", "email"],
                },
              },
              {
                name: "create_group",
                description: "Create a new expense group",
                inputSchema: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Name of the group" },
                    description: { type: "string", description: "Description of the group (optional)" },
                    currency: { 
                      type: "string", 
                      description: "Currency code (e.g., USD, EUR, INR). Defaults to USD" 
                    },
                  },
                  required: ["name"],
                },
              },
              {
                name: "get_expense_details",
                description: "Get detailed information about a specific expense",
                inputSchema: {
                  type: "object",
                  properties: {
                    expenseId: { type: "string", description: "The ID of the expense" },
                  },
                  required: ["expenseId"],
                },
              },
              {
                name: "settle_balance",
                description: "Record a settlement/payment between group members",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string", description: "The ID of the group" },
                    fromUserId: { type: "string", description: "User ID of who is paying" },
                    toUserId: { type: "string", description: "User ID of who is receiving" },
                    amount: { type: "number", description: "Amount being settled" },
                    notes: { type: "string", description: "Optional notes about the settlement" },
                  },
                  required: ["groupId", "fromUserId", "toUserId", "amount"],
                },
              },
              {
                name: "get_balances",
                description: "Get current balances for a group",
                inputSchema: {
                  type: "object",
                  properties: {
                    groupId: { type: "string" },
                  },
                  required: ["groupId"],
                },
              },
            ],
          },
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle tools/call
      if (method === "tools/call") {
        const { name, arguments: args } = params;
        let content;

        switch (name) {
          case "list_groups": {
            const groups = await ctx.runQuery(api.groups.getUserGroups, { userId });
            content = [{ type: "text", text: JSON.stringify(groups, null, 2) }];
            break;
          }

          case "get_group_details": {
            const group = await ctx.runQuery(api.groups.getGroupDetails, {
              groupId: args.groupId,
            });
            content = [{ type: "text", text: JSON.stringify(group, null, 2) }];
            break;
          }

          case "list_expenses": {
            const expenses = await ctx.runQuery(api.expenses.getGroupExpenses, {
              groupId: args.groupId,
            });
            content = [{ type: "text", text: JSON.stringify(expenses, null, 2) }];
            break;
          }

          case "create_expense": {
            const group = await ctx.runQuery(api.groups.getGroupDetails, {
              groupId: args.groupId,
            });
            if (!group) throw new Error("Group not found");

            const amountInCents = Math.round(args.amount * 100);
            const splits = group.members.map((member: any) => ({
              userId: member._id,
              amount: 0,
            }));

            const paidByUser = args.paidBy || userId;

            const expenseId = await ctx.runMutation(api.expenses.createExpense, {
              groupId: args.groupId,
              description: args.description,
              amount: amountInCents,
              currency: group.currency || "USD",
              paidBy: paidByUser,
              category: args.category || "other",
              date: Date.now(),
              splitType: "equal" as const,
              splits,
            });

            content = [{ 
              type: "text", 
              text: `✅ Expense created successfully!\n\nID: ${expenseId}\nDescription: ${args.description}\nAmount: ${args.amount} ${group.currency || "USD"}\nCategory: ${args.category || "other"}\nSplit equally among ${group.members.length} members` 
            }];
            break;
          }

          case "add_group_member": {
            // Find user by email
            const userToAdd = await ctx.runQuery(api.users.getUserByEmail, {
              email: args.email,
            });
            
            if (!userToAdd) {
              content = [{ type: "text", text: `❌ User with email ${args.email} not found. They need to sign up first.` }];
              break;
            }

            await ctx.runMutation(api.groups.addGroupMember, {
              groupId: args.groupId,
              userId: userToAdd._id,
              addedBy: userId,
            });

            content = [{ 
              type: "text", 
              text: `✅ Successfully added ${userToAdd.name || args.email} to the group!` 
            }];
            break;
          }

          case "create_group": {
            const groupId = await ctx.runMutation(api.groups.createGroup, {
              name: args.name,
              description: args.description,
              currency: args.currency || "USD",
              createdBy: userId,
            });

            content = [{ 
              type: "text", 
              text: `✅ Group created successfully!\n\nID: ${groupId}\nName: ${args.name}\nCurrency: ${args.currency || "USD"}${args.description ? `\nDescription: ${args.description}` : ''}` 
            }];
            break;
          }

          case "get_expense_details": {
            const expense = await ctx.runQuery(api.expenses.getExpenseDetails, {
              expenseId: args.expenseId,
            });
            
            if (!expense) {
              content = [{ type: "text", text: "❌ Expense not found" }];
              break;
            }

            content = [{ type: "text", text: JSON.stringify(expense, null, 2) }];
            break;
          }

          case "settle_balance": {
            const amountInCents = Math.round(args.amount * 100);
            
            const settlementId = await ctx.runMutation(api.expenses.createSettlement, {
              groupId: args.groupId,
              fromUserId: args.fromUserId,
              toUserId: args.toUserId,
              amount: amountInCents,
              notes: args.notes,
            });

            content = [{ 
              type: "text", 
              text: `✅ Settlement recorded successfully!\n\nID: ${settlementId}\nAmount: ${args.amount}\n${args.notes ? `Notes: ${args.notes}` : ''}` 
            }];
            break;
          }

          case "get_balances": {
            const balances = await ctx.runQuery(api.expenses.getGroupBalances, {
              groupId: args.groupId,
            });
            content = [{ type: "text", text: JSON.stringify(balances, null, 2) }];
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        const result = {
          jsonrpc: "2.0",
          id,
          result: { content },
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle resources/list
      if (method === "resources/list") {
        const groups = await ctx.runQuery(api.groups.getUserGroups, { userId });
        const result = {
          jsonrpc: "2.0",
          id,
          result: {
            resources: groups.map((group: any) => ({
              uri: `owwn://group/${group._id}`,
              name: group.name,
              description: `Group: ${group.name}`,
              mimeType: "application/json",
            })),
          },
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle resources/read
      if (method === "resources/read") {
        const match = params.uri.match(/^owwn:\/\/group\/(.+)$/);
        if (!match) throw new Error("Invalid URI");
        
        const data = await ctx.runQuery(api.export.exportGroupData, {
          groupId: match[1],
          userId,
        });
        
        const result = {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [{
              uri: params.uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            }],
          },
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Unknown method
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32601, message: `Method not found: ${method}` },
          id,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );

    } catch (error: any) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: error.message || "Internal error" },
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
