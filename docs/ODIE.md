# Odie — Piton's command center

Odie is an operations layer on top of Piton: a separate Next.js app
(`odie/`) deployed to Vercel, reusing the same Supabase project
(`vqsxctinikqphurhoael`) the mobile app runs on. It exists so the owner can
check on and direct Piton's development/growth work from a phone, instead
of a terminal.

**Live URL:** https://piton-odie.vercel.app (owner-only sign-in, same
Supabase auth as the mobile app — use the `tommy.odell1029@gmail.com`
account's password).

This doc tracks what's actually real, separately from `docs/STATUS.md`
(which covers the Piton app itself) so a future session — or a future
you — can pick this up without re-deriving the state from scratch.

## Why this exists / what it's scoped to

An earlier request specified a 49-section "Odie Autonomous AI Operating
System" — 15+ agents, voice, TikTok/Instagram publishing, App Store review
automation, an execution engine, experimentation infra, and more. Building
all of that as working software in one pass wasn't realistic (most of it
depends on external approvals/access that don't exist yet — TikTok/IG
developer apps, an actual EAS build, a live userbase to analyze). Rather
than fake a demo of it, this is a real, load-bearing **Phase 1 foundation**:
the state layer, auth, and one working command path, built on infrastructure
that's actually there. Everything else in the original spec is a roadmap
item, not a shipped feature — see "Not built" below.

## What's real right now

- **Owner-only auth.** `odie/proxy.ts` redirects anyone who isn't signed in
  as the owner to `/login`; RLS policies on every `odie_*` table check the
  same JWT email claim independently, so the UI gate isn't the only thing
  standing between this and the data.
- **Persistent state** (`supabase/migrations/0003_odie_state.sql`):
  `odie_tasks`, `odie_approvals`, `odie_agent_runs`, `odie_state`. Before
  this migration, the project had *no* durable cross-session state —
  `agents/reports/*.md` is gitignored and local-only. This is genuinely new
  infrastructure, not a wrapper around something that already existed.
- **A real command router** (`odie/app/api/command/route.ts`): natural
  language goes to Claude (`claude-sonnet-5`) with a bounded tool-use loop
  (max 6 iterations) over `odie/lib/tools.ts` — `get_piton_status`,
  `list_recent_agent_runs`, `list_tasks`/`create_task`,
  `list_approvals`/`create_approval`/`decide_approval`, `trigger_agent`.
  Every tool hits the real Supabase project; none return invented data.
- **Agent run history.** `agents/shared/report.js` now inserts a row into
  `odie_agent_runs` on every run (all 6 agents), in addition to its
  existing local markdown file. This is how Odie's dashboard can show
  agent activity without filesystem access to whatever machine ran them.
- **Single-agent dispatch.** `.github/workflows/agents-weekly.yml` now
  accepts a `workflow_dispatch` input (`all`/`pm`/`reviews`/`growth`/
  `content`/`aso`/`analytics`) instead of only running all six — needed so
  `trigger_agent` can ask for one agent instead of the whole weekly batch.
  Requires `GITHUB_DISPATCH_TOKEN` to actually fire (see below); without
  it, the tool says so instead of pretending to dispatch anything.
- **A real mobile-first dashboard** (`odie/app/page.tsx`): live counts from
  `profiles`, `habits`, `habit_verifications` (7d), plus open
  `odie_tasks`/`odie_approvals` and recent `odie_agent_runs`. Explicitly
  labeled that Piton hasn't launched publicly, so these are internal/test
  numbers — currently 1 profile, 0 habits (per `docs/STATUS.md`).

## What's not built (don't assume otherwise)

- **No execution engine.** `odie_tasks` is a tracking primitive — Claude
  can create/list/read them via tools, but nothing automatically executes
  a task. "Odie, build that feature" today means Claude (in a normal
  coding session, like this one) does the work directly — Odie the web app
  doesn't dispatch a coding agent on its own yet.
- **No voice, no push notifications, no PWA offline support** beyond the
  manifest/home-screen-install basics.
- **No TikTok/Instagram/App Store review automation** — same gap that
  already existed in `agents/` (needs approved developer apps / API access
  this project doesn't have).
- **Edge Function status on the dashboard is a static snapshot**, not a
  live poll — live-polling needs a Supabase Management API personal access
  token (different from the anon/service-role keys already in use), which
  isn't configured.
- **No cost tracking, no experimentation framework, no security-agent
  automation.** These remain roadmap items from the original spec.

## Setup still needed (owner action)

Two secrets are deliberately **not** set by Claude — they're sensitive
enough that the safer path is copying them directly between dashboards
rather than through a chat session:

1. **`SUPABASE_SERVICE_ROLE_KEY`** — from the Supabase dashboard
   (Project Settings → API) for `vqsxctinikqphurhoael`. Required for the
   dashboard and command router to read/write anything — without it,
   every page after login will error.
2. **`ANTHROPIC_API_KEY`** — same key already used by the `agents/`
   scripts and the `ai-coach` Edge Function. Required for the command
   router; without it, Odie will tell you plainly it's not configured
   rather than fail silently.

Add both under the `piton-odie` Vercel project → Settings → Environment
Variables (all three environments), then redeploy.

Optional, to enable `trigger_agent`:

3. **`GITHUB_DISPATCH_TOKEN`** — a GitHub PAT with `repo` + `workflow`
   scopes. `GITHUB_DISPATCH_OWNER`/`_REPO`/`_REF` default to
   `tommyodell1029`/`piton`/`main` respectively — check `_REF` matches
   this repo's actual default branch when you set this up (see
   `odie/.env.example`).

## Where things live

- App: `odie/` (Next.js 16, App Router, deployed with root directory
  `odie` on Vercel project `piton-odie`)
- State schema: `supabase/migrations/0003_odie_state.sql`
- Tool definitions: `odie/lib/tools.ts`
- This doc, plus `docs/STATUS.md` / `docs/ROADMAP.md` at the repo root for
  the Piton app itself
