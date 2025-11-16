import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import OpenAI from "openai";

type AiResult = {
  success: boolean;
  message: string;
  expenseId?: Id<"expenses">;
};

export const createExpenseFromInstruction = action({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
    instruction: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    expenseId: v.optional(v.id("expenses")),
  }),
  handler: async (ctx, args): Promise<AiResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in Convex environment");
    }

    const openai = new OpenAI({ apiKey });

    const group: any = await ctx.runQuery(api.groups.getGroupDetails, {
      groupId: args.groupId,
    });

    if (!group) {
      return {
        success: false,
        message: "Group not found",
        expenseId: undefined,
      } as const;
    }

    type MemberSummary = {
      id: Id<"users">;
      name: string;
      email: string;
    };

    const members: MemberSummary[] = group.members.map(
      (m: { _id: Id<"users">; name?: string; email?: string }): MemberSummary => ({
        id: m._id,
        name: (m.name || "").toString(),
        email: (m.email || "").toString(),
      }),
    );

    const currentUser = members.find(
      (m: MemberSummary) => m.id === args.userId,
    );

    const systemPrompt =
      "You are an assistant that turns natural language into a single shared expense for a group expense-splitting app. " +
      "Always respond with ONLY a single JSON object, no prose, no code fences. " +
      "If the instruction is missing a required detail (like amount), respond with {\"ok\":false,\"error\":\"...\"}.";

    const userPrompt = `Group currency: ${group.currency || "USD"}
Members (id | name | email):
${members
      .map(
        (m: MemberSummary) =>
          `${m.id} | ${m.name || ""} | ${m.email || ""}`,
      )
      .join("\n")}

Current user id: ${args.userId}
Current user name: ${currentUser?.name || ""}

Instruction: "${args.instruction}"

Return JSON like:
{
  "ok": true,
  "description": "Pizza",
  "amount_cents": 2500,
  "paid_by": "me" | a member name or email,
  "split_between": ["me", "madhav", "chirag"],
  "category": "food" | null
}

or, on error:
{
  "ok": false,
  "error": "Reason the instruction cannot be executed"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        message: "AI did not return any content",
        expenseId: undefined,
      } as const;
    }

    let jsonText = content.trim();
    const match = jsonText.match(/```json[\s\S]*?```/i) || jsonText.match(/```[\s\S]*?```/i);
    if (match) {
      jsonText = match[0].replace(/```json|```/g, "").trim();
    }

    type Parsed = {
      ok: boolean;
      description?: string;
      amount_cents?: number;
      paid_by?: string;
      split_between?: string[];
      category?: string | null;
      error?: string;
    };

    let parsed: Parsed;
    try {
      parsed = JSON.parse(jsonText) as Parsed;
    } catch (e) {
      return {
        success: false,
        message: "Failed to parse AI response as JSON",
        expenseId: undefined,
      } as const;
    }

    if (!parsed.ok) {
      return {
        success: false,
        message: parsed.error || "Could not understand instruction",
        expenseId: undefined,
      } as const;
    }

    if (!parsed.description || !parsed.amount_cents || parsed.amount_cents <= 0) {
      return {
        success: false,
        message: "AI response missing description or positive amount_cents",
        expenseId: undefined,
      } as const;
    }

    const normalize = (s: string) => s.trim().toLowerCase();

    const resolveNameToId = (name: string): Id<"users"> | null => {
      const n = normalize(name);
      if (["me", "i", "myself"].includes(n)) {
        return args.userId;
      }
      const byName = members.find(
        (m: MemberSummary) => m.name && normalize(m.name) === n,
      );
      if (byName) return byName.id;
      const byEmail = members.find(
        (m: MemberSummary) => m.email && normalize(m.email) === n,
      );
      if (byEmail) return byEmail.id;
      return null;
    };

    const paidById: Id<"users"> = parsed.paid_by
      ? (() => {
          const id = resolveNameToId(parsed.paid_by!);
          if (!id) {
            throw new Error(`Could not find payer: ${parsed.paid_by}`);
          }
          return id;
        })()
      : args.userId;

    const splitNames = parsed.split_between && parsed.split_between.length > 0
      ? parsed.split_between
      : ["me"];

    const splitUserIds: Id<"users">[] = [];
    for (const name of splitNames) {
      const id = resolveNameToId(name);
      if (!id) {
        return {
          success: false,
          message: `Could not find member for name: ${name}`,
          expenseId: undefined,
        } as const;
      }
      if (!splitUserIds.includes(id)) {
        splitUserIds.push(id);
      }
    }

    const totalCents = parsed.amount_cents;
    const n = splitUserIds.length;
    const base = Math.floor(totalCents / n);
    let remainder = totalCents - base * n;

    const splits = splitUserIds.map((userId) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { userId, amount: base + extra };
    });

    const currency = group.currency || "USD";

    const expenseId = await ctx.runMutation(api.expenses.createExpense, {
      groupId: args.groupId,
      description: parsed.description,
      amount: totalCents,
      currency,
      paidBy: paidById,
      category: parsed.category || undefined,
      date: Date.now(),
      imageUrl: undefined,
      notes: undefined,
      splitType: "equal",
      splits,
      paidByMultiple: undefined,
    });

    return {
      success: true,
      message: "Expense created from AI instruction",
      expenseId,
    } as const;
  },
});
