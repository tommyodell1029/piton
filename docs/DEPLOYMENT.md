# Deployment

## Launch checklist (owner action vs. already done)

Tracking real status toward getting Piton live — not a wish list.

- [x] **Web app live** — https://piton-web.vercel.app (static `expo export
      --platform web` build, deployed on push to this branch). Native
      modules (HealthKit/RevenueCat/OneSignal) safely no-op on web.
- [x] **Privacy policy + Terms of Service drafted** — `legal/privacy.html`
      / `legal/terms.html`, live at
      https://piton-web.vercel.app/privacy.html and
      https://piton-web.vercel.app/terms.html (these are the URLs to paste
      into App Store Connect / Play Console). **Owner action required:**
      both have a
      `[ADD REAL CONTACT EMAIL BEFORE PUBLISHING]` placeholder — replace it
      with a real, monitored address before submitting to either store.
      Apple/Google both require a working contact method here.
- [ ] **Apple Developer Program enrollment** — not started. Owner action:
      enroll at developer.apple.com ($99/year, ~24-48h to activate). See
      iOS section below once you're in.
- [ ] **Google Play Console account** — not started. Owner action: sign up
      at play.google.com/console ($25 one-time).
- [ ] **First EAS build** — never produced. This sandbox can't reach EAS's
      cloud build service (network policy), so this has to run from a real
      machine or GitHub Codespaces: `eas build --profile development` (see
      Building below). This is also the first real test of HealthKit,
      RevenueCat, and OneSignal — budget time to debug on-device issues.
- [ ] **RevenueCat + OneSignal accounts** — not created; needed before a
      production build is meaningful (see Native modules section below).
- [ ] **Store listing submission** — blocked on all of the above. Copy
      from `docs/ASO.md` once a build exists.

## Prerequisites

- Expo account + `eas-cli` (`npm install -g eas-cli`)
- Apple Developer Program membership (for iOS)
- Google Play Console developer account (for Android)
- Samsung Galaxy Store Seller account (optional, phase 3+)
- A Supabase project (production, separate from any local/dev project)
- A RevenueCat project (for the paywall — see [Native modules](#native-modules-revenuecat--onesignal--health) below)
- A OneSignal app (for push notifications — same section)

## One-time setup

```bash
eas login
eas build:configure
```

This fills in `extra.eas.projectId` in `app.json` — replace the placeholder
there with the real value if `eas build:configure` doesn't do it
automatically.

### iOS

```bash
eas credentials
```

Follow the prompts to let EAS manage your Distribution Certificate and
Provisioning Profile, or provide your own if you manage certificates
manually. You'll need:

- Bundle ID `com.piton.app` registered in your Apple Developer account
- An App Store Connect app record created with that bundle ID
- HealthKit capability enabled (already declared in `app.json`'s
  `ios.entitlements`)
- App Store Connect API key (Users and Access → Keys) for CI submission —
  set `APP_STORE_CONNECT_ISSUER_ID` / `APP_STORE_CONNECT_KEY_ID` /
  `APP_STORE_CONNECT_PRIVATE_KEY` as GitHub secrets (also used by the
  review-management agent)

### Android

```bash
eas credentials
```

- Package name `com.piton.app` registered in Play Console
- A Play Console app record created
- A Google Play service account with the Android Publisher API enabled,
  JSON key downloaded — used both for `eas submit` and for
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (review-management agent)

### Samsung Galaxy Store

EAS doesn't submit to Samsung directly. Build an Android App Bundle/APK via
`eas build --platform android --profile production`, then upload manually
through the Samsung Seller Portal. Store assets live in `docs/ASO.md`.

## Building

```bash
# Development client (required — see below — to test HealthKit, Health
# Connect, RevenueCat, and OneSignal, none of which Expo Go can load)
eas build --platform all --profile development

# Internal testing
eas build --platform all --profile preview

# Store release
eas build --platform all --profile production
```

Or trigger the `EAS Build & Submit` GitHub Actions workflow
(`.github/workflows/eas-build.yml`) manually from the Actions tab, or by
pushing a tag like `v1.0.0`. Requires the `EXPO_TOKEN` repo secret (from
`eas whoami --json` / expo.dev account settings → Access Tokens).

## Native modules: RevenueCat + OneSignal + Health

`src/lib/health.native.ts`, `revenuecat.native.ts`, and
`notifications.native.ts` have real implementations, but nothing in this
section has ever run on real hardware from this repo's build environment —
see `docs/STATUS.md` for why. The first `eas build --profile development`
run is also the first real test of all three; expect to debug on-device.

### RevenueCat

1. Create a project in the RevenueCat dashboard, add the iOS app (bundle ID
   `com.piton.app`) and Android app (package `com.piton.app`). Getting the
   apps' SDK keys doesn't require Apple/Google approval — you can do this
   before either account is even active.
2. Create an **entitlement** identified exactly `piton_premium` (Project →
   Entitlements) — this must match `PREMIUM_ENTITLEMENT_ID` in
   `src/lib/revenuecat.native.ts` byte-for-byte, or every entitlement
   check in the app will silently read as "not premium."
3. Create the products in App Store Connect / Play Console first
   ($7.99/mo, $59/yr, or whatever the current pricing is), then attach them
   to RevenueCat as products, attach each product to the `piton_premium`
   entitlement, and group them into the "default" Offering —
   `getPaywallPackages()` reads the current offering's packages, so
   `PaywallScreen` shows "No plans available" until this exists.
4. Copy the iOS and Android public SDK keys (RevenueCat → Project settings
   → API keys) into `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`.env` locally, EAS secrets / repo
   secrets for CI builds).
5. **Webhook → keep `profiles.is_premium` in sync server-side.** This is
   what makes subscription status correct even when the app isn't open
   (renewals, cancellations taking effect, billing failures) — client
   writes to `profiles.is_premium` are blocked at the database level
   (migration `0004_lock_down_server_authoritative_columns.sql`), so
   without this webhook the column just never updates after the first
   purchase.
   - Generate a random secret yourself (e.g. `openssl rand -hex 32`).
   - `supabase secrets set REVENUECAT_WEBHOOK_SECRET=<that value>`
   - In RevenueCat: Project Settings → Integrations → Webhooks → add
     `https://vqsxctinikqphurhoael.supabase.co/functions/v1/revenuecat-webhook`
     as the URL, and paste the same secret into "Authorization header
     value" (sent as `Bearer <secret>` — the function rejects anything
     else, including requests sent before the secret is configured at
     all — it fails closed, not open).
6. **Customer Center** (self-serve cancel/manage/restore, wired to Profile
   → "Manage subscription" via `openCustomerCenter()`) is configured
   entirely in the RevenueCat dashboard under Customer Center — no extra
   app code needed beyond what's already there.
7. Sandbox-test purchases require a real device build (development or
   TestFlight/Internal Testing profile) — the App Store/Play sandbox
   purchase flow doesn't work in a simulator for iOS.

### OneSignal

1. Create a OneSignal app, add iOS (APNs key/cert) and Android (FCM server
   key or service account) push credentials under Settings → Platforms.
2. Copy the OneSignal App ID into `EXPO_PUBLIC_ONESIGNAL_APP_ID`.
3. `onesignal-expo-plugin` is configured in `app.json` with
   `"mode": "development"` — switch it to `"production"` for
   preview/production build profiles (`eas.json` can override `extra`/env
   per profile, or maintain a separate `app.config.js` branch) before
   shipping, otherwise push delivery silently uses the wrong APNs
   environment.

### HealthKit / Health Connect

- iOS needs no manual step beyond the `react-native-health` config plugin
  already in `app.json` (declares the HealthKit entitlement + usage
  description).
- Android (Health Connect) needs one manual step this repo can't automate:
  after `expo prebuild` generates `android/`, add the permissions-rationale
  `activity-alias` to `android/app/src/main/AndroidManifest.xml` per
  [Health Connect's docs](https://developer.android.com/health-and-fitness/guides/health-connect/develop/get-started)
  — there's no Expo config-plugin hook for it yet. If you're building via
  managed `eas build` (no local `prebuild` step you control), you'll need a
  config plugin of your own (an `withAndroidManifest` mod) to inject it, or
  switch that one build to bare workflow.

## Submitting

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Fill in the real `appleId` / `ascAppId` / `appleTeamId` and
`serviceAccountKeyPath` in `eas.json` before running this (currently
placeholders).

## Web deployment (live now)

The web build is a separate, much simpler path from the native stores —
no Apple/Google review, no EAS build, no native module verification
needed (they safely no-op on web per `src/lib/*.web.ts`).

Deployed as Vercel project `piton-web`, linked to this repo, root
directory left at the repo root:

- **Build command:** `npx expo export --platform web && cp legal/privacy.html legal/terms.html dist/`
- **Output directory:** `dist`
- **Framework preset:** none (static export)
- **SSO/Vercel Authentication:** explicitly disabled — this is a public
  consumer app, unlike Odie (`piton-odie`), which stays owner-gated.
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (both public/safe client-side, same values as the mobile app)
- **Privacy policy / terms:** served at their literal `.html` paths
  (`/privacy.html`, `/terms.html`) — no clean-URL rewrite is configured,
  since App Store Connect / Play Console just need a working URL, not a
  pretty one.

Redeploys automatically on every push to this branch (the repo's
production branch). Google/Apple Sign-In buttons stay hidden on web until
real `EXPO_PUBLIC_GOOGLE_*` client IDs are set — everything else works
identically to native.

## Supabase (production)

```bash
npx supabase link --project-ref <prod-project-ref>
npx supabase db push
npx supabase db seed
npx supabase functions deploy ai-coach
npx supabase functions deploy verify-image
npx supabase secrets set \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-ant-...
```

Also configure Apple/Google as Auth providers under Supabase → Authentication
→ Providers, matching the bundle ID / package name above.

## CI/CD secrets checklist (GitHub repo secrets)

- `EXPO_TOKEN` — EAS builds
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — app + CI
- `SUPABASE_SERVICE_ROLE_KEY` — agents only, never in the app
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — agents + Edge Function secrets (set separately via `supabase secrets set`)
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` — paywall (public SDK keys, safe client-side)
- `REVENUECAT_WEBHOOK_SECRET` — Edge Function secret only (set via `supabase secrets set`, never in the app); keeps `profiles.is_premium` in sync — see the RevenueCat section above
- `EXPO_PUBLIC_ONESIGNAL_APP_ID` — push notifications (public app ID, safe client-side)
- `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`,
  `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_APP_ID` — review agent + submission
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — review agent + submission
- `YOUTUBE_API_KEY` — growth agent
