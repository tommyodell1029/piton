import { supabase } from "./supabase";

import type { Badge, LeaderboardEntry, UserProfile } from "@/types";

const RANKS = [
  { minLevel: 1, name: "Novice" },
  { minLevel: 5, name: "Climber" },
  { minLevel: 10, name: "Ascender" },
  { minLevel: 20, name: "Summiter" },
  { minLevel: 35, name: "Alpinist" },
  { minLevel: 50, name: "Piton Master" },
];

/** XP required to reach a given level follows a simple quadratic curve. */
export function xpForLevel(level: number): number {
  return 50 * level * level;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function rankForLevel(level: number): string {
  return [...RANKS].reverse().find((r) => level >= r.minLevel)!.name;
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  const xp = row.xp as number;
  const level = levelForXp(xp);
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    xp,
    level,
    rank: rankForLevel(level),
    isPremium: Boolean(row.is_premium),
  };
}

export async function getMyProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function listMyBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select("badges(*)")
    .order("earned_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.badges.id,
    code: row.badges.code,
    title: row.badges.title,
    description: row.badges.description,
    iconUrl: row.badges.icon_url ?? null,
  }));
}

export async function getGlobalLeaderboard(
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, xp")
    .order("xp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    userId: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    xp: row.xp,
    rank: index + 1,
  }));
}
