/**
 * RevenueCat subscription integration — real native module code. Only
 * bundled for ios/android (see `revenuecat.web.ts` for the no-op web
 * variant). `react-native-purchases` is loaded lazily via `require()` and
 * guarded, for the same reason as `health.native.ts`: `initRevenueCat` is
 * called from RootNavigator on every app launch once a session exists,
 * which is the always-mounted root of the whole app — a top-level import
 * would run at startup on every iOS/Android launch, including under Expo
 * Go where the native side isn't compiled in, and a crash there would take
 * down the entire app.
 *
 * Unverified against a real device build (no Xcode/Android SDK or
 * reachable EAS cloud build in this environment) — written directly from
 * RevenueCat's documented API.
 */
import { Platform } from "react-native";

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const PREMIUM_ENTITLEMENT_ID = "premium";

export interface PaywallPackage {
  identifier: string;
  title: string;
  priceString: string;
}

type PurchasesModule = typeof import("react-native-purchases").default;

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    return null;
  }
}

let configured = false;

export async function initRevenueCat(appUserId: string): Promise<void> {
  const key = Platform.OS === "ios" ? iosKey : androidKey;
  if (!key) {
    console.log("[revenuecat] no API key configured, skipping init");
    return;
  }

  const Purchases = loadPurchases();
  if (!Purchases) {
    console.log(
      "[revenuecat] native module unavailable (needs an EAS dev client build)",
    );
    return;
  }

  try {
    Purchases.configure({ apiKey: key, appUserID: appUserId });
    configured = true;
  } catch (err) {
    console.log("[revenuecat] configure failed:", err);
  }
}

export async function isPremiumUnlocked(): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    return (
      typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined"
    );
  } catch {
    return false;
  }
}

export async function getPaywallPackages(): Promise<PaywallPackage[]> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) return [];

  try {
    const offerings = await Purchases.getOfferings();
    return (offerings.current?.availablePackages ?? []).map((pkg) => ({
      identifier: pkg.identifier,
      title: pkg.product.title,
      priceString: pkg.product.priceString,
    }));
  } catch {
    return [];
  }
}

export async function purchasePackageById(
  packageIdentifier: string,
): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) return false;

  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.identifier === packageIdentifier,
    );
    if (!pkg) return false;

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return (
      typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !==
      "undefined"
    );
  } catch {
    return false;
  }
}
