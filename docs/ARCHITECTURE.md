# Architecture

## High-level

```
┌─────────────────────┐        ┌──────────────────────────┐
│  Expo / React Native │        │        Supabase           │
│  (iOS, Android)      │◄──────►│  Postgres + RLS            │
│                      │  REST/  │  Auth (email, Apple, Google)│
│  src/lib/*           │  RT     │  Storage (proof photos)    │
└──────────┬───────────┘        │  Edge Functions:           │
           │                     │   - ai-coach               │
           │ invoke              │   - verify-image           │
           ▼                     └──────────┬────────────────┘
  RevenueCat / OneSignal /                  │ server-side keys
  Mixpanel / PostHog / Firebase             ▼
  (client SDKs, dev-client only)   OpenAI / Anthropic APIs

┌───────────────────────────────────────────────────────────┐
│ agents/ (Node scripts, run via GitHub Actions cron)         │
│  PM · Review Mgmt · Growth · Content · ASO · Analytics       │
│  → Supabase (service role) / App Store Connect / Play API /  │
│    YouTube Data API / Claude / OpenAI → reports (Markdown)   │
└───────────────────────────────────────────────────────────┘
```

## Client (`src/`)

- **`lib/supabase.ts`** — single Supabase client instance, session persisted
  via AsyncStorage.
- **`lib/auth.ts`** — email/password, Apple (native `expo-apple-authentication`
  → `signInWithIdToken`), Google (id token → `signInWithIdToken`; the actual
  Google OAuth screen uses `expo-auth-session` in the sign-in screen, wired
  once Google client IDs are set).
- **`lib/habits.ts`, `lib/verification.ts`, `lib/streaks.ts`,
  `lib/gamification.ts`, `lib/social.ts`** — thin typed wrappers over
  Supabase tables. All security is enforced by Postgres RLS policies, not
  client-side checks.
- **`lib/health.ts`, `lib/notifications.ts`, `lib/revenuecat.ts`,
  `lib/analytics.ts`** — provider facades. Each no-ops safely when its env
  var isn't set, and documents exactly which native module + config plugin
  is needed to go live (all four require a custom EAS dev client — none work
  in Expo Go).
- **`lib/aiCoach.ts`** — calls the `ai-coach` Edge Function; no LLM API key
  ever ships in the client bundle.

## Why verification logic lives in Postgres, not the client

`supabase/migrations/0001_init.sql` defines a trigger
(`bump_streak_on_verification`) that increments streaks and awards XP only
when a `habit_verifications` row is inserted/updated with
`status = 'approved'`. This means:

- A compromised or modified client can't fake a streak — the write has to go
  through RLS (`auth.uid() = user_id`) and the increment logic runs
  server-side regardless of what the client claims.
- AI-reviewed photos can flip from `pending` → `approved` asynchronously
  (the Edge Function updates the row after the initial insert) and the
  streak still updates correctly via the same trigger.

## Edge Functions

- **`verify-image`** — given a habit + proof photo URL, asks a
  vision-capable model (OpenAI `gpt-4o-mini` by default) whether the photo
  plausibly proves the habit, returns `{approved, confidence, reason}`.
- **`ai-coach`** — pulls the caller's real habits/streaks (via the caller's
  own JWT, so RLS applies — the function can only see what the user can see)
  and answers chat messages, daily motivation, or habit recommendations
  using Claude (preferred) or OpenAI.

Both keep API keys as Supabase secrets, never in the mobile bundle.

## Data model

See `supabase/migrations/0001_init.sql` for the authoritative schema:
`profiles`, `habits`, `habit_verifications`, `streaks`, `badges` /
`user_badges`, `friendships`, `groups` / `group_members`, `challenges`, plus
a public `proofs` storage bucket scoped per-user by folder.

## Agents (`agents/`)

Independent Node scripts, not a persistent framework — see
`agents/README.md` for the integration matrix (what's real vs. stubbed per
agent) and the weekly GitHub Actions cron that runs them.
