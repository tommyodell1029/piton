import { supabase } from "./supabase";

import type { AccountabilityGroup, Challenge } from "@/types";

export interface Friend {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: "pending" | "accepted";
}

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      "status, friend:profiles!friendships_friend_id_fkey(id, display_name, avatar_url)",
    )
    .eq("status", "accepted");

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    userId: row.friend.id,
    displayName: row.friend.display_name,
    avatarUrl: row.friend.avatar_url,
    status: row.status,
  }));
}

export async function sendFriendRequest(friendUserId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in.");

  const { error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id: friendUserId, status: "pending" });
  if (error) throw error;
}

export async function listMyGroups(): Promise<AccountabilityGroup[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("groups(id, name, owner_id, member_count)");

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.groups.id,
    name: row.groups.name,
    ownerId: row.groups.owner_id,
    memberCount: row.groups.member_count,
  }));
}

export async function createGroup(name: string): Promise<AccountabilityGroup> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in.");

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("group_members")
    .insert({ group_id: data.id, user_id: user.id });

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    memberCount: 1,
  };
}

export async function listActiveChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .lte("start_date", new Date().toISOString())
    .gte("end_date", new Date().toISOString());

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    habitCategory: row.habit_category,
    startDate: row.start_date,
    endDate: row.end_date,
  }));
}
