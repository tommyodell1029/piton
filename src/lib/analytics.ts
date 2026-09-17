/**
 * Thin, provider-agnostic analytics facade. Each track() call fans out to
 * whichever providers have keys configured, so screens only ever import
 * from here — never the vendor SDKs directly.
 */
type EventProperties = Record<string, string | number | boolean | null>;

const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (mixpanelToken) {
    // TODO: import { Mixpanel } from "mixpanel-react-native" and init here.
    console.log("[analytics] Mixpanel configured, ready to init SDK.");
  }
  if (posthogKey) {
    // TODO: import PostHog from "posthog-react-native" and init here.
    console.log("[analytics] PostHog configured, ready to init SDK.");
  }
  if (firebaseProjectId) {
    // TODO: import analytics from "@react-native-firebase/analytics".
    console.log(
      "[analytics] Firebase Analytics configured, ready to init SDK.",
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature documents the eventual provider fan-out
export function identify(userId: string, traits: EventProperties = {}) {
  // TODO: once initialized, fan out to Mixpanel.identify / PostHog.identify / Firebase setUserId.
}

export function track(event: string, properties: EventProperties = {}) {
  if (!initialized) {
    if (__DEV__) console.log(`[analytics:noop] ${event}`, properties);
    return;
  }
  // TODO: fan out to each configured provider's track/capture/logEvent call.
  if (__DEV__) console.log(`[analytics] ${event}`, properties);
}

/** Standard event names kept in one place so agents (PM/Growth/Analytics) can rely on them. */
export const AnalyticsEvents = {
  HABIT_CREATED: "habit_created",
  VERIFICATION_SUBMITTED: "verification_submitted",
  VERIFICATION_APPROVED: "verification_approved",
  STREAK_EXTENDED: "streak_extended",
  STREAK_BROKEN: "streak_broken",
  PAYWALL_VIEWED: "paywall_viewed",
  SUBSCRIPTION_STARTED: "subscription_started",
  AI_COACH_MESSAGE_SENT: "ai_coach_message_sent",
} as const;
