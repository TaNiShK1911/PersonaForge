// ============================================================
// PersonaForge — Supabase Client (server-side)
// ============================================================
// Singleton Supabase client for server-side operations including
// pgvector similarity search, storage, and direct SQL queries.
// Uses the service role key for full access.
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined;
};

function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — Supabase features disabled"
    );
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export const supabase: SupabaseClient | null =
  globalForSupabase.supabase ?? createSupabaseClient();

if (process.env.NODE_ENV !== "production" && supabase) {
  globalForSupabase.supabase = supabase;
}

/**
 * Check if Supabase is available for vector operations.
 */
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

/**
 * Run a vector similarity search using pgvector's match_embeddings function.
 * Falls back to returning empty results if Supabase is unavailable.
 */
export async function matchEmbeddings(
  queryEmbedding: number[],
  matchCount: number = 5,
  matchThreshold: number = 0.5,
  filterType?: string
): Promise<
  {
    id: string;
    document_type: string;
    document_id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }[]
> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      match_threshold: matchThreshold,
      filter_type: filterType ?? null,
    });

    if (error) {
      console.error("[supabase] match_embeddings error:", error);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("[supabase] match_embeddings failed:", err);
    return [];
  }
}
