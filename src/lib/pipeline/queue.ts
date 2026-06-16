// ============================================================
// PersonaForge — Event Pipeline (BullMQ-style abstraction)
// ============================================================
// In production: backed by BullMQ + Redis workers.
// In dev: in-process queue with simulated worker.
//
// Pipeline:
//   Event
//     → Queue (BullMQ)
//     → Processor (worker)
//     → Persona Engine (re-cluster if needed)
//     → Recommendation Engine (regenerate)
//     → Database
//
// Jobs:
//   - "ingest-event"      : persist a single event
//   - "ingest-batch"      : persist multiple events
//   - "update-persona"    : re-run k-means + persist personas
//   - "update-recommendations" : regenerate recommendations for a user
//   - "snapshot-analytics": roll up hourly analytics
// ============================================================

import { db } from "@/lib/db";
import { pipelineLogger } from "@/lib/monitoring/logger";
import { metrics } from "@/lib/monitoring/metrics";
import { cache } from "@/lib/cache/redis";
import { generateDataset } from "@/lib/data/generator";
import { buildPersonas } from "@/lib/ml/persona";

// ---------- Job types ----------
export type JobType =
  | "ingest-event"
  | "ingest-batch"
  | "update-persona"
  | "update-recommendations"
  | "snapshot-analytics";

export interface Job<T = unknown> {
  id: string;
  type: JobType;
  payload: T;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
}

type JobHandler<T = unknown> = (payload: T) => Promise<void>;

// ---------- In-process queue (dev fallback) ----------
class InProcessQueue {
  private handlers = new Map<JobType, JobHandler>();
  private queue: Job[] = [];
  private processing = false;
  private concurrency = 1;

  register<T>(type: JobType, handler: JobHandler<T>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  async add<T>(type: JobType, payload: T, opts?: { maxAttempts?: number }): Promise<string> {
    const job: Job<T> = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
    };
    this.queue.push(job as Job);
    pipelineLogger.debug("Job enqueued", { type, jobId: job.id });
    this.processNext();
    return job.id;
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const job = this.queue.shift()!;
    const handler = this.handlers.get(job.type);
    if (!handler) {
      pipelineLogger.error("No handler for job type", { type: job.type });
      this.processing = false;
      this.processNext();
      return;
    }
    try {
      job.attempts++;
      await handler(job.payload);
      pipelineLogger.debug("Job completed", { type: job.type, jobId: job.id, attempts: job.attempts });
    } catch (err) {
      if (job.attempts < job.maxAttempts) {
        pipelineLogger.warn("Job failed, retrying", {
          type: job.type,
          jobId: job.id,
          attempt: job.attempts,
          error: (err as Error).message,
        });
        this.queue.unshift(job); // retry
      } else {
        pipelineLogger.error("Job failed permanently", {
          type: job.type,
          jobId: job.id,
          error: (err as Error).message,
        });
      }
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  get queueLength(): number {
    return this.queue.length;
  }
}

// ---------- Singleton queue ----------
const globalForQueue = globalThis as unknown as { __personaForgeQueue?: InProcessQueue };
const queue: InProcessQueue =
  globalForQueue.__personaForgeQueue ?? new InProcessQueue();
if (process.env.NODE_ENV !== "production") {
  globalForQueue.__personaForgeQueue = queue;
}

// ---------- Job handlers ----------

queue.register<any>("ingest-event", async (payload) => {
  // Persist a single event
  await db.event.create({
    data: {
      userId: payload.userId,
      type: payload.type,
      timestamp: BigInt(payload.timestamp ?? Date.now()),
      pageDepth: payload.pageDepth ?? 0,
      productId: payload.productId,
      query: payload.query,
      scrollPct: payload.scrollPct,
      dwellSec: payload.dwellSec,
      price: payload.price,
      discountSeen: payload.discountSeen ?? false,
      socialProofSeen: payload.socialProofSeen ?? false,
      reviewSeen: payload.reviewSeen ?? false,
      urgencySeen: payload.urgencySeen ?? false,
    },
  });
  metrics.increment("api_events_ingested_total");
  // Invalidate caches for this user
  await cache.del(`persona:content:${payload.userId}:*`);
});

queue.register<any>("ingest-batch", async (payload) => {
  const { events } = payload;
  if (!Array.isArray(events)) return;
  await db.event.createMany({
    data: events.map((e: any) => ({
      userId: e.userId,
      type: e.type,
      timestamp: BigInt(e.timestamp ?? Date.now()),
      pageDepth: e.pageDepth ?? 0,
      productId: e.productId,
      query: e.query,
      scrollPct: e.scrollPct,
      dwellSec: e.dwellSec,
      price: e.price,
      discountSeen: e.discountSeen ?? false,
      socialProofSeen: e.socialProofSeen ?? false,
      reviewSeen: e.reviewSeen ?? false,
      urgencySeen: e.urgencySeen ?? false,
    })),
  });
  metrics.increment("api_events_ingested_total", events.length);
});

queue.register<void>("update-persona", async () => {
  pipelineLogger.info("Re-running persona clustering");
  // In production: load users from DB. For demo, regenerate from in-memory dataset.
  const ds = generateDataset(1000);
  const personas = buildPersonas(ds.users, 6);
  for (const p of personas) {
    await db.persona.upsert({
      where: { kind: p.kind },
      update: {
        name: p.persona_name,
        traits: JSON.stringify(p.traits),
        embedding: JSON.stringify([p.behavior_embedding.x, p.behavior_embedding.y]),
        confidence: p.confidence,
        memberCount: p.memberCount,
        avgConversion: p.avgConversion,
        avgRevenue: p.avgRevenue,
        topFeatures: JSON.stringify(p.topFeatures),
      },
      create: {
        kind: p.kind,
        name: p.persona_name,
        traits: JSON.stringify(p.traits),
        embedding: JSON.stringify([p.behavior_embedding.x, p.behavior_embedding.y]),
        confidence: p.confidence,
        memberCount: p.memberCount,
        avgConversion: p.avgConversion,
        avgRevenue: p.avgRevenue,
        topFeatures: JSON.stringify(p.topFeatures),
      },
    });
  }
  // Invalidate persona caches
  await cache.delPattern("persona:*");
});

queue.register<any>("update-recommendations", async (payload) => {
  // Regenerate recommendations for a specific user
  const { userId } = payload;
  // Mark existing recommendations as stale
  await db.recommendation.updateMany({
    where: { userId, status: "pending" },
    data: { status: "dismissed" },
  });
  await cache.del(`persona:content:${userId}:*`);
});

queue.register<void>("snapshot-analytics", async () => {
  // Roll up hourly analytics snapshot
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const userCount = await db.user.count();
  const convertedCount = await db.user.count({ where: { converted: true } });
  const eventCount = await db.event.count();
  const revenue = await db.user.aggregate({ _sum: { revenue: true } });

  await db.analyticsSnapshot.upsert({
    where: { date_granity: { date: hourStart, granity: "hour" } },
    update: {
      totalUsers: userCount,
      convertedUsers: convertedCount,
      conversionRate: userCount > 0 ? convertedCount / userCount : 0,
      events: eventCount,
      revenue: revenue._sum.revenue ?? 0,
    },
    create: {
      date: hourStart,
      granity: "hour",
      totalUsers: userCount,
      convertedUsers: convertedCount,
      conversionRate: userCount > 0 ? convertedCount / userCount : 0,
      events: eventCount,
      revenue: revenue._sum.revenue ?? 0,
    },
  });
});

// ---------- Public API ----------

export const pipeline = {
  enqueue: queue.add.bind(queue),
  register: queue.register.bind(queue),
  getQueueLength: () => queue.queueLength,
};

// ---------- Background scheduler (runs in API route on first call) ----------
let schedulerStarted = false;
export function startBackgroundScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Hourly analytics snapshot
  setInterval(() => {
    queue.add("snapshot-analytics", undefined).catch(() => {});
  }, 60 * 60 * 1000);
  // Daily persona refresh
  setInterval(() => {
    queue.add("update-persona", undefined).catch(() => {});
  }, 24 * 60 * 60 * 1000);
  pipelineLogger.info("Background scheduler started");
}
