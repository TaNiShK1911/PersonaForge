import { createServerFn } from "@tanstack/react-start";

export type PublicConfig = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  personaforgeUrl: string | null;
  personaforgeKey: string | null;
};

// Reads both the canonical NEXT_PUBLIC_* names (per the PersonaForge plan) and
// the older PUBLIC_* names as a fallback so existing deployments keep working.
function pick(...names: string[]): string | null {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export const getPublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicConfig> => {
    return {
      supabaseUrl: pick("NEXT_PUBLIC_SUPABASE_URL", "PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
      supabaseAnonKey: pick(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_PUBLISHABLE_KEY",
      ),
      personaforgeUrl: pick("NEXT_PUBLIC_PERSONAFORGE_URL", "PERSONAFORGE_URL"),
      personaforgeKey: pick("NEXT_PUBLIC_PERSONAFORGE_KEY", "PERSONAFORGE_KEY"),
    };
  },
);
