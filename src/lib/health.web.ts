/**
 * Web fallback for HealthKit / Health Connect. There is no browser
 * equivalent of either, so this always reports "unavailable" — matching
 * the same shape `health.native.ts` returns on ios/android. See that file
 * for the real HealthKit/Health Connect implementation.
 */
export interface DailyActivitySummary {
  steps: number;
  activeEnergyKcal: number | null;
  workoutMinutes: number | null;
  source: "healthkit" | "health_connect" | "unavailable";
}

export async function isHealthDataAvailable(): Promise<boolean> {
  return false;
}

export async function requestHealthPermissions(): Promise<boolean> {
  return false;
}

export async function getTodayActivitySummary(): Promise<DailyActivitySummary> {
  return {
    steps: 0,
    activeEnergyKcal: null,
    workoutMinutes: null,
    source: "unavailable",
  };
}
