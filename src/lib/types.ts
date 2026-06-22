// PersonaForge — Core Type System
// ============================================================

/** Hidden behavior categories used to seed synthetic users. */
export type PersonaKind =
  | "price_sensitive"
  | "brand_loyal"
  | "impulse_buyer"
  | "research_oriented"
  | "luxury_seeker"
  | "trend_follower";

export const PERSONA_KINDS: PersonaKind[] = [
  "price_sensitive",
  "brand_loyal",
  "impulse_buyer",
  "research_oriented",
  "luxury_seeker",
  "trend_follower",
];

export const PERSONA_META: Record<
  PersonaKind,
  { name: string; tagline: string; color: string; emoji: string }
> = {
  price_sensitive: {
    name: "Bargain Hunter",
    tagline: "Compares prices, responds to discounts, long decision cycles",
    color: "#34d399", // emerald
    emoji: "🏷️",
  },
  brand_loyal: {
    name: "Brand Loyalist",
    tagline: "Returns to familiar brands, low search diversity",
    color: "#a78bfa", // violet
    emoji: "💖",
  },
  impulse_buyer: {
    name: "Impulse Buyer",
    tagline: "Short sessions, high add-to-cart, urgent triggers",
    color: "#fb7185", // rose
    emoji: "⚡",
  },
  research_oriented: {
    name: "Deep Researcher",
    tagline: "Long reading sessions, many comparisons, careful buyer",
    color: "#22d3ee", // cyan
    emoji: "🔍",
  },
  luxury_seeker: {
    name: "Luxury Seeker",
    tagline: "Premium SKUs, low price sensitivity, brand storytelling",
    color: "#fbbf24", // amber
    emoji: "💎",
  },
  trend_follower: {
    name: "Trend Follower",
    tagline: "New arrivals, social signals, viral products",
    color: "#e879f9", // fuchsia
    emoji: "📈",
  },
};

export type EventType =
  | "page_view"
  | "scroll_depth"
  | "search"
  | "product_click"
  | "add_to_cart"
  | "wishlist"
  | "purchase"
  | "time_on_page"
  | "exit";

/** A single behavioral event on the customer journey. */
export interface BehaviorEvent {
  id: string;
  userId: string;
  type: EventType;
  timestamp: number; // epoch ms
  pageDepth: number; // page depth in session
  // optional properties depending on event type
  productId?: string;
  query?: string;
  scrollPct?: number;
  dwellSec?: number;
  price?: number;
  discountSeen?: boolean;
  reviewSeen?: boolean;
  socialProofSeen?: boolean;
  urgencySeen?: boolean;
}

/** A synthetic user with a hidden persona and behavioral aggregate. */
export interface User {
  id: string;
  name: string;
  email: string;
  persona: PersonaKind;
  createdAt: number;
  // behavioral aggregates (used for clustering & causal features)
  features: UserFeatures;
  events: BehaviorEvent[];
  converted: boolean;
  revenue: number;
  sessions: number;
  consentLevel?: "none" | "basic" | "full";
}

export interface UserFeatures {
  avgSessionLength: number;
  searchCount: number;
  productClicks: number;
  addToCartCount: number;
  wishlistCount: number;
  scrollDepthAvg: number;
  priceSensitivity: number; // 0..1
  brandAffinity: number; // 0..1
  urgencyResponse: number; // 0..1
  socialProofResponse: number; // 0..1
  discountResponse: number; // 0..1
  reviewReliance: number; // 0..1
  trendAffinity: number; // 0..1
  // 2D embedding for visualization
  embeddingX: number;
  embeddingY: number;
}

// ---------- Intent Trajectory ----------

export type IntentStage =
  | "awareness"
  | "interest"
  | "consideration"
  | "intent"
  | "purchase";

export const INTENT_STAGES: IntentStage[] = [
  "awareness",
  "interest",
  "consideration",
  "intent",
  "purchase",
];

export interface IntentPrediction {
  current_stage: IntentStage;
  confidence_score: number;
  predicted_next_stage: IntentStage;
  stageProbabilities: Record<IntentStage, number>;
  trajectory: { stage: IntentStage; t: number; confidence: number }[];
}

// ---------- Persona Engine ----------

export interface Persona {
  persona_name: string;
  kind: PersonaKind;
  traits: string[];
  behavior_embedding: { x: number; y: number };
  confidence: number;
  memberCount: number;
  avgConversion: number;
  avgRevenue: number;
  topFeatures: { feature: string; value: number }[];
}

// ---------- Causal AI ----------

export type TreatmentVariable =
  | "discount"
  | "social_proof"
  | "product_reviews"
  | "urgency_messaging";

export const TREATMENTS: TreatmentVariable[] = [
  "discount",
  "social_proof",
  "product_reviews",
  "urgency_messaging",
];

export const TREATMENT_META: Record<
  TreatmentVariable,
  { label: string; description: string; color: string }
> = {
  discount: {
    label: "Discount",
    description: "User was exposed to a price discount (≥10%)",
    color: "#34d399",
  },
  social_proof: {
    label: "Social Proof",
    description: "User saw 'X people bought this' widget",
    color: "#22d3ee",
  },
  product_reviews: {
    label: "Product Reviews",
    description: "User read ≥3 verified reviews",
    color: "#fbbf24",
  },
  urgency_messaging: {
    label: "Urgency Messaging",
    description: "User saw countdown / limited stock message",
    color: "#fb7185",
  },
};

export interface CausalEffect {
  treatment: TreatmentVariable;
  outcome: "conversion";
  ate: number; // average treatment effect
  ci_lower: number;
  ci_upper: number;
  pValue: number;
  sampleTreated: number;
  sampleControl: number;
  conversionTreated: number;
  conversionControl: number;
}

export interface CausalGraphEdge {
  from: TreatmentVariable;
  to: "conversion";
  weight: number;
}

export interface CausalGraph {
  nodes: { id: string; label: string; type: "treatment" | "outcome" | "confounder" }[];
  edges: CausalGraphEdge[];
  confounders: { id: string; label: string; affects: string[] }[];
}

// ---------- Counterfactual ----------

export interface CounterfactualScenario {
  id: string;
  label: string;
  description: string;
  treatments: Partial<Record<TreatmentVariable, boolean>>;
  conversionProbability: number;
  upliftPct: number;
  estimatedRevenue: number;
}

export interface CounterfactualResult {
  baseline: CounterfactualScenario;
  scenarios: CounterfactualScenario[];
  winner: CounterfactualScenario;
}

// ---------- Personalization ----------

export interface PersonalizationOutput {
  persona: PersonaKind;
  headline: string;
  emailSubject: string;
  emailBody: string;
  adCopy: string;
  pushNotification: string;
  productRanking: { productId: string; score: number; reason: string }[];
  cta: string;
}

// ---------- Explainability ----------

export interface Explanation {
  userId: string;
  productId: string;
  recommendation: string;
  personaDriver: string;
  causalDrivers: { factor: TreatmentVariable; impact: number }[];
  counterfactualNote: string;
  similarCampaignUplift: number;
  confidence: number;
  fullText: string;
}

// ---------- Multi-Armed Bandit ----------

export type BanditArm = "discount" | "urgency" | "social_proof";

export const BANDIT_ARMS: BanditArm[] = ["discount", "urgency", "social_proof"];

export const ARM_META: Record<
  BanditArm,
  { label: string; description: string; color: string }
> = {
  discount: {
    label: "A · Discount Message",
    description: "“Flash Sale: Save 30% Today”",
    color: "#34d399",
  },
  urgency: {
    label: "B · Urgency Message",
    description: "“Only 3 left — ends in 2 hours”",
    color: "#fb7185",
  },
  social_proof: {
    label: "C · Social Proof Message",
    description: "“124 people bought this today”",
    color: "#22d3ee",
  },
};

export interface BanditArmState {
  arm: BanditArm;
  alpha: number; // successes (Beta posterior)
  beta: number; // failures
  pulls: number;
  rewards: number;
  observedRate: number;
  expectedValue: number; // sampled value (Thompson)
}

export interface BanditStep {
  round: number;
  chosen: BanditArm;
  reward: 0 | 1;
  cumulativeReward: number;
  cumulativeOptimal: number;
  regret: number;
  explorationRate: number;
}

export interface BanditState {
  arms: Record<BanditArm, BanditArmState>;
  history: BanditStep[];
  totalRounds: number;
  explorationRate: number;
  exploitationRate: number;
  bestArm: BanditArm;
  conversionImprovement: number;
}
