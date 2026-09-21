# Status — what's real vs. scaffolded

Built as of the initial scaffold commit. Read this before assuming
something "just works."

## Backend: live and confirmed working end-to-end

The app is wired to a real Supabase project (`vqsxctinikqphurhoael`, us-east-1).
The full schema, RLS policies, triggers, and the `ai-coach` / `verify-image`
Edge Functions are deployed and active; security advisors are clean. Local
`.env` holds the real project URL/anon key (gitignored, not committed).

Verified live against a real device (not just this sandbox): sign-up,
sign-in, and the AI Coach getting real Claude replies via the `ai-coach`
Edge Function all work. Two real bugs were found and fixed along the way:

- Both Edge Functions had `verify_jwt: true` at the gateway level, which
  rejects the browser's unauthenticated CORS preflight `OPTIONS` request
  before the function code ever runs. Fixed by moving auth checks into the
  function code (via the caller's own JWT) and deploying with
  `verify_jwt: false` plus explicit CORS headers on every response.
- `verify-image` didn't check that the caller actually owned the habit being
  verified (it used the service-role key with no ownership check) — fixed.

Apple/Google OAuth providers still need enabling under Authentication →
Providers if you want those sign-in buttons live.

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
- Onboarding: 4-slide intro (`src/screens/onboarding/OnboardingScreen.tsx`),
  shown once per device (AsyncStorage flag) before sign-in, skippable
- Automatic badge awarding (`supabase/migrations/0002_badge_triggers.sql`):
  `first_proof` on a user's first approved verification, `week_streak` /
  `month_streak` at 7 and 30, `social_starter` when a friendship becomes
  accepted — each also grants +25 bonus XP once. Verified with a real
  transaction against the live database (rolled back after, so no test data
  or XP leaked into the real account). `challenge_winner` stays manual —
  there's no challenge-results computation to hook yet.

## Native modules: real code written, unverified on a device

HealthKit, Health Connect, RevenueCat, and OneSignal are no longer stubs —
each has a real implementation against the vendor's documented API,
installed as a dependency, and wired into the app's screens (Health
verification, a new Paywall screen off Profile → "Upgrade to Premium").
What's still true regardless: **Expo Go can't load any of them** — none of
this runs until someone produces a custom EAS development client build
(`eas build --profile development`), which needs Xcode/Android SDK or a
reachable EAS cloud build — neither exists in this sandbox, so none of the
code below has run on real hardware. It's written directly from each
package's docs and validated by typecheck/lint plus a full web regression
pass (the one thing this sandbox *can* run), not by a device test.

**The specific risk this had to design around:** all three native packages
are imported from code that sits in the app's always-mounted tree (the
health verification screen, `PaywallScreen`, and RootNavigator's
post-login effect that calls `initRevenueCat`/`initNotifications` on every
launch). A plain top-level `import` of a native-only package would execute
at app startup on every iOS/Android launch — including under Expo Go,
where the compiled native side doesn't exist — and could crash the whole
app, not just the feature using it. Two mitigations, both load-bearing:

1. **Platform-specific files.** Each integration is split into
   `*.native.ts` (real code, only ever bundled for ios/android) and
   `*.web.ts` (safe no-op, bundled for web) — Metro's own platform
   resolution picks the right one, so neither platform's bundle ever
   contains the other's native module. A bare `health.ts` /
   `revenuecat.ts` / `notifications.ts` file also exists in each case, but
   purely so `tsc` (which doesn't do Metro's per-platform resolution) can
   resolve the import — Metro never actually uses that file's content on
   any platform.
2. **Lazy, guarded `require()`.** Inside the `.native.ts` files, the
   actual native package is loaded via `require()` **inside each
   function**, wrapped in try/catch — never as a top-level `import`. A
   missing native module (Expo Go, or before a dev client exists) degrades
   to the same "unavailable" result the web variant returns, instead of
   throwing at startup.

This was verified for real: a full Playwright pass against the web build
after adding all four packages showed zero new console/page errors and the
same working sign-in flow as before — confirming the split actually
prevents the regression it's designed to prevent, on the one platform this
sandbox can test.

- **HealthKit / Health Connect** (`src/lib/health.native.ts`) — reads
  today's steps, active-energy, and exercise minutes. One known gap:
  Health Connect also requires a manual `AndroidManifest.xml` addition
  (an `activity-alias` for the permissions-rationale intent,
  `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`) that Expo's config
  plugin system has no declarative way to express — this has to be added
  by hand after `expo prebuild` generates the Android project, per
  [Health Connect's permissions docs](https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started).
- **RevenueCat** (`src/lib/revenuecat.native.ts`) — configure, fetch
  offerings, purchase, entitlement check. `PaywallScreen` (off Profile →
  "Upgrade to Premium") lists real offerings and drives a purchase — but
  will show "No plans available" until a RevenueCat API key and offerings
  exist.
- **OneSignal push** (`src/lib/notifications.native.ts`) — initializes the
  SDK and calls `login(userId)` so pushes can be targeted per-account.
- **Google Sign-In** — not a native-module problem (the existing
  `expo-auth-session` browser-redirect flow already works in Expo Go);
  just needs real `EXPO_PUBLIC_GOOGLE_*` client IDs from Google Cloud
  Console.

Config added for all of this: `app.json` now includes the
`react-native-health`, `react-native-health-connect`, and
`onesignal-expo-plugin` config plugins, `expo-build-properties` (Health
Connect needs Android SDK 36/minSdk 26), and the Health Connect Android
permissions. Validated with `npx expo config` (resolves cleanly, and shows
OneSignal's iOS notification-service-extension config landed correctly) —
this is as far as config-plugin validation goes without an actual native
build.

## Scaffolded — needs vendor credentials only (no native module gap)

- **Mixpanel / PostHog / Firebase Analytics** (`src/lib/analytics.ts`) — the
  facade and event taxonomy exist; each provider's SDK init is a `TODO` gated
  on its env var being present

## Not built yet (roadmap Phase 2+)

- Friend invite flow (currently requires knowing the other user's UUID —
  this also means `social_starter` has no reachable UI path yet even though
  the award trigger is live and correct; wiring an accept-request flow
  would make it earnable)
- Push notification scheduling logic (habit reminders) — OneSignal is
  initialized and can receive targeted sends, but nothing in the app yet
  schedules a reminder based on habit cadence
- An actual EAS development client build — nothing native-module-related
  above can be exercised until one exists (see the native modules section)

## Agents (`agents/`)

See the integration matrix in `agents/README.md`. Short version: LLM calls
and Supabase queries are real; App Store Connect and Google Play API clients
are real (JWT auth implemented from scratch, zero extra deps); TikTok and
Instagram data pulls are stubbed because both require an approved developer
app before any API call can succeed — there's no way to fake that. Every
run now also writes a row to `odie_agent_runs` (see below) in addition to
its local markdown report.

## Odie — the command center (`odie/`)

Live and deployed: https://piton-odie.vercel.app (owner-only auth, separate
Next.js app, same Supabase project). Real: owner-gated auth, a persistent
task/approval/agent-run state layer that didn't exist before
(`supabase/migrations/0003_odie_state.sql`), a working Claude tool-use
command router against real data, and single-agent GitHub Actions dispatch.
Not real yet: an execution engine (tasks are tracked, not auto-run), voice,
push, TikTok/Instagram/App Store review automation, live Edge Function
polling. Full detail, including the two secrets that still need to be added
on Vercel before the dashboard fully works, in `docs/ODIE.md`.
