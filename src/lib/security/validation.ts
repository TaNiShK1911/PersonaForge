// ============================================================
// PersonaForge — Input Validation (Zod schemas)
// ============================================================
// All API request bodies are validated against Zod schemas.
// Prisma parameterized queries prevent SQL injection.
// ============================================================

import { z } from "zod";

// ---------- User schemas ----------
export const userIdSchema = z.object({
  id: z.string().min(3).max(64),
});

export const userListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  persona: z.string().optional(),
  search: z.string().max(64).optional(),
  converted: z.enum(["true", "false"]).optional(),
});

// ---------- Event ingestion ----------
export const eventSchema = z.object({
  userId: z.string().min(3).max(64),
  type: z.enum([
    "page_view",
    "scroll_depth",
    "search",
    "product_click",
    "add_to_cart",
    "wishlist",
    "purchase",
    "time_on_page",
    "exit",
  ]),
  timestamp: z.number().int().positive().optional(),
  pageDepth: z.number().int().min(0).optional(),
  productId: z.string().max(128).optional(),
  query: z.string().max(256).optional(),
  scrollPct: z.number().int().min(0).max(100).optional(),
  dwellSec: z.number().int().min(0).optional(),
  price: z.number().min(0).optional(),
  discountSeen: z.boolean().optional(),
  socialProofSeen: z.boolean().optional(),
  reviewSeen: z.boolean().optional(),
  urgencySeen: z.boolean().optional(),
});

export const eventBatchSchema = z.object({
  events: z.array(eventSchema).min(1).max(500),
});

// ---------- Counterfactual ----------
export const counterfactualRequestSchema = z.object({
  userId: z.string().min(3).max(64),
  treatments: z
    .object({
      discount: z.boolean().optional(),
      social_proof: z.boolean().optional(),
      product_reviews: z.boolean().optional(),
      urgency_messaging: z.boolean().optional(),
    })
    .optional(),
  scenarios: z
    .array(
      z.object({
        label: z.string().max(128),
        treatments: z.object({
          discount: z.boolean().optional(),
          social_proof: z.boolean().optional(),
          product_reviews: z.boolean().optional(),
          urgency_messaging: z.boolean().optional(),
        }),
      })
    )
    .optional(),
});

// ---------- Personalization ----------
export const personalizeRequestSchema = z.object({
  userId: z.string().min(3).max(64),
  channel: z.enum(["email", "ad", "push", "headline"]).optional(),
  tone: z.enum(["professional", "casual", "persuasive", "urgent"]).optional(),
  useCache: z.boolean().optional().default(true),
});

// ---------- Bandit ----------
export const banditUpdateSchema = z.object({
  steps: z.number().int().min(1).max(100).default(1),
  reset: z.boolean().optional(),
});

// ---------- Pagination ----------
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

// ---------- Helper: validate or throw ----------
export class ValidationError extends Error {
  constructor(public fieldErrors: z.ZodError["issues"]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}
