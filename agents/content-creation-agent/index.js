// AGENT 4: Content Creation Agent
// Generates UGC scripts, founder video scripts, captions, hashtags, and
// image/video prompts for TikTok/Instagram/YouTube. This agent produces
// creative briefs (text) — actual video/image generation and scheduling/
// publishing are out of scope here since they require platform-specific
// publishing APIs with approved apps (see growth-agent notes) and a media
// generation pipeline (e.g. this repo's Higgsfield/OpenArt MCP tools, run
// interactively rather than on a cron).

import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";
import { getSupabaseAdmin } from "../shared/supabaseAdmin.js";

const CONTENT_BRIEF =
  process.env.CONTENT_BRIEF ??
  "This week's focus: launch teaser content for Piton's core hook — habit apps rely on the honor system, Piton requires proof.";

async function main() {
  const systemPrompt =
    "You are Piton's Content Creation agent. Piton's slogan is \"Don't check it off. Prove it.\" You write scroll-stopping short-form scripts for TikTok/Reels/Shorts, founder-style talking-head videos, and captions/hashtags. Keep scripts tightly timed (call out seconds) and hook-first.";

  const userPrompt = `Brief: ${CONTENT_BRIEF}\n\nProduce:\n1. Three UGC-style scripts (15-30s each) with timestamped beats\n2. One founder-to-camera script (45-60s) explaining the "prove it" positioning\n3. Captions + hashtag sets (platform-specific: TikTok, Instagram, YouTube Shorts)\n4. Image generation prompts (for thumbnails/cover art) and video generation prompts (for AI b-roll), written so they can be pasted directly into an image/video model`;

  const content = await complete(systemPrompt, userPrompt, { maxTokens: 2200 });

  const { agentRunId } = await writeReport(
    "content-creation-agent",
    "Content Creation Agent — Weekly Content Pack",
    [
      { heading: "Brief", content: CONTENT_BRIEF },
      { heading: "Generated content", content },
      {
        heading: "Next steps for production",
        content:
          "- Feed the image/video prompts above into an image/video generation tool (this workspace has Higgsfield/OpenArt MCP tools available interactively).\n" +
          "- Scheduling/publishing requires each platform's approved publishing API (TikTok Content Posting API, Instagram Graph API with a Business account, YouTube Data API `videos.insert`) — none are wired up here yet since they require app review per platform.",
      },
    ],
  );

  await flagForApproval(agentRunId);
}

// AI-generated content is a draft, not something to publish unreviewed —
// per Odie's automation rules (docs/ODIE.md), publishing needs explicit
// owner approval, so every content run creates one instead of assuming
// the output is ready to go out.
async function flagForApproval(agentRunId) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from("odie_approvals").insert({
    task_id: null,
    action: "review_content_pack",
    summary: `New content pack ready for review (agent run ${agentRunId ?? "unrecorded"}). Ask Odie for the latest content pack to see scripts, captions, and generation prompts before anything gets produced or posted.`,
  });

  if (error) {
    console.error(
      `[content-creation-agent] failed to create approval: ${error.message}`,
    );
  }
}

main().catch((err) => {
  console.error("[content-creation-agent] failed:", err);
  process.exitCode = 1;
});
