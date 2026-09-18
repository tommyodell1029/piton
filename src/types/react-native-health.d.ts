// react-native-health ships no TypeScript types and there's no @types
// package for it, so this covers only the surface Piton actually calls.
declare module "react-native-health" {
  export interface HealthValue {
    value: number;
    startDate: string;
    endDate: string;
  }

  export interface HealthInputOptions {
    startDate?: string;
    endDate?: string;
    unit?: string;
  }

  export interface HealthKitPermissions {
    permissions: {
      read: string[];
      write: string[];
    };
  }

  interface AppleHealthKitType {
    Constants: {
      Permissions: Record<string, string>;
    };
    initHealthKit(
      permissions: HealthKitPermissions,
      callback: (error: string) => void,
    ): void;
    isAvailable(callback: (error: object, available: boolean) => void): void;
    getStepCount(
      options: HealthInputOptions,
      callback: (error: string, results: HealthValue) => void,
    ): void;
    getActiveEnergyBurned(
      options: HealthInputOptions,
      callback: (error: string, results: HealthValue[]) => void,
    ): void;
    getAppleExerciseTime(
      options: HealthInputOptions,
      callback: (error: string, results: HealthValue[]) => void,
    ): void;
  }

  const AppleHealthKit: AppleHealthKitType;
  export default AppleHealthKit;
}
