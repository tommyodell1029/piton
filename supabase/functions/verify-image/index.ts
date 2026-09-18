// Supabase Edge Function: verify-image
//
// Given a habit's context and an uploaded proof photo, asks a vision-capable
// LLM whether the photo plausibly proves the habit was done (e.g. "at the
// gym", "book open to a new page", "meditation cushion in use"). Runs
// server-side so OPENAI_API_KEY / ANTHROPIC_API_KEY never ship in the app.
//
// Deploy: supabase functions deploy verify-image --no-verify-jwt
// (auth is checked inside the function instead of at the gateway, so the
// browser's CORS preflight OPTIONS request — which never carries an
// Authorization header — isn't rejected before this code even runs.)
// Secrets: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    // Verify the caller is signed in using their own JWT (anon-key client),
    // separately from the service-role client used below for the DB read.
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { habitId, imageUrl } = await req.json();
    if (!habitId || !imageUrl) {
      return json({ error: "habitId and imageUrl are required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: habit, error } = await admin
      .from("habits")
      .select("title, category, user_id")
      .eq("id", habitId)
      .single();
    if (error || !habit) return json({ error: "habit not found" }, 404);
    if (habit.user_id !== user.id) return json({ error: "forbidden" }, 403);

    if (!OPENAI_API_KEY) {
      // No AI key configured yet — fall back to manual review instead of blocking the user.
      return json({ approved: false, confidence: null, reason: "ai_not_configured" });
    }

    const prompt = `You are verifying proof-of-completion for a habit-tracking app called Piton. \
The habit is "${habit.title}" (category: ${habit.category}). \
Look at the attached photo and decide if it plausibly shows the user completing this habit. \
Respond ONLY with compact JSON: {"approved": boolean, "confidence": number between 0 and 1, "reason": string}.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const completion = await response.json();
    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = safeParseJson(raw);

    return json({
      approved: Boolean(parsed.approved),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
      reason: parsed.reason ?? "no_reason_given",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

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
