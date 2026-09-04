import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the project is not configured the app falls back to the built-in
// email/password auth of the Express API, so local development and the demo
// build keep working with no Supabase account.
export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const supabaseEnabled = Boolean(supabase);

export async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
