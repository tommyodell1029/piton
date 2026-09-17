import { supabase } from "./supabase";

import type { HabitVerification, VerificationMethod } from "@/types";

const PROOFS_BUCKET = "proofs";

function rowToVerification(row: Record<string, unknown>): HabitVerification {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    userId: row.user_id as string,
    submittedAt: row.submitted_at as string,
    method: row.method as VerificationMethod,
    status: row.status as HabitVerification["status"],
    proofUrl: (row.proof_url as string) ?? null,
    proofMetadata: (row.proof_metadata as Record<string, unknown>) ?? null,
    aiConfidence: (row.ai_confidence as number) ?? null,
  };
}

async function insertVerification(params: {
  habitId: string;
  userId: string;
  method: VerificationMethod;
  proofUrl?: string | null;
  proofMetadata?: Record<string, unknown> | null;
  status?: HabitVerification["status"];
}): Promise<HabitVerification> {
  const { data, error } = await supabase
    .from("habit_verifications")
    .insert({
      habit_id: params.habitId,
      user_id: params.userId,
      method: params.method,
      proof_url: params.proofUrl ?? null,
      proof_metadata: params.proofMetadata ?? null,
      status: params.status ?? "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return rowToVerification(data);
}

/**
 * Uploads a local photo (from expo-camera / expo-image-picker) to Supabase
 * Storage, then optionally routes it through the `verify-image` Edge Function
 * for AI-assisted review before marking the verification approved/pending.
 */
export async function submitPhotoVerification(
  habitId: string,
  localUri: string,
  options: { useAiReview?: boolean } = {},
): Promise<HabitVerification> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to submit a verification.");

  const fileExt = localUri.split(".").pop() ?? "jpg";
  const path = `${user.id}/${habitId}/${Date.now()}.${fileExt}`;

  // Reading the local file through fetch()->blob() (rather than base64 +
  // manual decoding) avoids relying on atob/Buffer, neither of which is
  // guaranteed to exist in the React Native runtime.
  const fileResponse = await fetch(localUri);
  const blob = await fileResponse.blob();

  const { error: uploadError } = await supabase.storage
    .from(PROOFS_BUCKET)
    .upload(path, blob, {
      contentType: `image/${fileExt}`,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROOFS_BUCKET).getPublicUrl(path);

  let status: HabitVerification["status"] = "pending";
  let aiConfidence: number | null = null;

  if (options.useAiReview) {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "verify-image",
      { body: { habitId, imageUrl: publicUrl } },
    );
    if (!fnError && fnData) {
      aiConfidence = fnData.confidence ?? null;
      status = fnData.approved ? "approved" : "pending";
    }
  }

  const verification = await insertVerification({
    habitId,
    userId: user.id,
    method: options.useAiReview ? "ai_image" : "photo",
    proofUrl: publicUrl,
    status,
  });

  if (aiConfidence !== null) {
    await supabase
      .from("habit_verifications")
      .update({ ai_confidence: aiConfidence })
      .eq("id", verification.id);
  }

  return verification;
}

export async function submitTimerVerification(
  habitId: string,
  durationSeconds: number,
): Promise<HabitVerification> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to submit a verification.");

  return insertVerification({
    habitId,
    userId: user.id,
    method: "timer",
    proofMetadata: { durationSeconds },
    status: "approved",
  });
}

export async function submitGpsVerification(
  habitId: string,
  coords: { latitude: number; longitude: number; accuracy: number | null },
): Promise<HabitVerification> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to submit a verification.");

  return insertVerification({
    habitId,
    userId: user.id,
    method: "gps",
    proofMetadata: { ...coords },
    status: "approved",
  });
}

export async function submitStepCountVerification(
  habitId: string,
  steps: number,
): Promise<HabitVerification> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be signed in to submit a verification.");

  return insertVerification({
    habitId,
    userId: user.id,
    method: "step_count",
    proofMetadata: { steps },
    status: "approved",
  });
}

export async function listVerificationsForHabit(
  habitId: string,
): Promise<HabitVerification[]> {
  const { data, error } = await supabase
    .from("habit_verifications")
    .select("*")
    .eq("habit_id", habitId)
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToVerification);
}
