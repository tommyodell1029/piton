/**
 * Web fallback for push notifications. expo-notifications has partial web
 * support (browser notification permission), so that part stays shared
 * behavior; OneSignal has no web SDK path here, so `initNotifications`
 * just handles the browser permission prompt and stops. See
 * `notifications.native.ts` for the real OneSignal implementation.
 */
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the same signature as notifications.native.ts
export async function initNotifications(userId?: string) {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[notifications] permission not granted");
  }
}

export const HABIT_REMINDER_CATEGORY = "habit_reminder";
