// Supabase Edge Function: revenuecat-webhook
//
// Keeps profiles.is_premium in sync with RevenueCat's own subscription
// state. This is the actual source of truth for entitlement status — the
// app's own isPremiumUnlocked() check reads RevenueCat's SDK cache
// directly and is trustworthy on its own, but *other* server-side logic
// (leaderboards, future premium-gated features, anything that queries
// profiles.is_premium) needs that column to reflect reality even when the
// user's app isn't open (e.g. a renewal, a cancellation taking effect, a
// billing failure). Client writes to is_premium are blocked at the
// database level (see migration 0004) specifically so this function is
// the only thing that can set it.
//
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt
// (RevenueCat calls this directly with its own shared-secret auth, not a
// Supabase user JWT, so gateway-level JWT verification must be off — same
// reasoning as ai-coach/verify-image, just a different auth mechanism.)
// Secret: supabase secrets set REVENUECAT_WEBHOOK_SECRET=<a value you
// generate yourself>, then paste the SAME value into RevenueCat's
// dashboard under Project Settings → Integrations → Webhooks →
// Authorization header value.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENTITLEMENT_ID = "piton_premium";

// Event types that mean the entitlement is (still) active.
const GRANTING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
]);

// Only EXPIRATION means access actually ends — CANCELLATION just means
// auto-renew is off, the user keeps access until the current period ends
// (RevenueCat sends EXPIRATION separately when that happens).
const REVOKING_EVENTS = new Set(["EXPIRATION"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  if (!WEBHOOK_SECRET) {
    console.error(
      "[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET not configured — rejecting",
    );
    return json({ error: "webhook not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const event = body.event;
    if (!event) return json({ error: "missing event" }, 400);

    const appUserId: string | undefined = event.app_user_id;
    const entitlementIds: string[] = event.entitlement_ids ?? [];
    const eventType: string = event.type;

    if (!appUserId) return json({ error: "missing app_user_id" }, 400);
    if (!entitlementIds.includes(ENTITLEMENT_ID)) {
      // Event for a different entitlement (or none) — nothing to sync.
      return json({ ok: true, skipped: true });
    }

    let nextValue: boolean | null = null;
    if (GRANTING_EVENTS.has(eventType)) nextValue = true;
    else if (REVOKING_EVENTS.has(eventType)) nextValue = false;

    if (nextValue === null) {
      // Event type we don't act on (e.g. BILLING_ISSUE, TRANSFER) —
      // acknowledge without changing anything.
      return json({
        ok: true,
        skipped: true,
        reason: `unhandled type ${eventType}`,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: nextValue })
      .eq("id", appUserId);

    if (error) {
      console.error("[revenuecat-webhook] update failed:", error.message);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, app_user_id: appUserId, is_premium: nextValue });
  } catch (err) {
    console.error(
      "[revenuecat-webhook] error:",
      err instanceof Error ? err.message : String(err),
    );
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
