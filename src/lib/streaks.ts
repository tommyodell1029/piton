import { supabase } from "./supabase";

import type { Streak, StreakCadence } from "@/types";

function rowToStreak(row: Record<string, unknown>): Streak {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    userId: row.user_id as string,
    cadence: row.cadence as StreakCadence,
    currentCount: row.current_count as number,
    bestCount: row.best_count as number,
    lastCompletedAt: (row.last_completed_at as string) ?? null,
  };
}

/**
 * Streak increments are computed server-side by the
 * `bump_streak_on_verification` Postgres trigger (see
 * supabase/migrations/0001_init.sql) whenever a habit_verification row is
 * inserted with status = 'approved'. This keeps the streak logic
 * authoritative in the database instead of trusting the client.
 */
export async function getStreakForHabit(
  habitId: string,
): Promise<Streak | null> {
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("habit_id", habitId)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToStreak(data) : null;
}

export async function listMyStreaks(): Promise<Streak[]> {
  const { data, error } = await supabase.from("streaks").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToStreak);
}
