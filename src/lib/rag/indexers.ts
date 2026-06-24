// ============================================================
// PersonaForge — RAG Document Indexers
// ============================================================
// Index PersonaForge domain objects into embeddings for RAG
// retrieval. Covers user profiles, personas, analytics snapshots,
// recommendations, counterfactual results, and generated content.
// ============================================================

import { db } from "@/lib/db";
import { generateEmbedding } from "./embed";
import { supabase } from "@/lib/supabase";
import { PERSONA_META } from "@/lib/types";

export type DocumentType =
  | "user_profile"
  | "persona_summary"
  | "analytics_snapshot"
  | "recommendation"
  | "counterfactual_result"
  | "generated_content";

interface IndexableDocument {
  documentType: DocumentType;
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Index a single document into Supabase pgvector.
 */
async function indexDocument(doc: IndexableDocument): Promise<void> {
  if (!supabase) {
    console.warn("[rag/indexers] Supabase unavailable — skipping index");
    return;
  }

  const embedding = await generateEmbedding(doc.content);

  const { error } = await supabase.from("embeddings").upsert(
    {
      document_type: doc.documentType,
      document_id: doc.documentId,
      content: doc.content,
      metadata: doc.metadata,
      embedding: embedding,
    },
    { onConflict: "document_type,document_id" }
  );

  if (error) {
    console.error("[rag/indexers] Failed to index document:", error);
  }
}

/**
 * Index all user profiles for RAG retrieval.
 */
export async function indexUserProfiles(): Promise<number> {
  const users = await db.user.findMany({
    where: { deletedAt: null },
    take: 500,
    include: { persona: true },
  });

  let indexed = 0;
  for (const user of users) {
    const features = typeof user.features === "string"
      ? JSON.parse(user.features)
      : user.features;

    const content = `User ${user.name ?? "Unknown"} (${user.email ?? "no email"}).
Persona: ${user.personaKind ?? "unclassified"}.
Converted: ${user.converted ? "yes" : "no"}. Revenue: $${user.revenue.toFixed(2)}.
Sessions: ${user.sessions}. Consent: ${user.consentLevel}.
Price sensitivity: ${(features.priceSensitivity * 100).toFixed(0)}%.
Brand affinity: ${(features.brandAffinity * 100).toFixed(0)}%.
Urgency response: ${(features.urgencyResponse * 100).toFixed(0)}%.
Social proof response: ${(features.socialProofResponse * 100).toFixed(0)}%.
Discount response: ${(features.discountResponse * 100).toFixed(0)}%.
Review reliance: ${(features.reviewReliance * 100).toFixed(0)}%.
Trend affinity: ${(features.trendAffinity * 100).toFixed(0)}%.`;

    await indexDocument({
      documentType: "user_profile",
      documentId: user.id,
      content,
      metadata: {
        userId: user.id,
        personaKind: user.personaKind,
        converted: user.converted,
        revenue: user.revenue,
      },
    });
    indexed++;
  }

  return indexed;
}

/**
 * Index all persona summaries for RAG retrieval.
 */
export async function indexPersonaSummaries(): Promise<number> {
  const personas = await db.persona.findMany({
    where: { deletedAt: null },
  });

  let indexed = 0;
  for (const persona of personas) {
    const meta = PERSONA_META[persona.kind as keyof typeof PERSONA_META];
    const traits = typeof persona.traits === "string"
      ? JSON.parse(persona.traits)
      : persona.traits;

    const content = `Persona: ${persona.name} (${persona.kind}).
${meta?.tagline ?? persona.tagline ?? ""}.
Traits: ${Array.isArray(traits) ? traits.join(", ") : "none"}.
Members: ${persona.memberCount}. Avg conversion: ${(persona.avgConversion * 100).toFixed(1)}%.
Avg revenue: $${persona.avgRevenue.toFixed(2)}. Confidence: ${(persona.confidence * 100).toFixed(0)}%.`;

    await indexDocument({
      documentType: "persona_summary",
      documentId: persona.id,
      content,
      metadata: {
        personaKind: persona.kind,
        memberCount: persona.memberCount,
        avgConversion: persona.avgConversion,
      },
    });
    indexed++;
  }

  return indexed;
}

/**
 * Index analytics snapshots for RAG retrieval.
 */
export async function indexAnalyticsSnapshots(): Promise<number> {
  const snapshots = await db.analyticsSnapshot.findMany({
    orderBy: { date: "desc" },
    take: 50,
  });

  let indexed = 0;
  for (const snap of snapshots) {
    const content = `Analytics snapshot (${snap.granity}) for ${snap.date.toISOString().split("T")[0]}.
Active users: ${snap.activeUsers}. Total users: ${snap.totalUsers}.
Converted: ${snap.convertedUsers}. Conversion rate: ${(snap.conversionRate * 100).toFixed(1)}%.
Revenue: $${snap.revenue.toFixed(2)}. Avg order value: $${snap.avgOrderValue.toFixed(2)}.
Events: ${snap.events}. Best bandit arm: ${snap.banditBestArm ?? "n/a"}.
Bandit regret: ${snap.banditRegret?.toFixed(4) ?? "n/a"}.`;

    await indexDocument({
      documentType: "analytics_snapshot",
      documentId: snap.id,
      content,
      metadata: {
        date: snap.date.toISOString(),
        granularity: snap.granity,
        conversionRate: snap.conversionRate,
        revenue: snap.revenue,
      },
    });
    indexed++;
  }

  return indexed;
}

/**
 * Run all indexers to refresh the RAG embedding store.
 */
export async function indexAll(): Promise<{
  users: number;
  personas: number;
  analytics: number;
}> {
  const [users, personas, analytics] = await Promise.all([
    indexUserProfiles(),
    indexPersonaSummaries(),
    indexAnalyticsSnapshots(),
  ]);

  console.log(
    `[rag/indexers] Indexed ${users} users, ${personas} personas, ${analytics} analytics snapshots`
  );

  return { users, personas, analytics };
}
