/**
 * RevenueCat subscription integration — real native module code. Only
 * bundled for ios/android (see `revenuecat.web.ts` for the no-op web
 * variant). `react-native-purchases` / `react-native-purchases-ui` are
 * loaded lazily via `require()` and guarded, for the same reason as
 * `health.native.ts`: `initRevenueCat` is called from RootNavigator on
 * every app launch once a session exists, which is the always-mounted
 * root of the whole app — a top-level import would run at startup on
 * every iOS/Android launch, including under Expo Go where the native side
 * isn't compiled in, and a crash there would take down the entire app.
 *
 * Unverified against a real device build (no Xcode/Android SDK or
 * reachable EAS cloud build in this environment) — written directly from
 * RevenueCat's documented API.
 *
 * PREMIUM_ENTITLEMENT_ID must match the entitlement identifier configured
 * in the RevenueCat dashboard exactly — "piton_premium" here.
 * supabase/functions/revenuecat-webhook keeps profiles.is_premium in sync
 * server-side; nothing in this file writes to Supabase directly.
 */
import { Platform } from "react-native";

const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const PREMIUM_ENTITLEMENT_ID = "piton_premium";

export interface PaywallPackage {
  identifier: string;
  title: string;
  priceString: string;
}

export type PurchaseOutcome =
  | { status: "purchased"; isPremium: boolean }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type PaywallOutcome =
  "purchased" | "restored" | "cancelled" | "not_presented" | "error";

type PurchasesModule = typeof import("react-native-purchases").default;
type CustomerInfo = Awaited<ReturnType<PurchasesModule["getCustomerInfo"]>>;

function loadPurchases(): PurchasesModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-purchases").default as PurchasesModule;
  } catch {
    return null;
  }
}

function loadPurchasesUi(): {
  RevenueCatUI: typeof import("react-native-purchases-ui").default;
  PAYWALL_RESULT: typeof import("react-native-purchases-ui").PAYWALL_RESULT;
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-purchases-ui");
    return { RevenueCatUI: mod.default, PAYWALL_RESULT: mod.PAYWALL_RESULT };
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

function hasEntitlement(info: CustomerInfo): boolean {
  return (
    typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined"
  );
}

export async function isPremiumUnlocked(): Promise<boolean> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    return hasEntitlement(info);
  } catch {
    return false;
  }
}

/**
 * Subscribes to live entitlement changes (renewal, expiration, a purchase
 * made elsewhere) so UI can react without polling. Returns an unsubscribe
 * function; a no-op if the native module isn't available.
 */
export function subscribeToPremiumStatus(
  onChange: (isPremium: boolean) => void,
): () => void {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) return () => {};

  const listener = (info: CustomerInfo) => onChange(hasEntitlement(info));

  try {
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        // already torn down — nothing to do
      }
    };
  } catch {
    return () => {};
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
): Promise<PurchaseOutcome> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) {
    return {
      status: "error",
      message: "RevenueCat isn't available on this build.",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) => p.identifier === packageIdentifier,
    );
    if (!pkg) {
      return { status: "error", message: "That plan is no longer available." };
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: "purchased", isPremium: hasEntitlement(customerInfo) };
  } catch (err: unknown) {
    const cancelled =
      typeof err === "object" && err !== null && "userCancelled" in err
        ? Boolean((err as { userCancelled?: boolean }).userCancelled)
        : false;

    if (cancelled) return { status: "cancelled" };

    const message = err instanceof Error ? err.message : "Purchase failed.";
    return { status: "error", message };
  }
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  const Purchases = loadPurchases();
  if (!Purchases || !configured) {
    return {
      status: "error",
      message: "RevenueCat isn't available on this build.",
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { status: "purchased", isPremium: hasEntitlement(customerInfo) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Restore failed.";
    return { status: "error", message };
  }
}

/** Shows RevenueCat's own dashboard-configured paywall UI (optional — Piton's
 * default paywall is the hand-built PaywallScreen). Useful for gating a
 * specific premium feature inline without a navigation round-trip. */
export async function presentPaywallIfNeeded(): Promise<PaywallOutcome> {
  const ui = loadPurchasesUi();
  if (!ui || !configured) return "not_presented";

  try {
    const result = await ui.RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PREMIUM_ENTITLEMENT_ID,
    });
    return mapPaywallResult(result, ui.PAYWALL_RESULT);
  } catch {
    return "error";
  }
}

/** Opens RevenueCat's Customer Center — self-serve cancel/manage/restore,
 * configured entirely from the RevenueCat dashboard. */
export async function openCustomerCenter(): Promise<boolean> {
  const ui = loadPurchasesUi();
  if (!ui || !configured) return false;

  try {
    await ui.RevenueCatUI.presentCustomerCenter();
    return true;
  } catch {
    return false;
  }
}

function mapPaywallResult(
  result: string,
  PAYWALL_RESULT: Record<string, string>,
): PaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return "purchased";
    case PAYWALL_RESULT.RESTORED:
      return "restored";
    case PAYWALL_RESULT.CANCELLED:
      return "cancelled";
    case PAYWALL_RESULT.NOT_PRESENTED:
      return "not_presented";
    default:
      return "error";
  }
}
