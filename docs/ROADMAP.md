# Piton Roadmap

Target metrics for the whole roadmap: **D1 retention > 50%**, **D30 retention
> 20%**, **4.7+ app rating**, **CAC below LTV**.

## Phase 1 — MVP (this repo, current state)

Goal: prove the core loop — create a habit, prove it, see a streak — works
and feels good.

- [x] Auth (email; Apple/Google Sign-In wired, needs provider setup in Supabase)
- [x] Habit CRUD
- [x] Verification: photo, timer, GPS (all working end-to-end)
- [x] Verification: AI photo review via `verify-image` Edge Function
- [x] Streak calculation (server-side trigger, not client-trusted)
- [x] XP/level/rank gamification
- [x] Badges (seeded, awarded manually for now — see Beta)
- [x] Basic social: friends, groups, challenges, global leaderboard
- [x] AI Coach chat (Edge Function, Claude/OpenAI)
- [ ] HealthKit / Health Connect (needs custom dev client — see `src/lib/health.ts`)
- [ ] Paywall / RevenueCat wiring (needs dev client)
- [ ] Push notifications via OneSignal (needs dev client)
- [x] Onboarding flow (4-slide intro shown once per device before sign-in)

**Exit criteria:** internal team + 10-20 friendly testers can create a
habit, submit proof daily for a week, and the streak/XP numbers are correct.

## Phase 2 — Beta

- Automatic badge awarding (triggers on streak milestones, not just seeded rows)
- HealthKit/Health Connect live (requires EAS dev client build)
- RevenueCat paywall live with the $7.99/mo, $59/yr products
- OneSignal habit reminder notifications (smart timing based on cadence)
- TestFlight + Play Internal Testing distribution via EAS
- Crash reporting (Sentry or Expo's built-in) wired into CI
- Analytics SDKs actually initialized (Mixpanel/PostHog/Firebase — currently
  a facade with TODOs in `src/lib/analytics.ts`)
- Closed beta of 100-500 users; instrument funnel from signup → first habit
  → first proof → day-2 return

**Exit criteria:** D1 retention measurable and trending toward the 50%
target; no P0 bugs in the verification flows; premium purchase flow works
end-to-end in sandbox.

## Phase 3 — Launch

- App Store + Play Store + Samsung Galaxy Store listings live (see
  `docs/DEPLOYMENT.md` and `docs/ASO.md`)
- ASO agent run against real store data, listing iterated pre-launch
- Launch content batch produced by the Content Creation agent, published
  manually (auto-publish needs per-platform approved posting APIs)
- Review Management agent live, monitoring App Store + Play Store reviews
  from day 1
- Support flow for verification disputes (a user thinks their proof was
  wrongly rejected)

**Exit criteria:** app is live in all three stores, review agent is
producing weekly triage reports, no unresolved P0/P1 from launch week.

## Phase 4 — Growth

- Growth agent running weekly against real TikTok/Instagram/YouTube data
  (requires approved developer apps on TikTok + Instagram — see
  `agents/growth-agent`)
- Referral / invite-a-friend loop (accountability groups are a natural fit)
- Challenge system expanded (public challenges, sponsored challenges)
- A/B testing framework for onboarding and paywall placement
- CAC tracked against LTV per channel; kill underperforming channels

**Exit criteria:** at least one repeatable paid or organic acquisition
channel with CAC < LTV; D30 retention trending toward 20%.

## Phase 5 — Scale

- Multi-region Supabase / read replicas if load requires it
- AI Coach personalization deepened (habit recommendation quality, longer
  memory of user history)
- Enterprise/team accountability groups (corporate wellness angle)
- Samsung Galaxy Store parity feature work if that channel proves out
- Full agent system running autonomously on schedule with human review only
  on flagged items

**Exit criteria:** the 4 success metrics (D1, D30, rating, CAC<LTV) are all
hit simultaneously and holding for 2+ consecutive months.
