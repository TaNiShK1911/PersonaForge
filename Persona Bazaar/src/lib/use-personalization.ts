import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchPersonalization, getUserId, isConfigured } from "./personaforge-sdk";
import { savePersonalizationSnapshot } from "./persistence";

export function usePersonalization() {
  const q = useQuery({
    queryKey: ["personalization"],
    queryFn: fetchPersonalization,
    enabled: typeof window !== "undefined" && isConfigured(),
    // Auto-refresh every 30s so the homepage stays live as events flow in.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 25_000,
  });

  // Persist each snapshot for analytics / debugging.
  useEffect(() => {
    if (!q.data) return;
    savePersonalizationSnapshot(q.data, getUserId()).catch(() => {});
  }, [q.data]);

  return q;
}
