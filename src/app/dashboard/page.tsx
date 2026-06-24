"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/personaforge/app-shell";
import { useForgeStore } from "@/lib/store";
import { OverviewView } from "@/components/views/overview-view";
import { UserExplorerView } from "@/components/views/user-explorer-view";
import { PersonaStudioView } from "@/components/views/persona-studio-view";
import { CausalAnalysisView } from "@/components/views/causal-analysis-view";
import { CounterfactualLabView } from "@/components/views/counterfactual-lab-view";
import { PersonalizationCenterView } from "@/components/views/personalization-center-view";
import { ExplainabilityView } from "@/components/views/explainability-view";
import { BanditOptimizerView } from "@/components/views/bandit-optimizer-view";
import { IdentityResolutionView } from "@/components/views/identity-resolution-view";
import { AiCopilotView } from "@/components/views/ai-copilot-view";
import { AgentConsoleView } from "@/components/views/agent-console-view";
import { LiveDemoMonitorView } from "@/components/views/live-demo-monitor-view";
import { TelegramFeedView } from "@/components/views/telegram-feed-view";

export default function Dashboard() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/login");
    },
  });

  const currentView = useForgeStore((s) => s.currentView);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  return (
    <AppShell>
      {currentView === "overview" && <OverviewView />}
      {currentView === "users" && <UserExplorerView />}
      {currentView === "personas" && <PersonaStudioView />}
      {currentView === "causal" && <CausalAnalysisView />}
      {currentView === "counterfactual" && <CounterfactualLabView />}
      {currentView === "personalization" && <PersonalizationCenterView />}
      {currentView === "explainability" && <ExplainabilityView />}
      {currentView === "bandit" && <BanditOptimizerView />}
      {currentView === "identity" && <IdentityResolutionView />}
      {currentView === "copilot" && <AiCopilotView />}
      {currentView === "agents" && <AgentConsoleView />}
      {currentView === "liveDemo" && <LiveDemoMonitorView />}
      {currentView === "telegram" && <TelegramFeedView />}
    </AppShell>
  );
}
