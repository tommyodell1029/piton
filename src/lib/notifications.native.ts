/**
 * Push notifications — real OneSignal integration. Only bundled for
 * ios/android (see `notifications.web.ts` for the web variant). The
 * expo-notifications permission dance is safe to run unconditionally on
 * every platform (it's already been in use), but `react-native-onesignal`
 * is loaded lazily via `require()` and guarded — for the same reason as
 * `health.native.ts` and `revenuecat.native.ts`: `initNotifications` runs
 * from RootNavigator on every app launch once a session exists, the
 * always-mounted root of the app, so a top-level import would execute at
 * startup on every iOS/Android launch, including under Expo Go where the
 * native side isn't compiled in.
 *
 * Unverified against a real device build (no Xcode/Android SDK or
 * reachable EAS cloud build in this environment) — written directly from
 * OneSignal's documented API.
 */
import * as Notifications from "expo-notifications";

const oneSignalAppId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type OneSignalModule = typeof import("react-native-onesignal").OneSignal;

function loadOneSignal(): OneSignalModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-onesignal").OneSignal as OneSignalModule;
  } catch {
    return null;
  }
}

export async function initNotifications(userId?: string) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[notifications] permission not granted");
    return;
  }

  if (!oneSignalAppId) {
    console.log(
      "[notifications] OneSignal app id not configured, skipping SDK init",
    );
    return;
  }

  const OneSignal = loadOneSignal();
  if (!OneSignal) {
    console.log(
      "[notifications] OneSignal native module unavailable (needs an EAS dev client build)",
    );
    return;
  }

  try {
    OneSignal.initialize(oneSignalAppId);
    await OneSignal.Notifications.requestPermission(false);
    if (userId) {
      OneSignal.login(userId);
    }
  } catch (err) {
    console.log("[notifications] OneSignal init failed:", err);
  }
}

export const HABIT_REMINDER_CATEGORY = "habit_reminder";
