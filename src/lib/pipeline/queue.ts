// ============================================================
// PersonaForge — Event Pipeline (BullMQ-backed in prod)
// ============================================================
// Public API for enqueueing jobs. Delegates to BullMQ when Redis
// is available; falls back to in-process queue in dev.
//
// Pipeline:
//   Event → enqueue() → BullMQ (Redis) → Worker process → DB
//                                          ↓
//                                       OR (dev only)
//                                          ↓
//                                       In-process handler → DB
// ============================================================

import { db } from "@/lib/db";
import { pipelineLogger } from "@/lib/monitoring/logger";
import { metrics } from "@/lib/monitoring/metrics";
import { cache } from "@/lib/cache/redis";
import {
  getEventQueue,
  getAnalyticsQueue,
  getPersonaQueue,
  handleIngestEvent,
  handleIngestBatch,
  handleSnapshotAnalytics,
  handleUpdatePersona,
  handleMultiAgentAnalyze,
  handleTelegramPush,
  handleEmbedRefresh,
} from "./bullmq";

// ---------- In-process queue (dev fallback) ----------

class InProcessQueue {
  private handlers = new Map<string, (payload: any) => Promise<void>>();
  private queue: { type: string; payload: any; attempts: number; maxAttempts: number }[] = [];
  private processing = false;

  register<T>(type: string, handler: (payload: T) => Promise<void>): void {
    this.handlers.set(type, handler as any);
  }

  async add<T>(type: string, payload: T, opts?: { maxAttempts?: number }): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.queue.push({
      type,
      payload,
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
    });
    pipelineLogger.debug("Job enqueued (in-process)", { type, jobId });
    this.processNext();
    return jobId;
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
      pipelineLogger.debug("Job completed", { type: job.type, attempts: job.attempts });
    } catch (err) {
      if (job.attempts < job.maxAttempts) {
        pipelineLogger.warn("Job failed, retrying", {
          type: job.type,
          attempt: job.attempts,
          error: (err as Error).message,
        });
        this.queue.unshift(job);
      } else {
        pipelineLogger.error("Job failed permanently", {
          type: job.type,
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

const globalForQueue = globalThis as unknown as { __personaForgeQueue?: InProcessQueue };
const inProcessQueue: InProcessQueue =
  globalForQueue.__personaForgeQueue ?? new InProcessQueue();
if (process.env.NODE_ENV !== "production") {
  globalForQueue.__personaForgeQueue = inProcessQueue;
}

// Register in-process handlers (used when BullMQ is unavailable)
inProcessQueue.register("ingest-event", handleIngestEvent);
inProcessQueue.register("ingest-batch", handleIngestBatch);
inProcessQueue.register("snapshot-analytics", handleSnapshotAnalytics);
inProcessQueue.register("update-persona", handleUpdatePersona);
inProcessQueue.register("multi-agent-analyze", handleMultiAgentAnalyze);
inProcessQueue.register("telegram-push", handleTelegramPush);
inProcessQueue.register("embed-refresh", handleEmbedRefresh);

// ---------- Public API ----------

export const pipeline = {
  async enqueue<T>(type: string, payload: T, opts?: { maxAttempts?: number }): Promise<string> {
    // Try BullMQ first (production path)
    try {
      if (type === "ingest-event" || type === "ingest-batch") {
        const q = await getEventQueue();
        if (q) {
          const job = await q.add(type, payload);
          pipelineLogger.debug("Job enqueued (BullMQ)", { type, id: job.id });
          return job.id;
        }
      } else if (type === "snapshot-analytics") {
        const q = await getAnalyticsQueue();
        if (q) {
          const job = await q.add(type, payload);
          return job.id;
        }
      } else if (type === "update-persona") {
        const q = await getPersonaQueue();
        if (q) {
          const job = await q.add(type, payload);
          return job.id;
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err; // Hard fail in production
      }
      pipelineLogger.warn("BullMQ enqueue failed, using in-process", {
        error: (err as Error).message,
      });
    }

    // Dev fallback
    return inProcessQueue.add(type, payload, opts);
  },

  register: inProcessQueue.register.bind(inProcessQueue),
  getQueueLength: () => inProcessQueue.queueLength,
};

// ---------- Background scheduler (dev only — production uses BullMQ workers) ----------

let schedulerStarted = false;
export function startBackgroundScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  // Hourly analytics snapshot
  setInterval(() => {
    pipeline.enqueue("snapshot-analytics", undefined).catch(() => {});
  }, 60 * 60 * 1000);
  // Daily persona refresh
  setInterval(() => {
    pipeline.enqueue("update-persona", undefined).catch(() => {});
  }, 24 * 60 * 60 * 1000);
  pipelineLogger.info("Background scheduler started (dev in-process)");
}
