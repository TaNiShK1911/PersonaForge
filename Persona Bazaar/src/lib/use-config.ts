import { useQuery } from "@tanstack/react-query";
import { getPublicConfig, type PublicConfig } from "./config.functions";

export const configQueryKey = ["public-config"] as const;

export function useConfig() {
  return useQuery<PublicConfig>({
    queryKey: configQueryKey,
    queryFn: () => getPublicConfig(),
    staleTime: Infinity,
  });
}
