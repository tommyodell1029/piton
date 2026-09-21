import { NextResponse } from "next/server";

import { callClaude, type AnthropicMessage } from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { executeTool, TOOL_DEFINITIONS } from "@/lib/tools";

const OWNER_EMAIL = process.env.ODIE_OWNER_EMAIL ?? "tommy.odell1029@gmail.com";

const SYSTEM_PROMPT = `You are Odie, the operations command center for Piton, a proof-based habit-verification app ("Don't tell Piton you did it. Prove it.").

You have a small set of REAL tools against the live Supabase project. Use them whenever a question needs current data — never guess or invent numbers, statuses, or review content. If a tool reports something isn't configured, say that plainly instead of pretending it worked.

Ground rules:
- Piton has not launched publicly yet. Its metrics are internal/test data, not real growth numbers — never present them as if they reflect a live userbase unless the data itself shows otherwise.
- Actions like production releases, destructive data changes, pricing changes, or publishing content require owner approval — use create_approval for these instead of claiming to have done them.
- Be concise. Distinguish facts (from tool results) from your own interpretation or recommendations.
- Many capabilities described in Odie's long-term design (TikTok/Instagram publishing, voice, App Store review automation, content generation) are not built yet in this phase — say so directly if asked about them rather than improvising an answer.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const message = String(body.message ?? "");
  const history = Array.isArray(body.history)
    ? (body.history as AnthropicMessage[])
    : [];

  if (!message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const messages: AnthropicMessage[] = [
    ...history,
    { role: "user", content: message },
  ];

  const toolCallsMade: { name: string; input: unknown }[] = [];

  // Bounded agentic loop: Claude can chain a few tool calls per turn, but
  // this is a request/response HTTP route, not a background worker — cap
  // iterations so a confused loop can't run indefinitely on someone's bill.
  for (let i = 0; i < 6; i++) {
    const response = await callClaude(
      SYSTEM_PROMPT,
      messages,
      TOOL_DEFINITIONS,
    );

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return NextResponse.json({ reply: text, toolCalls: toolCallsMade });
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: AnthropicMessage["content"] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolCallsMade.push({ name: block.name, input: block.input });
      const result = await executeTool(block.name, block.input, admin, user.id);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    reply:
      "I made several tool calls but didn't reach a final answer in time — try a narrower question.",
    toolCalls: toolCallsMade,
  });
}
