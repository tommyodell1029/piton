/**
 * Web fallback for RevenueCat. In-app purchases don't exist on web, so
 * this always reports no premium and no purchasable packages — matching
 * the same shape `revenuecat.native.ts` exposes on ios/android. See that
 * file for the real RevenueCat implementation.
 */
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as revenuecat.native.ts
export async function initRevenueCat(appUserId: string): Promise<void> {}

export async function isPremiumUnlocked(): Promise<boolean> {
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as revenuecat.native.ts
export function subscribeToPremiumStatus(
  onChange: (isPremium: boolean) => void,
): () => void {
  return () => {};
}

export async function getPaywallPackages(): Promise<PaywallPackage[]> {
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as revenuecat.native.ts
export async function purchasePackageById(
  packageIdentifier: string,
): Promise<PurchaseOutcome> {
  return { status: "error", message: "Purchases aren't available on web." };
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  return { status: "error", message: "Purchases aren't available on web." };
}

export async function presentPaywallIfNeeded(): Promise<PaywallOutcome> {
  return "not_presented";
}

export async function openCustomerCenter(): Promise<boolean> {
  return false;
}
