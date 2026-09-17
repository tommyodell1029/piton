import { supabase } from "./supabase";

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The AI Coach never calls OpenAI/Claude directly from the client — that
 * would ship API keys inside the app bundle. Instead it invokes the
 * `ai-coach` Supabase Edge Function (see supabase/functions/ai-coach),
 * which holds OPENAI_API_KEY / ANTHROPIC_API_KEY as server-side secrets,
 * pulls the user's recent habits/streaks for context, and returns a reply.
 */
export async function sendCoachMessage(
  history: CoachMessage[],
  newMessage: string,
): Promise<CoachMessage> {
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { history, message: newMessage },
  });
  if (error) throw error;
  return { role: "assistant", content: data.reply as string };
}

export async function getDailyMotivation(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { mode: "daily_motivation" },
  });
  if (error) throw error;
  return data.reply as string;
}

export async function getHabitRecommendations(): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke("ai-coach", {
    body: { mode: "habit_recommendations" },
  });
  if (error) throw error;
  return (data.recommendations as string[]) ?? [];
}
