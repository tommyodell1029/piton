# Deployment

## Prerequisites

- Expo account + `eas-cli` (`npm install -g eas-cli`)
- Apple Developer Program membership (for iOS)
- Google Play Console developer account (for Android)
- Samsung Galaxy Store Seller account (optional, phase 3+)
- A Supabase project (production, separate from any local/dev project)

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
# Development client (for testing native modules like HealthKit that Expo Go can't load)
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
- `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`,
  `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_APP_ID` — review agent + submission
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — review agent + submission
- `YOUTUBE_API_KEY` — growth agent
