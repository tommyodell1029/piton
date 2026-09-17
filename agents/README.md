# Piton Agent System

Six Node scripts, one per agent from the product brief. Each is a standalone
`node <agent>/index.js` script (no framework) that:

1. Pulls whatever real data it can (Supabase, App Store Connect, Google Play,
   YouTube Data API) when credentials are configured.
2. Falls back to a clearly-labeled placeholder/stub when they aren't, so the
   script always runs end-to-end instead of crashing on missing keys.
3. Sends context + a task-specific prompt to Claude (preferred) or OpenAI via
   `shared/llm.js`.
4. Writes a dated Markdown report to `agents/reports/<agent-name>/<date>.md`
   (gitignored — these are runtime artifacts, not source).

## Agents

| Agent | Script | Real integrations wired up | Needs app-review / manual setup |
|---|---|---|---|
| Product Manager | `product-manager-agent` | Supabase usage metrics | — |
| Review Management | `review-management-agent` | App Store Connect API, Google Play Developer API | Samsung Galaxy Store has no public reviews API |
| Growth | `growth-agent` | YouTube Data API v3 | TikTok Research/Content API, Instagram Graph API (both require an approved developer app) |
| Content Creation | `content-creation-agent` | LLM script/caption/prompt generation | Actual publishing needs each platform's approved posting API |
| ASO | `aso-agent` | Reads `docs/ASO.md` as baseline | — |
| Analytics | `analytics-agent` | Supabase DAU/MAU/activation queries | True cohort D1/D30 retention needs Mixpanel/PostHog/Firebase export wiring |

## Setup

```bash
cd agents
npm install
cp ../.env.example ../.env   # fill in whichever keys you have
```

Run a single agent:

```bash
node product-manager-agent/index.js
```

Run all of them:

```bash
npm run all
```

## Scheduling

`.github/workflows/agents-weekly.yml` runs all six agents on a weekly cron
and uploads the generated reports as a workflow artifact. Wire in repo
secrets matching the names in `.env.example` to unlock each integration.

## Design note

These agents are intentionally simple, dependency-light scripts rather than
a persistent multi-agent framework — that keeps them auditable, cheap to run
on a schedule, and easy to extend one integration at a time as real
credentials (App Store Connect keys, TikTok API access, etc.) become
available.
