/**
 * HealthKit (iOS) / Health Connect (Android) integration.
 *
 * Expo Go cannot access HealthKit or Health Connect — both require native
 * modules that only work in a custom development client or a bare/EAS build.
 * This module defines the interface the rest of the app codes against so
 * screens don't need to change once the native module is wired in.
 *
 * To make this real:
 *   iOS:     add `react-native-health` + an Expo config plugin, and the
 *            `com.apple.developer.healthkit` entitlement (already set in
 *            app.json).
 *   Android: add `react-native-health-connect`, and declare the
 *            `android.permission.health.READ_STEPS` /
 *            `READ_EXERCISE` permissions plus the Health Connect
 *            permissions rationale activity.
 */
import { Platform } from "react-native";

export interface DailyActivitySummary {
  steps: number;
  activeEnergyKcal: number | null;
  workoutMinutes: number | null;
  source: "healthkit" | "health_connect" | "unavailable";
}

export async function isHealthDataAvailable(): Promise<boolean> {
  // TODO: replace with AppleHealthKit.isAvailable / HealthConnectClient.getSdkStatus
  return false;
}

export async function requestHealthPermissions(): Promise<boolean> {
  // TODO: request read permissions for steps + workouts on each platform.
  return false;
}

export async function getTodayActivitySummary(): Promise<DailyActivitySummary> {
  const available = await isHealthDataAvailable();
  if (!available) {
    return {
      steps: 0,
      activeEnergyKcal: null,
      workoutMinutes: null,
      source: "unavailable",
    };
  }

  // TODO: query native HealthKit / Health Connect APIs for today's totals.
  return {
    steps: 0,
    activeEnergyKcal: null,
    workoutMinutes: null,
    source: Platform.OS === "ios" ? "healthkit" : "health_connect",
  };
}
