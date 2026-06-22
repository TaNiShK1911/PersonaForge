// ============================================================
// PersonaForge — Consent-Aware Personalization Gate
// ============================================================
// Models the privacy/consent tension that's the dominant 2026
// MarTech conversation. Implements tiered consent levels that
// limit personalization capabilities based on user preference.
//
// This is the layer Epsilon's PeopleCloud exists to solve:
// consent-first, first-party-data-driven targeting.
// ============================================================

export type ConsentLevel = "none" | "basic" | "full";

export interface ConsentGateResult {
  allowed: string[];
  denied: string[];
  fallbackStrategy: string;
  consentLevel: ConsentLevel;
}

export interface User {
  id: string;
  consentLevel?: ConsentLevel;
  [key: string]: any;
}

// Define what each consent tier unlocks
const CONSENT_CAPABILITIES: Record<ConsentLevel, string[]> = {
  none: [
    "contextual_targeting",      // Generic content based on page context only
    "aggregate_analytics",       // Anonymous aggregated stats
  ],
  basic: [
    "contextual_targeting",
    "aggregate_analytics",
    "persona_targeting",         // Segment-level (not individual) personalization
    "product_recommendations",   // Basic collaborative filtering
    "ab_testing",               // Cohort-level experiments
  ],
  full: [
    "contextual_targeting",
    "aggregate_analytics",
    "persona_targeting",
    "product_recommendations",
    "ab_testing",
    "individual_causal_targeting",     // User-level causal effect estimation
    "counterfactual_simulation",       // What-if scenarios for this user
    "cross_device_identity_resolution", // Identity stitching across channels
    "behavioral_event_tracking",       // Full event-level tracking
    "ai_content_generation",           // Fully personalized LLM-generated content
  ],
};

// Fallback strategies when features are denied
const FALLBACK_STRATEGIES: Record<ConsentLevel, string> = {
  none: "contextual_only",
  basic: "persona_segment",
  full: "full_personalization",
};

/**
 * Apply consent gate to determine which features are allowed
 * @param user - User with consentLevel
 * @param requestedFeatures - Features the caller wants to use
 * @returns Object with allowed/denied features and fallback strategy
 */
export function applyConsentGate(
  user: User,
  requestedFeatures: string[]
): ConsentGateResult {
  const consentLevel = (user.consentLevel ?? "full") as ConsentLevel;
  const allowedCapabilities = CONSENT_CAPABILITIES[consentLevel] ?? [];
  
  const allowed: string[] = [];
  const denied: string[] = [];
  
  for (const feature of requestedFeatures) {
    if (allowedCapabilities.includes(feature)) {
      allowed.push(feature);
    } else {
      denied.push(feature);
    }
  }
  
  return {
    allowed,
    denied,
    fallbackStrategy: FALLBACK_STRATEGIES[consentLevel],
    consentLevel,
  };
}

/**
 * Get human-readable explanation of what's blocked and why
 */
export function explainConsentLimitations(
  user: User,
  deniedFeatures: string[]
): string {
  const consentLevel = (user.consentLevel ?? "full") as ConsentLevel;
  
  if (deniedFeatures.length === 0) {
    return "";
  }
  
  const explanations: Record<ConsentLevel, string> = {
    none: "User has 'none' consent — all personalization withheld; serving contextual content only.",
    basic: "User has 'basic' consent — individual causal targeting, cross-device identity resolution, and AI-generated content are withheld; using persona-level segmentation only.",
    full: "", // no limitations
  };
  
  return explanations[consentLevel];
}

/**
 * Check if a specific capability is allowed
 */
export function hasConsent(user: User, capability: string): boolean {
  const consentLevel = (user.consentLevel ?? "full") as ConsentLevel;
  const allowedCapabilities = CONSENT_CAPABILITIES[consentLevel] ?? [];
  return allowedCapabilities.includes(capability);
}

/**
 * Get all capabilities for a consent level
 */
export function getConsentCapabilities(level: ConsentLevel): string[] {
  return CONSENT_CAPABILITIES[level] ?? [];
}

/**
 * Determine recommended consent level for a use case
 */
export function recommendConsentLevel(useCase: string): ConsentLevel {
  const useCaseToLevel: Record<string, ConsentLevel> = {
    // Low-privacy use cases
    "contextual_ads": "none",
    "anonymous_analytics": "none",
    
    // Medium-privacy use cases
    "segment_targeting": "basic",
    "product_recommendations": "basic",
    "ab_testing": "basic",
    
    // High-privacy use cases
    "individual_personalization": "full",
    "cross_device_tracking": "full",
    "behavioral_profiling": "full",
    "ai_content": "full",
  };
  
  return useCaseToLevel[useCase] ?? "full";
}

/**
 * Compute consent distribution across user base (for analytics)
 */
export function getConsentDistribution(users: User[]): Record<ConsentLevel, number> {
  const distribution: Record<ConsentLevel, number> = {
    none: 0,
    basic: 0,
    full: 0,
  };
  
  for (const user of users) {
    const level = (user.consentLevel ?? "full") as ConsentLevel;
    distribution[level]++;
  }
  
  return distribution;
}
