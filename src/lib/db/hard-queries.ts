// ============================================================
// PersonaForge — Hard DB Dependency Helpers
// ============================================================
// These helpers ENFORCE database access. They do not fall back to
// the in-memory Zustand store. If the DB is unreachable, the API
// returns a 503 (production) or 500 (dev).
//
// This is the production contract: Postgres is a hard dependency.
// ============================================================

import { db } from "@/lib/db";
import { logger } from "@/lib/monitoring/logger";
import type { Prisma } from "@prisma/client";

// ---------- Error class ----------

export class DatabaseUnavailableError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

// ---------- Connection check ----------

let dbVerified = false;
export async function verifyDatabase(): Promise<void> {
  if (dbVerified) return;
  try {
    await db.$queryRaw`SELECT 1`;
    dbVerified = true;
    logger.info("database_connection_verified");
  } catch (err) {
    logger.error("database_connection_failed", {}, err as Error);
    throw new DatabaseUnavailableError(
      `PostgreSQL is unreachable: ${(err as Error).message}`,
      err
    );
  }
}

// ---------- User helpers ----------

export interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  personaKind: string | null;
  features: any;
  converted: boolean;
  revenue: number;
  sessions: number;
  eventCount: number;
}

export async function fetchUsers(opts: {
  limit: number;
  offset: number;
  persona?: string;
  search?: string;
  converted?: boolean;
}): Promise<{ users: UserRow[]; total: number }> {
  await verifyDatabase();

  const where: Prisma.UserWhereInput = { deletedAt: null };
  if (opts.persona) where.personaKind = opts.persona;
  if (opts.converted !== undefined) where.converted = opts.converted;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search } },
      { email: { contains: opts.search } },
      { id: { contains: opts.search } },
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      db.user.findMany({
        where,
        take: opts.limit,
        skip: opts.offset,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { events: true } } },
      }),
      db.user.count({ where }),
    ]);

    return {
      users: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        personaKind: r.personaKind,
        features:
          typeof r.features === "string" ? JSON.parse(r.features) : r.features,
        converted: r.converted,
        revenue: r.revenue,
        sessions: r.sessions,
        eventCount: (r as any)._count?.events ?? 0,
      })),
      total,
    };
  } catch (err) {
    throw new DatabaseUnavailableError(
      `User query failed: ${(err as Error).message}`,
      err
    );
  }
}

export async function fetchUserWithEvents(
  id: string
): Promise<{ user: UserRow; events: any[] } | null> {
  await verifyDatabase();

  try {
    const row = await db.user.findUnique({
      where: { id },
      include: {
        events: { orderBy: { timestamp: "asc" }, take: 200 },
        persona: true,
      },
    });
    if (!row) return null;
    return {
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        personaKind: row.personaKind,
        features:
          typeof row.features === "string"
            ? JSON.parse(row.features)
            : row.features,
        converted: row.converted,
        revenue: row.revenue,
        sessions: row.sessions,
        eventCount: row.events.length,
      },
      events: row.events,
    };
  } catch (err) {
    throw new DatabaseUnavailableError(
      `User lookup failed: ${(err as Error).message}`,
      err
    );
  }
}

// ---------- Persona helpers ----------

export interface PersonaRow {
  id: string;
  kind: string;
  name: string;
  tagline: string | null;
  traits: any;
  embedding: any;
  confidence: number;
  memberCount: number;
  avgConversion: number;
  avgRevenue: number;
  topFeatures: any;
  color: string | null;
  emoji: string | null;
}

export async function fetchPersonas(): Promise<PersonaRow[]> {
  await verifyDatabase();
  try {
    const rows = await db.persona.findMany({
      where: { deletedAt: null },
      orderBy: { memberCount: "desc" },
    });
    return rows.map((r) => ({
      ...r,
      traits:
        typeof r.traits === "string" ? JSON.parse(r.traits) : r.traits,
      embedding:
        typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding,
      topFeatures: r.topFeatures
        ? typeof r.topFeatures === "string"
          ? JSON.parse(r.topFeatures)
          : r.topFeatures
        : null,
    }));
  } catch (err) {
    throw new DatabaseUnavailableError(
      `Persona query failed: ${(err as Error).message}`,
      err
    );
  }
}

// ---------- Event helpers ----------

export async function fetchEvents(opts: {
  userId?: string;
  type?: string;
  limit: number;
  offset: number;
}): Promise<{ events: any[]; total: number }> {
  await verifyDatabase();
  const where: Prisma.EventWhereInput = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.type) where.type = opts.type;

  try {
    const [rows, total] = await Promise.all([
      db.event.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: opts.limit,
        skip: opts.offset,
      }),
      db.event.count({ where }),
    ]);
    return { events: rows, total };
  } catch (err) {
    throw new DatabaseUnavailableError(
      `Event query failed: ${(err as Error).message}`,
      err
    );
  }
}

export async function persistEvent(event: {
  userId: string;
  type: string;
  timestamp?: number;
  pageDepth?: number;
  productId?: string;
  query?: string;
  scrollPct?: number;
  dwellSec?: number;
  price?: number;
  discountSeen?: boolean;
  socialProofSeen?: boolean;
  reviewSeen?: boolean;
  urgencySeen?: boolean;
}): Promise<void> {
  await verifyDatabase();
  try {
    await db.event.create({
      data: {
        userId: event.userId,
        type: event.type,
        timestamp: BigInt(event.timestamp ?? Date.now()),
        pageDepth: event.pageDepth ?? 0,
        productId: event.productId,
        query: event.query,
        scrollPct: event.scrollPct,
        dwellSec: event.dwellSec,
        price: event.price,
        discountSeen: event.discountSeen ?? false,
        socialProofSeen: event.socialProofSeen ?? false,
        reviewSeen: event.reviewSeen ?? false,
        urgencySeen: event.urgencySeen ?? false,
      },
    });
  } catch (err) {
    throw new DatabaseUnavailableError(
      `Event insert failed: ${(err as Error).message}`,
      err
    );
  }
}

// ---------- Analytics helpers ----------

export async function fetchAnalyticsSnapshot(): Promise<any> {
  await verifyDatabase();
  try {
    const latest = await db.analyticsSnapshot.findFirst({
      orderBy: { date: "desc" },
    });
    if (latest) {
      return {
        timestamp: latest.date.toISOString(),
        totalUsers: latest.totalUsers,
        activeUsers: latest.activeUsers,
        convertedUsers: latest.convertedUsers,
        conversionRate: latest.conversionRate,
        revenue: latest.revenue,
        avgOrderValue: latest.avgOrderValue,
        events: latest.events,
        banditBestArm: latest.banditBestArm,
        banditRegret: latest.banditRegret,
        banditRounds: latest.banditRounds,
      };
    }
    // Compute live from DB
    const [total, converted, events, revenueResult] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { converted: true } }),
      db.event.count(),
      db.user.aggregate({ _sum: { revenue: true } }),
    ]);
    return {
      timestamp: new Date().toISOString(),
      totalUsers: total,
      activeUsers: total,
      convertedUsers: converted,
      conversionRate: total > 0 ? converted / total : 0,
      revenue: revenueResult._sum.revenue ?? 0,
      avgOrderValue:
        converted > 0 ? (revenueResult._sum.revenue ?? 0) / converted : 0,
      events,
      computedLive: true,
    };
  } catch (err) {
    throw new DatabaseUnavailableError(
      `Analytics query failed: ${(err as Error).message}`,
      err
    );
  }
}

// ---------- DB-backed bandit helpers ----------

export async function fetchBanditStateFromDb(): Promise<any> {
  await verifyDatabase();
  try {
    const variants = await db.banditVariant.findMany({
      where: { isActive: true },
    });
    const observations = await db.banditObservation.findMany({
      orderBy: { round: "desc" },
      take: 200,
    });
    return { variants, observations: observations.reverse() };
  } catch (err) {
    throw new DatabaseUnavailableError(
      `Bandit state query failed: ${(err as Error).message}`,
      err
    );
  }
}
