import { Sparkles } from "lucide-react";
import { useConfig } from "@/lib/use-config";

export function PersonaForgeBadge() {
  const { data } = useConfig();
  const href = data?.personaforgeUrl ? `${data.personaforgeUrl}/dashboard` : "https://personaforge.app";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-foreground/90 px-3.5 py-2 text-xs font-medium text-background shadow-lg backdrop-blur transition hover:bg-foreground"
    >
      <Sparkles className="h-3.5 w-3.5 text-coral" />
      Powered by PersonaForge
    </a>
  );
}
