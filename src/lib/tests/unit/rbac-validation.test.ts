// ============================================================
// Unit tests — RBAC + Validation
// ============================================================

import { describe, test, expect } from "bun:test";
import {
  hasPermission,
  canAccess,
  getRolePermissions,
  isAtLeast,
  Role,
} from "@/lib/auth/rbac";
import { validate, ValidationError, eventSchema, counterfactualRequestSchema } from "@/lib/security/validation";

describe("RBAC", () => {
  test("admin has all permissions", () => {
    expect(hasPermission("admin", "users:write")).toBe(true);
    expect(hasPermission("admin", "admin:write")).toBe(true);
    expect(hasPermission("admin", "personalization:write")).toBe(true);
  });

  test("analyst can read+write most resources but not admin", () => {
    expect(hasPermission("analyst", "users:read")).toBe(true);
    expect(hasPermission("analyst", "personalization:write")).toBe(true);
    expect(hasPermission("analyst", "admin:read")).toBe(false);
    expect(hasPermission("analyst", "users:write")).toBe(false);
  });

  test("viewer is read-only", () => {
    expect(hasPermission("viewer", "users:read")).toBe(true);
    expect(hasPermission("viewer", "personalization:read")).toBe(true);
    expect(hasPermission("viewer", "personalization:write")).toBe(false);
    expect(hasPermission("viewer", "users:write")).toBe(false);
  });

  test("null/undefined role has no permissions", () => {
    expect(hasPermission(null, "users:read")).toBe(false);
    expect(hasPermission(undefined, "users:read")).toBe(false);
  });

  test("canAccess requires ALL permissions", () => {
    expect(canAccess("admin", ["users:read", "users:write"])).toBe(true);
    expect(canAccess("viewer", ["users:read", "users:write"])).toBe(false);
  });

  test("isAtLeast respects hierarchy admin > analyst > viewer", () => {
    expect(isAtLeast("admin", "admin")).toBe(true);
    expect(isAtLeast("admin", "viewer")).toBe(true);
    expect(isAtLeast("viewer", "admin")).toBe(false);
    expect(isAtLeast("analyst", "admin")).toBe(false);
  });
});

describe("Validation schemas", () => {
  test("eventSchema accepts valid event", () => {
    const valid = validate(eventSchema, {
      userId: "u_123",
      type: "page_view",
      timestamp: Date.now(),
    });
    expect(valid.userId).toBe("u_123");
  });

  test("eventSchema rejects invalid type", () => {
    expect(() => validate(eventSchema, { userId: "u", type: "invalid_type" })).toThrow(ValidationError);
  });

  test("eventSchema rejects short userId", () => {
    expect(() => validate(eventSchema, { userId: "x", type: "page_view" })).toThrow(ValidationError);
  });

  test("counterfactualRequestSchema accepts userId only", () => {
    const result = validate(counterfactualRequestSchema, { userId: "u_abc" });
    expect(result.userId).toBe("u_abc");
  });

  test("counterfactualRequestSchema rejects missing userId", () => {
    expect(() => validate(counterfactualRequestSchema, {})).toThrow(ValidationError);
  });
});
