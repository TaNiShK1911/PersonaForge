import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function configureSupabase(url: string | null, anonKey: string | null) {
  if (typeof window === "undefined") return null;
  if (!url || !anonKey) return null;
  if (client) return client;
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

export function getSupabase() {
  return client;
}
