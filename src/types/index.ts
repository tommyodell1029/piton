export type VerificationMethod =
  | "healthkit"
  | "health_connect"
  | "photo"
  | "gps"
  | "timer"
  | "step_count"
  | "workout"
  | "ai_image"
  | "manual_ai_review";

export type HabitCategory = "fitness" | "reading" | "meditation" | "custom";

export type StreakCadence = "daily" | "weekly" | "monthly";

export interface Habit {
  id: string;
  userId: string;
  title: string;
  category: HabitCategory;
  verificationMethod: VerificationMethod;
  cadence: StreakCadence;
  targetValue: number | null;
  targetUnit: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface HabitVerification {
  id: string;
  habitId: string;
  userId: string;
  submittedAt: string;
  method: VerificationMethod;
  status: "pending" | "approved" | "rejected";
  proofUrl: string | null;
  proofMetadata: Record<string, unknown> | null;
  aiConfidence: number | null;
}

export interface Streak {
  id: string;
  habitId: string;
  userId: string;
  cadence: StreakCadence;
  currentCount: number;
  bestCount: number;
  lastCompletedAt: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  rank: string;
  isPremium: boolean;
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  iconUrl: string | null;
}

export interface AccountabilityGroup {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
}

export interface Challenge {
  id: string;
  groupId: string | null;
  title: string;
  habitCategory: HabitCategory;
  startDate: string;
  endDate: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  rank: number;
}
