// AGENT 1: Product Manager Agent
// Analyzes app usage (retention, churn, feature adoption), and drafts a
// prioritized roadmap. Reads from Supabase when creds are present; otherwise
// runs on placeholder data so the report structure/prompting can be tested
// before real usage data exists.

import { getSupabaseAdmin } from "../shared/supabaseAdmin.js";
import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";

async function gatherUsageMetrics() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      totalUsers: null,
      activeHabits: null,
      verificationsLast7d: null,
      note: "Supabase credentials not configured — using placeholder metrics.",
    };
  }

  const [{ count: totalUsers }, { count: activeHabits }, { count: verificationsLast7d }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("habits").select("*", { count: "exact", head: true }).is("archived_at", null),
      supabase
        .from("habit_verifications")
        .select("*", { count: "exact", head: true })
        .gte("submitted_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

  return { totalUsers, activeHabits, verificationsLast7d, note: null };
}

async function main() {
  const metrics = await gatherUsageMetrics();

  const systemPrompt =
    "You are Piton's Product Manager agent. Piton is a habit-tracking app whose core differentiator is requiring PROOF (photo, GPS, HealthKit, timer, AI review) instead of honor-system checkboxes. You analyze usage data, identify churn risk, and prioritize the roadmap across MVP/Beta/Launch/Growth/Scale phases. Be specific and ranked, not generic.";

  const userPrompt = `Current metrics:\n${JSON.stringify(metrics, null, 2)}\n\nProduce:\n1. Churn risk analysis (what's likely driving drop-off given these numbers, or what to instrument if data is missing)\n2. Top 5 feature suggestions ranked by expected impact on D1/D30 retention\n3. A prioritized roadmap slice for the NEXT sprint only (not the whole roadmap)`;

  const analysis = await complete(systemPrompt, userPrompt);

  await writeReport("product-manager-agent", "Product Manager Agent — Weekly Report", [
    { heading: "Usage metrics snapshot", content: "```json\n" + JSON.stringify(metrics, null, 2) + "\n```" },
    { heading: "Analysis & roadmap recommendations", content: analysis },
  ]);
}

main().catch((err) => {
  console.error("[product-manager-agent] failed:", err);
  process.exitCode = 1;
});
