# Piton

**Don't check it off. Prove it.**

Piton is a habit tracker that requires proof of completion — photo, GPS,
HealthKit/Health Connect, timers, step counts, workouts, or AI image review —
instead of an honor-system checkbox.

This repo contains the mobile app, backend schema, and a set of automation
agents for product/growth/ASO work. See [`docs/STATUS.md`](docs/STATUS.md)
for an honest accounting of what's real vs. scaffolded.

## Stack

- **App:** React Native + Expo (TypeScript)
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** OpenAI + Anthropic (Claude), called server-side from Edge Functions
- **Analytics:** Mixpanel, PostHog, Firebase Analytics (facade in `src/lib/analytics.ts`)
- **Notifications:** OneSignal
- **Payments:** RevenueCat
- **CI/CD:** GitHub Actions + EAS Build/Submit

## Repo layout

```
App.tsx                      Root component
src/
  navigation/                Auth stack, main tab navigator
  screens/                   auth/, habits/, verification/, social/, coach/, profile/
  lib/                       Supabase-backed data layer + provider facades
  components/                Shared UI
  theme/                     Colors, spacing
  types/                     Shared TS types
supabase/
  migrations/0001_init.sql   Full schema + RLS policies + triggers
  functions/                 Edge Functions (ai-coach, verify-image)
  seed.sql                   Starter badges
agents/                      6 automation agents (see agents/README.md)
docs/                        Roadmap, architecture, ASO, deployment, status
.github/workflows/           CI, EAS build, weekly agents cron
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL/anon key at minimum
npm start
```

You need a Supabase project to run the app against:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies supabase/migrations/0001_init.sql
npx supabase db seed        # loads starter badges (or run seed.sql manually)
npx supabase functions deploy ai-coach
npx supabase functions deploy verify-image
```

Then set Edge Function secrets:

```bash
npx supabase secrets set OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-...
```

## What's implemented vs. scaffolded

Full detail in [`docs/STATUS.md`](docs/STATUS.md). Short version: the app
screens, navigation, database schema/RLS, and the photo/timer/GPS
verification flows are real and wired end-to-end against Supabase.
HealthKit/Health Connect, OneSignal, RevenueCat, and the analytics SDKs are
scaffolded with a clean interface but need a custom dev client / EAS build
and real vendor credentials to go live (none of them work inside Expo Go).

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the MVP → Beta → Launch →
Growth → Scale breakdown, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the system design.

## Agents

Six automation agents (Product Manager, Review Management, Growth, Content
Creation, ASO, Analytics) live in [`agents/`](agents/README.md) and run on a
weekly GitHub Actions cron once the relevant API credentials are set as repo
secrets.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Apple/Google/Samsung
store setup and the EAS build/submit pipeline.
