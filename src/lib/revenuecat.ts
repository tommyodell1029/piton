/**
 * RevenueCat subscription integration. Requires `react-native-purchases`
 * (not included in Expo Go — needs a dev client / EAS build) plus the
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY keys
 * from the RevenueCat dashboard, where the `piton_premium_monthly`
 * ($7.99/mo) and `piton_premium_annual` ($59/yr) products should be
 * configured as a single "premium" entitlement.
 */
import { Platform } from "react-native";

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const PREMIUM_ENTITLEMENT_ID = "premium";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- appUserId is used once react-native-purchases is wired in
export async function initRevenueCat(appUserId: string) {
  const key = Platform.OS === "ios" ? iosKey : androidKey;
  if (!key) {
    console.log("[revenuecat] no API key configured, skipping init");
    return; // eslint-disable-line no-useless-return -- guards the TODO below once it's implemented
  }
  // TODO: import Purchases from "react-native-purchases";
  // Purchases.configure({ apiKey: key, appUserID: appUserId });
}

export async function isPremiumUnlocked(): Promise<boolean> {
  // TODO: const info = await Purchases.getCustomerInfo();
  // return typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
  return false;
}

export async function presentPaywallIfNeeded(): Promise<void> {
  // TODO: use react-native-purchases-ui's presentPaywallIfNeeded, or a custom
  // paywall screen driven by Purchases.getOfferings().
}
