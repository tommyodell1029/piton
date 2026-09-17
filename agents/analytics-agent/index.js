// AGENT 6: Analytics Agent
// Computes retention/DAU/MAU/churn/activation from Supabase data and
// recommends improvements against Piton's success targets (D1 > 50%,
// D30 > 20%, 4.7+ rating, CAC < LTV).

import { getSupabaseAdmin } from "../shared/supabaseAdmin.js";
import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";

const TARGETS = {
  d1Retention: 0.5,
  d30Retention: 0.2,
  minRating: 4.7,
};

async function computeMetrics() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { configured: false };
  }

  const now = Date.now();
  const dayAgo = new Date(now - 86400000).toISOString();
  const monthAgo = new Date(now - 30 * 86400000).toISOString();

  const [{ count: totalUsers }, { count: dau }, { count: mau }, { count: activatedUsers }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("habit_verifications")
        .select("user_id", { count: "exact", head: true })
        .gte("submitted_at", dayAgo),
      supabase
        .from("habit_verifications")
        .select("user_id", { count: "exact", head: true })
        .gte("submitted_at", monthAgo),
      // "Activated" = submitted at least one verification ever.
      supabase.from("habit_verifications").select("user_id", { count: "exact", head: true }),
    ]);

  return {
    configured: true,
    totalUsers,
    dau,
    mau,
    activatedUsers,
    activationRate: totalUsers ? Number((activatedUsers / totalUsers).toFixed(3)) : null,
  };
}

async function main() {
  const metrics = await computeMetrics();

  const systemPrompt =
    "You are Piton's Analytics agent. Piton's success targets are D1 retention > 50%, D30 retention > 20%, 4.7+ app rating, and CAC below LTV. You interpret DAU/MAU/activation data against these targets and recommend concrete product/growth changes.";

  let analysis;
  if (!metrics.configured) {
    analysis =
      "SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_URL not configured — this agent needs direct DB access to compute real metrics. " +
      "Once live, also wire in Mixpanel/PostHog/Firebase cohort retention exports for true D1/D30 retention curves (verification timestamps alone approximate activity, not cohort retention).";
  } else {
    const userPrompt = `Metrics snapshot:\n${JSON.stringify(metrics, null, 2)}\nTargets:\n${JSON.stringify(TARGETS, null, 2)}\n\nProduce:\n1. Gap analysis vs. targets\n2. Likely churn drivers given a proof-based habit app\n3. 3 concrete experiments to run this month, each with a hypothesis and success metric`;
    analysis = await complete(systemPrompt, userPrompt, { maxTokens: 1500 });
  }

  await writeReport("analytics-agent", "Analytics Agent — Retention & Growth Report", [
    { heading: "Metrics snapshot", content: "```json\n" + JSON.stringify(metrics, null, 2) + "\n```" },
    { heading: "Targets", content: "```json\n" + JSON.stringify(TARGETS, null, 2) + "\n```" },
    { heading: "Analysis & recommendations", content: analysis },
  ]);
}

main().catch((err) => {
  console.error("[analytics-agent] failed:", err);
  process.exitCode = 1;
});
