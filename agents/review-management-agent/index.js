// AGENT 2: Review Management Agent
// Pulls Apple + Google reviews (Samsung Galaxy Store has no public reviews
// API — see note in the report), categorizes feedback, drafts responses,
// and produces a weekly report of top complaints/requests/priorities.

import { fetchAppStoreReviews, isAppStoreConnectConfigured } from "../shared/appStoreConnect.js";
import { fetchGooglePlayReviews, isGooglePlayConfigured } from "../shared/googlePlay.js";
import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";

async function main() {
  const [appStore, googlePlay] = await Promise.all([
    fetchAppStoreReviews().catch((err) => ({ configured: false, error: String(err), reviews: [] })),
    fetchGooglePlayReviews().catch((err) => ({ configured: false, error: String(err), reviews: [] })),
  ]);

  const allReviews = [
    ...appStore.reviews.map((r) => ({ ...r, platform: "apple" })),
    ...googlePlay.reviews.map((r) => ({ ...r, platform: "google" })),
  ];

  const systemPrompt =
    "You are Piton's Review Management agent. Piton is a proof-based habit tracker. Categorize app store reviews into bugs, feature requests, and praise. Draft short, warm, non-defensive public responses to the 3 most critical reviews. Then summarize top complaints, top requests, and suggested development priorities.";

  let analysis;
  if (allReviews.length === 0) {
    analysis =
      "No reviews fetched — either no store credentials are configured yet, or the app has no reviews. " +
      "Configure APP_STORE_CONNECT_* and GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secrets once the app is live to enable this agent fully.";
  } else {
    const userPrompt = `Reviews (JSON):\n${JSON.stringify(allReviews, null, 2)}\n\nProduce:\n1. Categorized feedback (bugs / feature requests / praise) with review IDs\n2. Draft responses for the 3 most critical/negative reviews\n3. Top complaints list\n4. Top feature requests list\n5. Development priorities ranked by frequency + severity`;
    analysis = await complete(systemPrompt, userPrompt, { maxTokens: 2000 });
  }

  await writeReport("review-management-agent", "Review Management Agent — Weekly Report", [
    {
      heading: "Source status",
      content: [
        `- Apple App Store Connect: ${isAppStoreConnectConfigured() ? "configured" : "NOT configured"}${appStore.error ? ` (error: ${appStore.error})` : ""}`,
        `- Google Play Developer API: ${isGooglePlayConfigured() ? "configured" : "NOT configured"}${googlePlay.error ? ` (error: ${googlePlay.error})` : ""}`,
        "- Samsung Galaxy Store: no public reviews API exists; monitor manually via Samsung Seller Portal, or via a periodic scrape reviewed against Samsung's ToS.",
      ].join("\n"),
    },
    { heading: "Raw review count", content: `${allReviews.length} reviews analyzed.` },
    { heading: "Analysis", content: analysis },
  ]);
}

main().catch((err) => {
  console.error("[review-management-agent] failed:", err);
  process.exitCode = 1;
});
