// ============================================================
// PersonaForge — Identity Resolution Engine
// ============================================================
// Mirrors Epsilon's COREid product: stitch fragmented identifiers
// across channels into unified user profiles using deterministic
// + probabilistic matching.
//
// Matches the from-scratch implementation style of the existing
// logistic regression in src/lib/causal/advanced.ts
// ============================================================

export interface IdentitySignal {
  id: string;
  userId: string;
  signalType: "email" | "device_id" | "cookie_id" | "loyalty_id" | "phone_hash";
  signalValue: string;
  channel: "web" | "app" | "email" | "ctv" | "instore";
  firstSeenAt: Date;
  lastSeenAt: Date;
  confidence?: number | null;
}

export interface IdentityMatch {
  id: string;
  signalAId: string;
  signalBId: string;
  matchScore: number;
  method: "deterministic" | "probabilistic";
  matchedAt: Date;
}

export interface IdentityGraph {
  userId: string;
  nodes: IdentitySignal[];
  edges: IdentityMatch[];
  resolutionConfidence: number;
  fragmentedCount: number;  // before resolution
  resolvedCount: number;    // after resolution (should be 1 ideally)
}

// ============================================================
// Deterministic Matcher — high-confidence exact matches
// ============================================================
function deterministicMatch(signals: IdentitySignal[]): IdentityMatch[] {
  const matches: IdentityMatch[] = [];
  
  // Group by signal value (exact match across channels)
  const valueMap = new Map<string, IdentitySignal[]>();
  for (const sig of signals) {
    // Only match on high-fidelity identifiers
    if (sig.signalType === "email" || sig.signalType === "phone_hash" || sig.signalType === "loyalty_id") {
      const key = `${sig.signalType}:${sig.signalValue}`;
      if (!valueMap.has(key)) valueMap.set(key, []);
      valueMap.get(key)!.push(sig);
    }
  }
  
  // Create matches for signals with same value but different channels
  for (const [_, group] of valueMap) {
    if (group.length < 2) continue;
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        
        // Same channel = likely duplicate signal, not a cross-channel match
        if (a.channel === b.channel) continue;
        
        matches.push({
          id: `det_${a.id}_${b.id}`,
          signalAId: a.id,
          signalBId: b.id,
          matchScore: 0.98, // High confidence for deterministic
          method: "deterministic",
          matchedAt: new Date(),
        });
      }
    }
  }
  
  return matches;
}

// ============================================================
// Probabilistic Matcher — logistic regression over features
// ============================================================
interface SignalPairFeatures {
  temporalOverlap: number;        // 0-1, based on time window co-occurrence
  channelProximity: number;       // 0-1, higher if channels are related (web<->app)
  behaviorSimilarity: number;     // 0-1, shared patterns
  typeCompatibility: number;      // 0-1, some signal types more likely to coexist
}

function extractPairFeatures(a: IdentitySignal, b: IdentitySignal): SignalPairFeatures {
  // Temporal overlap — were they active in similar time windows?
  const aTime = (a.firstSeenAt.getTime() + a.lastSeenAt.getTime()) / 2;
  const bTime = (b.firstSeenAt.getTime() + b.lastSeenAt.getTime()) / 2;
  const timeDiffHours = Math.abs(aTime - bTime) / (1000 * 60 * 60);
  const temporalOverlap = Math.exp(-timeDiffHours / 168); // decay over 1 week
  
  // Channel proximity — some channels more likely to be same user
  const channelPairs: Record<string, Record<string, number>> = {
    web: { app: 0.8, email: 0.6, ctv: 0.3, instore: 0.4, web: 0 },
    app: { web: 0.8, email: 0.7, ctv: 0.4, instore: 0.5, app: 0 },
    email: { web: 0.6, app: 0.7, ctv: 0.2, instore: 0.3, email: 0 },
    ctv: { web: 0.3, app: 0.4, email: 0.2, instore: 0.2, ctv: 0 },
    instore: { web: 0.4, app: 0.5, email: 0.3, ctv: 0.2, instore: 0 },
  };
  const channelProximity = channelPairs[a.channel]?.[b.channel] ?? 0.1;
  
  // Type compatibility — some types naturally co-occur
  const typeScore: Record<string, Record<string, number>> = {
    email: { device_id: 0.8, cookie_id: 0.7, loyalty_id: 0.9, phone_hash: 0.85, email: 0 },
    device_id: { email: 0.8, cookie_id: 0.9, loyalty_id: 0.7, phone_hash: 0.75, device_id: 0 },
    cookie_id: { email: 0.7, device_id: 0.9, loyalty_id: 0.6, phone_hash: 0.65, cookie_id: 0 },
    loyalty_id: { email: 0.9, device_id: 0.7, cookie_id: 0.6, phone_hash: 0.8, loyalty_id: 0 },
    phone_hash: { email: 0.85, device_id: 0.75, cookie_id: 0.65, loyalty_id: 0.8, phone_hash: 0 },
  };
  const typeCompatibility = typeScore[a.signalType]?.[b.signalType] ?? 0.5;
  
  // Behavior similarity — stub (would compare event patterns in production)
  const behaviorSimilarity = 0.6; // neutral baseline
  
  return { temporalOverlap, channelProximity, behaviorSimilarity, typeCompatibility };
}

// Simple sigmoid function for logistic regression
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

// Logistic regression predictor (pre-trained weights from synthetic data)
// In production, these weights would be trained on labeled match/non-match pairs
// Following the same pattern as trainLogisticRegression in src/lib/causal/advanced.ts
function predictMatchProbability(features: SignalPairFeatures): number {
  // Pre-trained weights (would be learned via gradient descent in production)
  const weights = {
    intercept: -2.5,
    temporalOverlap: 3.0,
    channelProximity: 2.5,
    behaviorSimilarity: 1.8,
    typeCompatibility: 2.0,
  };
  
  const z =
    weights.intercept +
    weights.temporalOverlap * features.temporalOverlap +
    weights.channelProximity * features.channelProximity +
    weights.behaviorSimilarity * features.behaviorSimilarity +
    weights.typeCompatibility * features.typeCompatibility;
  
  return sigmoid(z);
}

function probabilisticMatch(signals: IdentitySignal[], threshold: number = 0.7): IdentityMatch[] {
  const matches: IdentityMatch[] = [];
  
  // Compare all pairs
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const a = signals[i];
      const b = signals[j];
      
      // Skip if different users (we're resolving within-user signals)
      if (a.userId !== b.userId) continue;
      
      // Skip if same signal
      if (a.id === b.id) continue;
      
      const features = extractPairFeatures(a, b);
      const matchScore = predictMatchProbability(features);
      
      if (matchScore >= threshold) {
        matches.push({
          id: `prob_${a.id}_${b.id}`,
          signalAId: a.id,
          signalBId: b.id,
          matchScore,
          method: "probabilistic",
          matchedAt: new Date(),
        });
      }
    }
  }
  
  return matches;
}

// ============================================================
// Main Resolution Function
// ============================================================
export function resolveIdentities(signals: IdentitySignal[], useProb: boolean = true): IdentityMatch[] {
  // Step 1: Deterministic matches (high confidence)
  const deterministicMatches = deterministicMatch(signals);
  
  // Step 2: Probabilistic matches (if enabled)
  const probabilisticMatches = useProb ? probabilisticMatch(signals) : [];
  
  // Combine and deduplicate
  const allMatches = [...deterministicMatches, ...probabilisticMatches];
  const seen = new Set<string>();
  const unique: IdentityMatch[] = [];
  
  for (const m of allMatches) {
    const key = [m.signalAId, m.signalBId].sort().join("_");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }
  
  return unique;
}

// ============================================================
// Identity Graph Builder
// ============================================================
export function buildIdentityGraph(userId: string, signals: IdentitySignal[], matches: IdentityMatch[]): IdentityGraph {
  // Filter signals for this user
  const userSignals = signals.filter((s) => s.userId === userId);
  
  // Filter matches that involve these signals
  const signalIds = new Set(userSignals.map((s) => s.id));
  const userMatches = matches.filter(
    (m) => signalIds.has(m.signalAId) && signalIds.has(m.signalBId)
  );
  
  // Calculate resolution confidence
  // Perfect resolution = all signals connected into one component with high match scores
  const avgMatchScore = userMatches.length > 0
    ? userMatches.reduce((sum, m) => sum + m.matchScore, 0) / userMatches.length
    : 0;
  
  // Calculate connected components (simplified — assume matches form one component for now)
  const fragmentedCount = userSignals.length; // before: each signal is separate
  const resolvedCount = userMatches.length > 0 ? 1 : fragmentedCount; // after: ideally 1 unified profile
  
  // Overall confidence = average match score * coverage factor
  const coverageFactor = userMatches.length > 0 ? userMatches.length / Math.max(1, fragmentedCount - 1) : 0;
  const resolutionConfidence = Math.min(1, avgMatchScore * Math.sqrt(coverageFactor));
  
  return {
    userId,
    nodes: userSignals,
    edges: userMatches,
    resolutionConfidence,
    fragmentedCount,
    resolvedCount,
  };
}

// ============================================================
// Training function (for completeness — matches causal style)
// ============================================================
export function trainMatchModel(
  labeledPairs: Array<{ features: SignalPairFeatures; isMatch: boolean }>
): { weights: number[]; accuracy: number } {
  // Logistic regression via gradient descent
  // (same pattern as trainLogisticRegression in src/lib/causal/advanced.ts)
  
  const learningRate = 0.01;
  const iterations = 1000;
  let weights = [-2.5, 3.0, 2.5, 1.8, 2.0]; // [intercept, temporal, channel, behavior, type]
  
  for (let iter = 0; iter < iterations; iter++) {
    const gradients = [0, 0, 0, 0, 0];
    
    for (const pair of labeledPairs) {
      const { temporalOverlap, channelProximity, behaviorSimilarity, typeCompatibility } = pair.features;
      const x = [1, temporalOverlap, channelProximity, behaviorSimilarity, typeCompatibility];
      const y = pair.isMatch ? 1 : 0;
      
      const z = weights.reduce((sum, w, i) => sum + w * x[i], 0);
      const pred = sigmoid(z);
      const error = pred - y;
      
      for (let i = 0; i < weights.length; i++) {
        gradients[i] += error * x[i];
      }
    }
    
    for (let i = 0; i < weights.length; i++) {
      weights[i] -= (learningRate / labeledPairs.length) * gradients[i];
    }
  }
  
  // Calculate accuracy
  let correct = 0;
  for (const pair of labeledPairs) {
    const { temporalOverlap, channelProximity, behaviorSimilarity, typeCompatibility } = pair.features;
    const x = [1, temporalOverlap, channelProximity, behaviorSimilarity, typeCompatibility];
    const z = weights.reduce((sum, w, i) => sum + w * x[i], 0);
    const pred = sigmoid(z);
    const predicted = pred >= 0.5;
    if (predicted === pair.isMatch) correct++;
  }
  
  return { weights, accuracy: correct / labeledPairs.length };
}
