# Deployment

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
   `com.piton.app`) and Android app (package `com.piton.app`).
2. Create the products in App Store Connect / Play Console first
   ($7.99/mo, $59/yr, or whatever the current pricing is), then attach them
   to RevenueCat as products and group them into an "default" Offering —
   `getPaywallPackages()` reads the current offering's packages, so
   `PaywallScreen` shows "No plans available" until this exists.
3. Copy the iOS and Android public SDK keys (RevenueCat → Project settings
   → API keys) into `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (`.env` locally, EAS secrets / repo
   secrets for CI builds).
4. Sandbox-test purchases require a real device build (development or
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
- `EXPO_PUBLIC_ONESIGNAL_APP_ID` — push notifications (public app ID, safe client-side)
- `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`,
  `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_APP_ID` — review agent + submission
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — review agent + submission
- `YOUTUBE_API_KEY` — growth agent
