// ============================================================
// PersonaForge — Prisma Client (production singleton)
// ============================================================
// Connection pooling is handled by Prisma's internal pool.
// In dev we cache the client on globalThis to avoid exhausting
// connections during hot-module reloads.
// ============================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "query"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type { PrismaClient } from "@prisma/client";
