# Odie

Piton's operations command center — a mobile-first Next.js app, separate
from the Expo app at the repo root, deployed independently to Vercel.

## What's real in this phase

- Owner-only auth (Supabase Auth, gated to `ODIE_OWNER_EMAIL`) via
  `@supabase/ssr`, enforced both in `proxy.ts` (UI redirect) and by RLS on
  every `odie_*` table (`supabase/migrations/0003_odie_state.sql`).
- A real command router (`app/api/command/route.ts`): natural-language
  input goes to Claude with a small tool-use loop over real Supabase data —
  no invented numbers, no simulated agent activity.
- Real system status on the home screen: live counts from `profiles`,
  `habits`, `habit_verifications`, plus `odie_tasks` / `odie_approvals` /
  `odie_agent_runs`.
- `agents/shared/report.js` now writes a row to `odie_agent_runs` on every
  run (in addition to its existing local markdown report), so this app can
  show agent history without filesystem access.
- `trigger_agent` can dispatch `.github/workflows/agents-weekly.yml` for a
  single agent — but only once `GITHUB_DISPATCH_TOKEN` is set; until then it
  says so plainly instead of pretending to run something.

## What's explicitly not built yet

Everything else in Odie's long-term design: voice, push notifications,
TikTok/Instagram publishing, App Store review automation, an execution
engine that actually *runs* tasks (today `odie_tasks` is a tracking
primitive Claude can read/write via tools — nothing executes them
automatically), experimentation infra, cost tracking. See
`docs/STATUS.md` and `docs/ROADMAP.md` at the repo root for the
authoritative real-vs-planned picture.

## Local development

```bash
cd odie
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Deployment

Deployed to Vercel with root directory `odie`, linked to this same GitHub
repo. Required environment variables — see `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same values
  the Expo app uses (safe to expose to the browser)
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS
- `ANTHROPIC_API_KEY` — server-only, powers the command router
- `ODIE_OWNER_EMAIL` — restricts access to one account
- `GITHUB_DISPATCH_TOKEN` / `GITHUB_DISPATCH_OWNER` / `GITHUB_DISPATCH_REPO`
  / `GITHUB_DISPATCH_REF` — optional, enables `trigger_agent`
