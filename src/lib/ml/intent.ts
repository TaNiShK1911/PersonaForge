// PersonaForge — Intent Trajectory Model
// A lightweight sequence model that maps an event sequence to a current
// intent stage (awareness → interest → consideration → intent → purchase).
//
// In production this would be an LSTM or Transformer encoder over event
// embeddings. For this MVP we use a weighted attention scheme that
// captures the same monotonic-stage intuition and is fully explainable.
// ============================================================

import {
  BehaviorEvent,
  IntentPrediction,
  IntentStage,
  INTENT_STAGES,
} from "@/lib/types";

const STAGE_WEIGHTS: Record<BehaviorEvent["type"], Partial<Record<IntentStage, number>>> = {
  page_view: { awareness: 1.0 },
  scroll_depth: { awareness: 0.4, interest: 0.7 },
  search: { interest: 1.0, consideration: 0.5 },
  product_click: { interest: 0.6, consideration: 0.9 },
  time_on_page: { consideration: 1.0 },
  wishlist: { consideration: 0.5, intent: 0.8 },
  add_to_cart: { intent: 1.0, consideration: 0.4 },
  purchase: { purchase: 1.0 },
  exit: {},
};

// Smooth recurrence (LSTM-style forgetting): recent events matter more.
const RECENCY_DECAY = 0.92;

export function predictIntent(events: BehaviorEvent[]): IntentPrediction {
  if (events.length === 0) {
    return {
      current_stage: "awareness",
      confidence_score: 0.5,
      predicted_next_stage: "interest",
      stageProbabilities: {
        awareness: 1,
        interest: 0,
        consideration: 0,
        intent: 0,
        purchase: 0,
      },
      trajectory: [],
    };
  }

  // Accumulate stage scores with recency weighting
  const stageScores: Record<IntentStage, number> = {
    awareness: 0,
    interest: 0,
    consideration: 0,
    intent: 0,
    purchase: 0,
  };

  // softmax-like normalization over a sliding history
  const trajectory: IntentPrediction["trajectory"] = [];
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let recency = 1;

  sorted.forEach((ev, i) => {
    const weights = STAGE_WEIGHTS[ev.type] || {};
    for (const stage of INTENT_STAGES) {
      const w = weights[stage] ?? 0;
      stageScores[stage] += w * recency;
    }
    recency *= RECENCY_DECAY;

    // snapshot trajectory at every 1/8 of the journey
    if (i % Math.max(1, Math.floor(sorted.length / 8)) === 0 || i === sorted.length - 1) {
      const snap = softmax(stageScores);
      const top = pickTop(snap);
      trajectory.push({ stage: top.stage, t: ev.timestamp, confidence: top.confidence });
    }
  });

  // Final probabilities
  const probs = softmax(stageScores);
  const top = pickTop(probs);
  const stageIdx = INTENT_STAGES.indexOf(top.stage);
  const predicted_next_stage =
    stageIdx < INTENT_STAGES.length - 1
      ? INTENT_STAGES[stageIdx + 1]
      : INTENT_STAGES[stageIdx];

  return {
    current_stage: top.stage,
    confidence_score: top.confidence,
    predicted_next_stage,
    stageProbabilities: probs,
    trajectory,
  };
}

function softmax(scores: Record<IntentStage, number>): Record<IntentStage, number> {
  const vals = INTENT_STAGES.map((s) => scores[s]);
  const max = Math.max(...vals);
  const exps = vals.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const out = {} as Record<IntentStage, number>;
  INTENT_STAGES.forEach((s, i) => {
    out[s] = exps[i] / sum;
  });
  return out;
}

function pickTop(probs: Record<IntentStage, number>): {
  stage: IntentStage;
  confidence: number;
} {
  let best: IntentStage = "awareness";
  let bestP = -1;
  for (const s of INTENT_STAGES) {
    if (probs[s] > bestP) {
      bestP = probs[s];
      best = s;
    }
  }
  return { stage: best, confidence: bestP };
}
