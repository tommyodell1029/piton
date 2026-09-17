/**
 * OneSignal push notification integration.
 *
 * Uses expo-notifications for the local permission prompt / device token,
 * and forwards the token to OneSignal (via `react-native-onesignal`, added
 * once EXPO_PUBLIC_ONESIGNAL_APP_ID is set and a dev client / EAS build is
 * used — the OneSignal native SDK isn't available in Expo Go).
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

export async function initNotifications() {
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
  }

  // TODO: OneSignal.initialize(oneSignalAppId) once react-native-onesignal is
  // added and the app is running a custom dev client / EAS build.
}

export const HABIT_REMINDER_CATEGORY = "habit_reminder";
