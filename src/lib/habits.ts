import { supabase } from "./supabase";

import type {
  Habit,
  HabitCategory,
  StreakCadence,
  VerificationMethod,
} from "@/types";

interface CreateHabitInput {
  title: string;
  category: HabitCategory;
  verificationMethod: VerificationMethod;
  cadence: StreakCadence;
  targetValue?: number;
  targetUnit?: string;
}

function rowToHabit(row: Record<string, unknown>): Habit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    category: row.category as HabitCategory,
    verificationMethod: row.verification_method as VerificationMethod,
    cadence: row.cadence as StreakCadence,
    targetValue: (row.target_value as number) ?? null,
    targetUnit: (row.target_unit as string) ?? null,
    createdAt: row.created_at as string,
    archivedAt: (row.archived_at as string) ?? null,
  };
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to create a habit.");

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      title: input.title,
      category: input.category,
      verification_method: input.verificationMethod,
      cadence: input.cadence,
      target_value: input.targetValue ?? null,
      target_unit: input.targetUnit ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToHabit(data);
}

export async function listMyHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToHabit);
}

export async function archiveHabit(habitId: string): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) throw error;
}
