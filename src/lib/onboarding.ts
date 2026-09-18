import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "piton:onboarding-complete";

/** Local-only flag (per device) — not tied to the account, so a signed-out
 * user isn't shown the intro slides again just because they signed out. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "true";
  } catch {
    return true; // fail open rather than trap the user in onboarding forever
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // best-effort; worst case the intro shows again next launch
  }
}
