// PersonaForge — Global Zustand Store
// Holds the seeded dataset + derived ML artifacts + UI state.
// All expensive computations are memoized via lazy initialization.
// ============================================================

import { create } from "zustand";
import {
  BanditState,
  CausalEffect,
  CausalGraph,
  Explanation,
  Persona,
  PersonalizationOutput,
  User,
} from "@/lib/types";
import { generateDataset, Dataset } from "@/lib/data/generator";
import { buildPersonas } from "@/lib/ml/persona";
import { estimateAllCausalEffects, buildCausalGraph } from "@/lib/ml/causal";
import {
  createBanditState,
  stepBandit,
  runBanditEpisodes,
} from "@/lib/ml/bandit";
import { generateExplanation, generatePersonalization } from "@/lib/ai/content";

export type ViewId =
  | "overview"
  | "users"
  | "personas"
  | "causal"
  | "counterfactual"
  | "personalization"
  | "explainability"
  | "bandit"
  | "identity"
  | "copilot"
  | "agents"
  | "liveDemo"
  | "telegram";

interface PersonaForgeState {
  // data
  dataset: Dataset;
  personas: Persona[];
  causalEffects: CausalEffect[];
  causalGraph: CausalGraph;

  // ui
  currentView: ViewId;
  selectedUserId: string | null;
  themeReady: boolean;

  // bandit
  bandit: BanditState;

  // actions
  setView: (v: ViewId) => void;
  selectUser: (id: string | null) => void;
  stepBanditOnce: () => void;
  stepBanditMany: (n: number) => void;
  resetBandit: () => void;

  // derived getters
  getUser: (id: string) => User | undefined;
  getPersonalization: (userId: string) => PersonalizationOutput | null;
  getExplanation: (userId: string) => Explanation | null;
}

// Compute all derived artifacts ONCE per dataset
function buildDerived(dataset: Dataset) {
  const personas = buildPersonas(dataset.users, 6);
  const causalEffects = estimateAllCausalEffects(dataset.users);
  const causalGraph = buildCausalGraph(causalEffects);
  return { personas, causalEffects, causalGraph };
}

// Initialize lazily on first store creation (browser-only)
function initDataset(): Dataset {
  // Cap to 1000 users for memory — generator already does this.
  return generateDataset(1000);
}

const initialDataset = initDataset();
const initialDerived = buildDerived(initialDataset);

// Pre-run bandit for 80 rounds so the dashboard has interesting state
const initialBandit = runBanditEpisodes(80);

export const useForgeStore = create<PersonaForgeState>((set, get) => ({
  dataset: initialDataset,
  personas: initialDerived.personas,
  causalEffects: initialDerived.causalEffects,
  causalGraph: initialDerived.causalGraph,

  currentView: "overview",
  selectedUserId: initialDataset.users[0]?.id ?? null,
  themeReady: true,

  bandit: initialBandit,

  setView: (v) => set({ currentView: v }),
  selectUser: (id) => set({ selectedUserId: id }),

  stepBanditOnce: () => set((s) => ({ bandit: stepBandit(s.bandit) })),
  stepBanditMany: (n) => {
    let b = get().bandit;
    for (let i = 0; i < n; i++) b = stepBandit(b);
    set({ bandit: b });
  },
  resetBandit: () => set({ bandit: createBanditState() }),

  getUser: (id) => get().dataset.users.find((u) => u.id === id),

  getPersonalization: (userId) => {
    const user = get().getUser(userId);
    if (!user) return null;
    const persona = get().personas.find((p) => p.kind === user.persona) ?? get().personas[0];
    return generatePersonalization(user, persona);
  },

  getExplanation: (userId) => {
    const user = get().getUser(userId);
    if (!user) return null;
    const persona = get().personas.find((p) => p.kind === user.persona) ?? get().personas[0];
    return generateExplanation(
      user,
      persona,
      get().causalEffects,
      get().dataset.users
    );
  },
}));
