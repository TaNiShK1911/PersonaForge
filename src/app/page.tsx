"use client";

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

export default function Home() {
  const currentView = useForgeStore((s) => s.currentView);

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
    </AppShell>
  );
}
