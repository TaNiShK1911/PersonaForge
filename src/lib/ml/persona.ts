// PersonaForge — Micro-Persona Engine
// Clusters users into dynamic personas using a k-means-style algorithm
// over a normalized behavior-embedding space. Each cluster is summarized
// into a persona with traits, behavior embedding, and confidence.
// ============================================================

import {
  PERSONA_KINDS,
  PERSONA_META,
  Persona,
  PersonaKind,
  User,
  UserFeatures,
} from "@/lib/types";

const FEATURE_KEYS: (keyof UserFeatures)[] = [
  "priceSensitivity",
  "brandAffinity",
  "urgencyResponse",
  "socialProofResponse",
  "discountResponse",
  "reviewReliance",
  "trendAffinity",
  "scrollDepthAvg",
];

// Normalize features to a vector
function toVector(f: UserFeatures): number[] {
  return FEATURE_KEYS.map((k) => f[k] as number);
}

function distance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

// K-means clustering (deterministic seed via first-K-users)
function kMeans(points: { vec: number[]; user: User }[], k: number, iters = 12) {
  if (points.length < k) {
    return points.map((p, i) => ({ centroid: p.vec, members: [p], label: i }));
  }
  // init: evenly spaced points
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    centroids.push([...points[Math.floor((i * points.length) / k)].vec]);
  }

  let labels: number[] = new Array(points.length).fill(0);
  for (let iter = 0; iter < iters; iter++) {
    // assign
    labels = points.map((p) => {
      let best = 0;
      let bd = Infinity;
      centroids.forEach((c, i) => {
        const d = distance(p.vec, c);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    });
    // update
    const sums: number[][] = Array.from({ length: k }, () =>
      new Array(FEATURE_KEYS.length).fill(0)
    );
    const counts = new Array(k).fill(0);
    points.forEach((p, i) => {
      const lbl = labels[i];
      counts[lbl]++;
      p.vec.forEach((v, j) => (sums[lbl][j] += v));
    });
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      centroids[c] = sums[c].map((s) => s / counts[c]);
    }
  }

  const clusters = Array.from({ length: k }, (_, i) => ({
    centroid: centroids[i],
    members: points.filter((_, idx) => labels[idx] === i),
    label: i,
  }));
  return clusters;
}

// Map a cluster to a named persona by finding closest canonical profile
function mapClusterToPersona(
  centroid: number[]
): { kind: PersonaKind; name: string; traits: string[] } {
  // canonical vectors for each persona kind (midpoint of profile ranges)
  const canonical: Record<PersonaKind, number[]> = {
    price_sensitive: [0.92, 0.3, 0.55, 0.5, 0.91, 0.8, 0.3, 0.72],
    brand_loyal: [0.3, 0.92, 0.4, 0.45, 0.4, 0.55, 0.5, 0.55],
    impulse_buyer: [0.5, 0.4, 0.91, 0.8, 0.7, 0.3, 0.75, 0.42],
    research_oriented: [0.65, 0.4, 0.3, 0.65, 0.6, 0.93, 0.4, 0.89],
    luxury_seeker: [0.12, 0.84, 0.25, 0.3, 0.18, 0.5, 0.65, 0.62],
    trend_follower: [0.5, 0.6, 0.8, 0.88, 0.65, 0.45, 0.93, 0.57],
  };

  let best: PersonaKind = "price_sensitive";
  let bd = Infinity;
  (Object.keys(canonical) as PersonaKind[]).forEach((k) => {
    const d = distance(centroid, canonical[k]);
    if (d < bd) {
      bd = d;
      best = k;
    }
  });
  const meta = PERSONA_META[best];
  return { kind: best, name: meta.name, traits: deriveTraits(centroid) };
}

function deriveTraits(centroid: number[]): string[] {
  const labels = FEATURE_KEYS;
  const traits: string[] = [];
  centroid.forEach((v, i) => {
    const label = labels[i];
    if (v > 0.7) {
      if (label === "priceSensitivity") traits.push("Compares products heavily");
      if (label === "brandAffinity") traits.push("Loyal to familiar brands");
      if (label === "urgencyResponse") traits.push("Responds to urgency cues");
      if (label === "socialProofResponse") traits.push("Influenced by social proof");
      if (label === "discountResponse") traits.push("Highly responsive to discounts");
      if (label === "reviewReliance") traits.push("Reads reviews carefully");
      if (label === "trendAffinity") traits.push("Tracks new arrivals");
      if (label === "scrollDepthAvg") traits.push("Long decision cycles");
    } else if (v < 0.3) {
      if (label === "priceSensitivity") traits.push("Low price sensitivity");
      if (label === "urgencyResponse") traits.push("Ignores urgency messaging");
      if (label === "discountResponse") traits.push("Discount-resistant");
      if (label === "reviewReliance") traits.push("Skips reviews");
    }
  });
  return traits.slice(0, 5);
}

export function buildPersonas(users: User[], k = 6): Persona[] {
  const points = users.map((u) => ({ vec: toVector(u.features), user: u }));
  const clusters = kMeans(points, k, 12);

  return clusters
    .filter((c) => c.members.length > 0)
    .map((cluster) => {
      const mapping = mapClusterToPersona(cluster.centroid);
      const members = cluster.members.map((m) => m.user);
      const converted = members.filter((m) => m.converted).length;
      const avgConversion = converted / members.length;
      const avgRevenue =
        members.reduce((s, m) => s + m.revenue, 0) / members.length;
      // confidence: 1 - (mean distance / sqrt(k))
      const meanDist =
        cluster.members.reduce((s, m) => s + distance(m.vec, cluster.centroid), 0) /
        cluster.members.length;
      const confidence = Math.max(0.55, Math.min(0.98, 1 - meanDist / 1.5));

      // top features
      const topFeatures = FEATURE_KEYS.map((f, i) => ({
        feature: f,
        value: cluster.centroid[i],
      }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      return {
        persona_name: mapping.name,
        kind: mapping.kind,
        traits: mapping.traits,
        behavior_embedding: {
          x: cluster.centroid[0], // price sensitivity
          y: cluster.centroid[2] + cluster.centroid[6] * 0.5, // urgency + trend
        },
        confidence,
        memberCount: members.length,
        avgConversion,
        avgRevenue,
        topFeatures,
      };
    })
    .sort((a, b) => b.memberCount - a.memberCount);
}

// Convenience: assign a single user to closest precomputed persona
export function assignPersona(user: User, personas: Persona[]): Persona {
  const vec = toVector(user.features);
  let best = personas[0];
  let bd = Infinity;
  for (const p of personas) {
    const pv = [
      p.behavior_embedding.x,
      0.5,
      p.behavior_embedding.y,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
    ];
    const d = distance(vec, pv);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}
