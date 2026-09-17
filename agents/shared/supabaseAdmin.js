import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase client using the service role key (bypasses RLS).
 * Agents run in GitHub Actions / a trusted server context only — this key
 * must never be shipped to the mobile app.
 */
export function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    return null;
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
