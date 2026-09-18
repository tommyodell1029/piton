// Supabase Edge Function: ai-coach
//
// Powers the in-app AI Coach: motivation, insights, reminders, and habit
// recommendations. Pulls the caller's recent habits/streaks for context
// (via the request's Authorization header, so RLS applies), then asks
// Claude (preferred) or OpenAI for a reply. Keeps API keys server-side.
//
// Deploy: supabase functions deploy ai-coach --no-verify-jwt
// (auth is checked inside the function instead of at the gateway, so the
// browser's CORS preflight OPTIONS request — which never carries an
// Authorization header — isn't rejected before this code even runs.)
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-... OPENAI_API_KEY=sk-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const mode: string = body.mode ?? "chat";

    const [{ data: habits }, { data: streaks }] = await Promise.all([
      supabase.from("habits").select("title, category, cadence").is("archived_at", null),
      supabase.from("streaks").select("current_count, best_count"),
    ]);

    const context = `User has ${habits?.length ?? 0} active habits: ${
      habits?.map((h) => `${h.title} (${h.category}, ${h.cadence})`).join(", ") || "none yet"
    }. Streak summary: ${
      streaks?.map((s) => `current ${s.current_count}, best ${s.best_count}`).join("; ") ||
      "no streaks yet"
    }.`;

    let systemPrompt =
      "You are the Piton AI Coach inside a proof-based habit tracking app. Be concise, encouraging, and specific. Reference the user's real habit/streak data when relevant. Never claim to see the user's photos directly unless given a description.";

    let userPrompt: string;
    if (mode === "daily_motivation") {
      userPrompt = `${context}\nWrite one short, punchy motivational message (max 2 sentences) for today.`;
    } else if (mode === "habit_recommendations") {
      systemPrompt +=
        ' Respond ONLY with JSON: {"recommendations": string[]} — 3 short habit suggestions.';
      userPrompt = `${context}\nSuggest 3 new habits this user doesn't already have, each provable via photo, GPS, timer, or health data.`;
    } else {
      const history = (body.history ?? []) as { role: string; content: string }[];
      userPrompt = `${context}\n\nConversation so far:\n${history
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}\n\nuser: ${body.message}`;
    }

    const reply = await callLlm(systemPrompt, userPrompt);

    if (mode === "habit_recommendations") {
      const parsed = safeParseJson(reply);
      return json({ recommendations: parsed.recommendations ?? [] });
    }

    return json({ reply });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

async function callLlm(system: string, prompt: string): Promise<string> {
  if (ANTHROPIC_API_KEY) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? "Sorry, I couldn't come up with a reply.";
  }

  if (OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "Sorry, I couldn't come up with a reply.";
  }

  return "The AI coach needs an ANTHROPIC_API_KEY or OPENAI_API_KEY secret set on this Edge Function.";
}

function safeParseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
