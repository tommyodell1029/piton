/**
 * HealthKit (iOS) / Health Connect (Android) integration — real native
 * module code. Only ever bundled for ios/android (Metro resolves this file
 * ahead of the plain `health.ts` for those platforms); `health.web.ts`
 * covers web instead, so neither platform's bundle ever touches the
 * other's native module.
 *
 * The actual native packages are loaded lazily via `require()` inside each
 * function — never as a top-level `import` — and every load is wrapped in
 * try/catch. That matters because these screens are part of the
 * always-mounted navigator tree: a top-level import would run at app
 * startup on EVERY iOS/Android launch, including under Expo Go where the
 * native (Swift/Kotlin) side of these packages isn't compiled in. A crash
 * there would take down the whole app, not just the health features. With
 * lazy, guarded loading, a missing native module degrades to "unavailable"
 * (see health.web.ts's identical fallback) instead.
 *
 * Consequence: this is unverified against a real device build. It's
 * written directly from each package's documented API, not exercised on
 * hardware — there's no Xcode/Android SDK or reachable EAS cloud build in
 * this environment to produce or run a custom development client.
 */
import { Platform } from "react-native";

export interface DailyActivitySummary {
  steps: number;
  activeEnergyKcal: number | null;
  workoutMinutes: number | null;
  source: "healthkit" | "health_connect" | "unavailable";
}

const UNAVAILABLE: DailyActivitySummary = {
  steps: 0,
  activeEnergyKcal: null,
  workoutMinutes: null,
  source: "unavailable",
};

type AppleHealthKitModule = typeof import("react-native-health").default;
type HealthConnectModule = typeof import("react-native-health-connect");

function loadAppleHealthKit(): AppleHealthKitModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-health").default as AppleHealthKitModule;
  } catch {
    return null;
  }
}

function loadHealthConnect(): HealthConnectModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-health-connect") as HealthConnectModule;
  } catch {
    return null;
  }
}

function startOfTodayIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

// ---- iOS: HealthKit ----

function initHealthKitAsync(kit: AppleHealthKitModule): Promise<boolean> {
  return new Promise((resolve) => {
    const permissions = {
      permissions: {
        read: [
          kit.Constants.Permissions.Steps,
          kit.Constants.Permissions.ActiveEnergyBurned,
          kit.Constants.Permissions.AppleExerciseTime,
        ],
        write: [],
      },
    };
    try {
      kit.initHealthKit(permissions, (error) => resolve(!error));
    } catch {
      resolve(false);
    }
  });
}

function isHealthKitAvailableAsync(
  kit: AppleHealthKitModule,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      kit.isAvailable((err, available) => resolve(!err && available));
    } catch {
      resolve(false);
    }
  });
}

function getHealthKitTodaySummary(
  kit: AppleHealthKitModule,
): Promise<DailyActivitySummary> {
  const options = { startDate: startOfTodayIso() };

  const steps = new Promise<number>((resolve) => {
    try {
      kit.getStepCount(options, (err, result) =>
        resolve(err ? 0 : result.value),
      );
    } catch {
      resolve(0);
    }
  });
  const activeEnergy = new Promise<number>((resolve) => {
    try {
      kit.getActiveEnergyBurned(options, (err, results) =>
        resolve(err ? 0 : results.reduce((sum, r) => sum + r.value, 0)),
      );
    } catch {
      resolve(0);
    }
  });
  const exerciseMinutes = new Promise<number>((resolve) => {
    try {
      kit.getAppleExerciseTime(options, (err, results) =>
        resolve(err ? 0 : results.reduce((sum, r) => sum + r.value, 0)),
      );
    } catch {
      resolve(0);
    }
  });

  return Promise.all([steps, activeEnergy, exerciseMinutes]).then(
    ([stepsValue, activeEnergyValue, exerciseMinutesValue]) => ({
      steps: Math.round(stepsValue),
      activeEnergyKcal: Math.round(activeEnergyValue),
      workoutMinutes: Math.round(exerciseMinutesValue),
      source: "healthkit",
    }),
  );
}

// ---- Android: Health Connect ----

async function isHealthConnectAvailableAsync(
  hc: HealthConnectModule,
): Promise<boolean> {
  try {
    const status = await hc.getSdkStatus();
    return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

async function initHealthConnectAsync(
  hc: HealthConnectModule,
): Promise<boolean> {
  try {
    const ready = await hc.initialize();
    if (!ready) return false;
    await hc.requestPermission([
      { accessType: "read", recordType: "Steps" },
      { accessType: "read", recordType: "ActiveCaloriesBurned" },
      { accessType: "read", recordType: "ExerciseSession" },
    ]);
    return true;
  } catch {
    return false;
  }
}

async function getHealthConnectTodaySummary(
  hc: HealthConnectModule,
): Promise<DailyActivitySummary> {
  const timeRangeFilter = {
    operator: "between" as const,
    startTime: startOfTodayIso(),
    endTime: new Date().toISOString(),
  };

  try {
    const [stepsResult, caloriesResult, exerciseResult] = await Promise.all([
      hc.readRecords("Steps", { timeRangeFilter }),
      hc.readRecords("ActiveCaloriesBurned", { timeRangeFilter }),
      hc.readRecords("ExerciseSession", { timeRangeFilter }),
    ]);

    const steps = stepsResult.records.reduce((sum, r) => sum + r.count, 0);
    const activeEnergyKcal = caloriesResult.records.reduce(
      (sum, r) => sum + r.energy.inKilocalories,
      0,
    );
    const workoutMinutes = exerciseResult.records.reduce((sum, r) => {
      const durationMs =
        new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
      return sum + durationMs / 60000;
    }, 0);

    return {
      steps: Math.round(steps),
      activeEnergyKcal: Math.round(activeEnergyKcal),
      workoutMinutes: Math.round(workoutMinutes),
      source: "health_connect",
    };
  } catch {
    return UNAVAILABLE;
  }
}

// ---- Shared interface ----

export async function isHealthDataAvailable(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const kit = loadAppleHealthKit();
    return kit ? isHealthKitAvailableAsync(kit) : false;
  }
  if (Platform.OS === "android") {
    const hc = loadHealthConnect();
    return hc ? isHealthConnectAvailableAsync(hc) : false;
  }
  return false;
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const kit = loadAppleHealthKit();
    return kit ? initHealthKitAsync(kit) : false;
  }
  if (Platform.OS === "android") {
    const hc = loadHealthConnect();
    return hc ? initHealthConnectAsync(hc) : false;
  }
  return false;
}

export async function getTodayActivitySummary(): Promise<DailyActivitySummary> {
  if (Platform.OS === "ios") {
    const kit = loadAppleHealthKit();
    if (!kit || !(await isHealthKitAvailableAsync(kit))) return UNAVAILABLE;
    return getHealthKitTodaySummary(kit);
  }
  if (Platform.OS === "android") {
    const hc = loadHealthConnect();
    if (!hc || !(await isHealthConnectAvailableAsync(hc))) return UNAVAILABLE;
    return getHealthConnectTodaySummary(hc);
  }
  return UNAVAILABLE;
}
