// AGENT 5: ASO (App Store Optimization) Agent
// Optimizes title, keywords, screenshots copy, and descriptions to increase
// downloads/rankings/conversion. Uses current store metadata (from
// docs/ASO.md, checked into the repo) as the baseline the LLM iterates on.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";

async function loadCurrentListing() {
  try {
    return await readFile(path.join(process.cwd(), "..", "docs", "ASO.md"), "utf-8");
  } catch {
    return "(no docs/ASO.md found yet — treat this as a brand-new listing)";
  }
}

async function main() {
  const currentListing = await loadCurrentListing();

  const systemPrompt =
    "You are Piton's ASO agent. Piton is a proof-based habit tracker (\"Don't check it off. Prove it.\"). You optimize App Store / Play Store listings for downloads, keyword ranking, and conversion rate, following each store's character limits (App Store: 30-char title, 30-char subtitle, 100-char keyword field; Play Store: 30-char title, 80-char short description, 4000-char long description).";

  const userPrompt = `Current listing draft:\n${currentListing}\n\nProduce:\n1. App Store: title (<=30 chars), subtitle (<=30 chars), keyword field (<=100 chars, comma-separated, no spaces), and promotional text\n2. Play Store: title (<=30 chars), short description (<=80 chars), long description (compelling, keyword-rich, <=4000 chars)\n3. Screenshot caption copy for a 6-screenshot set (one line each, benefit-driven)\n4. A prioritized keyword list with rationale (what users searching for habit/accountability/proof apps would type)`;

  const analysis = await complete(systemPrompt, userPrompt, { maxTokens: 2200 });

  await writeReport("aso-agent", "ASO Agent — Store Listing Recommendations", [
    { heading: "Current listing (input)", content: currentListing },
    { heading: "Recommended listing & keywords", content: analysis },
  ]);
}

main().catch((err) => {
  console.error("[aso-agent] failed:", err);
  process.exitCode = 1;
});
