import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the whole app. Reads the project URL and
 * anon (public) key from Vite env vars — see .env.example.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail loudly in dev rather than silently making requests to "undefined".
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Throws a plain Error with the Postgres/RPC message, so screens that
 * already do `catch (err) { setError(err.message) }` keep working. */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message || "Request failed");
  return data;
}
