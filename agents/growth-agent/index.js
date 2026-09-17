// AGENT 3: Growth Agent
// Analyzes TikTok / Instagram Reels / YouTube Shorts for trending sounds,
// editing styles, hooks, and retention patterns relevant to habit-tracking /
// fitness / self-improvement content, then produces content ideas.
//
// YouTube Data API v3 is a simple API-key call and is implemented for real
// below. TikTok's Research/Content API and Instagram's Graph API both
// require an approved developer app + business account — those are stubbed
// with clear TODOs rather than faked, since there's no way to call them
// without an approved app.

import { complete } from "../shared/llm.js";
import { writeReport } from "../shared/report.js";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const SEARCH_TERMS = ["habit tracker app", "gym motivation shorts", "accountability challenge"];

async function fetchYoutubeShorts() {
  if (!YOUTUBE_API_KEY) return { configured: false, videos: [] };

  const results = [];
  for (const term of SEARCH_TERMS) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", YOUTUBE_API_KEY);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", term);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoDuration", "short");
    url.searchParams.set("order", "viewCount");
    url.searchParams.set("maxResults", "10");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    results.push(
      ...(data.items ?? []).map((item) => ({
        term,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        videoId: item.id.videoId,
      }))
    );
  }
  return { configured: true, videos: results };
}

async function main() {
  const youtube = await fetchYoutubeShorts().catch((err) => ({
    configured: false,
    error: String(err),
    videos: [],
  }));

  const tiktokNote =
    "TikTok Research API / Content Posting API requires an approved developer app (application review + business verification). Once TIKTOK_API_KEY is issued, wire up `tiktok_music_trending` style discovery here.";
  const instagramNote =
    "Instagram Graph API requires a Business/Creator account linked to a Meta App with `instagram_basic`/`instagram_manage_insights` permissions (app review required for public discovery beyond the connected account's own content).";

  const systemPrompt =
    "You are Piton's Growth agent. Piton is a proof-based habit tracker (slogan: \"Don't check it off. Prove it.\"). Given trending short-form video data (or, if unavailable, your general knowledge of what performs well in the fitness/productivity/self-improvement niche as of your training), produce concrete content ideas.";

  const userPrompt = `YouTube Shorts data (may be empty if not configured):\n${JSON.stringify(
    youtube.videos.slice(0, 20),
    null,
    2
  )}\n\nProduce:\n1. Trending hooks/formats worth adapting for Piton (call out habit/fitness/accountability angles)\n2. 5 concrete content ideas with a hook, 15-30s shot list, and suggested platform\n3. Editing style notes (pacing, captions, sound style) for each idea`;

  const analysis = await complete(systemPrompt, userPrompt, { maxTokens: 1800 });

  await writeReport("growth-agent", "Growth Agent — Content Trend Report", [
    {
      heading: "Data source status",
      content: [
        `- YouTube Data API: ${youtube.configured ? "configured" : "NOT configured (set YOUTUBE_API_KEY)"}${youtube.error ? ` — error: ${youtube.error}` : ""}`,
        `- TikTok: ${tiktokNote}`,
        `- Instagram Reels: ${instagramNote}`,
      ].join("\n"),
    },
    { heading: "Content ideas & trend analysis", content: analysis },
  ]);
}

main().catch((err) => {
  console.error("[growth-agent] failed:", err);
  process.exitCode = 1;
});
