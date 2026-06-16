// ============================================================
// /api/docs — OpenAPI-style documentation
// ============================================================

import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "PersonaForge API",
    version: "1.0.0",
    description: "Causal Micro-Persona Engine — production backend",
    contact: { name: "PersonaForge Team" },
  },
  servers: [{ url: "/api", description: "Current instance" }],
  paths: {
    "/users": {
      get: {
        summary: "List users",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          { name: "persona", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "converted", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          200: { description: "Paginated list of users" },
          401: { description: "Unauthorized" },
          429: { description: "Rate limited" },
        },
      },
    },
    "/users/{id}": {
      get: {
        summary: "Get user by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User" }, 404: { description: "Not found" } },
      },
    },
    "/personas": { get: { summary: "List all personas" } },
    "/analytics": { get: { summary: "Aggregated analytics" } },
    "/bandit": { get: { summary: "Current bandit state" } },
    "/bandit/update": {
      post: {
        summary: "Advance bandit by N steps",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  steps: { type: "integer", minimum: 1, maximum: 100, default: 1 },
                  reset: { type: "boolean" },
                },
              },
            },
          },
        },
      },
    },
    "/counterfactual": {
      post: {
        summary: "Run counterfactual scenarios for a user",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string" },
                  treatments: {
                    type: "object",
                    properties: {
                      discount: { type: "boolean" },
                      social_proof: { type: "boolean" },
                      product_reviews: { type: "boolean" },
                      urgency_messaging: { type: "boolean" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/personalize": {
      post: {
        summary: "Generate personalized content",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: {
                  userId: { type: "string" },
                  channel: { type: "string", enum: ["email", "ad", "push", "headline"] },
                  tone: { type: "string", enum: ["professional", "casual", "persuasive", "urgent"] },
                  useCache: { type: "boolean", default: true },
                },
              },
            },
          },
        },
      },
    },
    "/events": {
      post: {
        summary: "Ingest one or more events",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["userId", "type"],
                      properties: {
                        userId: { type: "string" },
                        type: { type: "string" },
                        timestamp: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health": { get: { summary: "Service health" } },
    "/metrics": { get: { summary: "Prometheus metrics" } },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
  security: [{ bearerAuth: [] }],
};

export async function GET() {
  const res = NextResponse.json(OPENAPI_SPEC);
  return applySecurityHeaders(res);
}
