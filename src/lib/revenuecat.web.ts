/**
 * Web fallback for RevenueCat. In-app purchases don't exist on web, so
 * this always reports no premium and no purchasable packages — matching
 * the same shape `revenuecat.native.ts` exposes on ios/android. See that
 * file for the real RevenueCat implementation.
 */
export const PREMIUM_ENTITLEMENT_ID = "premium";

export interface PaywallPackage {
  identifier: string;
  title: string;
  priceString: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as revenuecat.native.ts
export async function initRevenueCat(appUserId: string): Promise<void> {}

export async function isPremiumUnlocked(): Promise<boolean> {
  return false;
}

export async function getPaywallPackages(): Promise<PaywallPackage[]> {
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as revenuecat.native.ts
export async function purchasePackageById(
  packageIdentifier: string,
): Promise<boolean> {
  return false;
}
