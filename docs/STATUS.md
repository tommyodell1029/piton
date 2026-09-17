# Status — what's real vs. scaffolded

Built as of the initial scaffold commit. Read this before assuming
something "just works."

## Fully working (once you point it at a real Supabase project)

- Email sign-up/sign-in, session persistence
- Apple Sign-In (native button + Supabase `signInWithIdToken`)
- Habit create/list/archive
- Photo verification (camera or library → Supabase Storage upload)
- AI photo review (`verify-image` Edge Function → OpenAI vision, falls back
  to `pending` if no key is set — never silently auto-approves)
- Timer verification
- GPS/location capture and submission
- Server-side streak calculation + XP award (Postgres trigger — not
  client-trusted)
- Profile screen with level/rank/XP progress bar, badges list
- Global leaderboard
- Friends / groups / challenges data layer and screens (basic — no invite
  flow yet, add-by-user-ID only)
- AI Coach chat, daily motivation, habit recommendations (Edge Function →
  Claude or OpenAI)
- Full RLS-secured Postgres schema with 8+ tables and triggers

## Scaffolded — interface is real, implementation needs native modules

These all share one root cause: **Expo Go can't load them.** Each needs an
EAS development client build (`eas build --profile development`) plus the
listed native package.

- **HealthKit / Health Connect** (`src/lib/health.ts`) — needs
  `react-native-health` (iOS) / `react-native-health-connect` (Android)
- **OneSignal push** (`src/lib/notifications.ts`) — needs
  `react-native-onesignal`
- **RevenueCat** (`src/lib/revenuecat.ts`) — needs `react-native-purchases`
- **Google Sign-In** — `expo-auth-session` flow needs real
  `EXPO_PUBLIC_GOOGLE_*` client IDs from Google Cloud Console

## Scaffolded — needs vendor credentials only (no native module gap)

- **Mixpanel / PostHog / Firebase Analytics** (`src/lib/analytics.ts`) — the
  facade and event taxonomy exist; each provider's SDK init is a `TODO` gated
  on its env var being present

## Not built yet (roadmap Phase 2+)

- Onboarding flow
- Automatic badge-awarding logic (badges are seeded but nothing grants them
  yet — needs milestone triggers)
- Friend invite flow (currently requires knowing the other user's UUID)
- Paywall UI
- Push notification scheduling logic (habit reminders)

## Agents (`agents/`)

See the integration matrix in `agents/README.md`. Short version: LLM calls
and Supabase queries are real; App Store Connect and Google Play API clients
are real (JWT auth implemented from scratch, zero extra deps); TikTok and
Instagram data pulls are stubbed because both require an approved developer
app before any API call can succeed — there's no way to fake that.
