// Server-side Supabase client using the SERVICE ROLE key.
// This bypasses row-level security, so it is ONLY ever used inside /api
// functions (never shipped to the browser). It lets the backend write
// transactions on behalf of a verified user.
import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Verify a user's access token (sent from the app) and return their user record.
export async function userFromToken(token) {
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error) return null;
  return data.user || null;
}
