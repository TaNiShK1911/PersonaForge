// ============================================================
// PersonaForge — RBAC (Role-Based Access Control)
// ============================================================
// Three roles: admin > analyst > viewer
// Each role has a defined set of permissions per resource.
// ============================================================

export type Role = "admin" | "analyst" | "viewer";

export type Permission =
  | "users:read"
  | "users:write"
  | "personas:read"
  | "personas:write"
  | "causal:read"
  | "causal:write"
  | "counterfactual:read"
  | "counterfactual:write"
  | "personalization:read"
  | "personalization:write"
  | "bandit:read"
  | "bandit:write"
  | "events:read"
  | "events:write"
  | "analytics:read"
  | "analytics:write"
  | "admin:read"
  | "admin:write";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "users:read", "users:write",
    "personas:read", "personas:write",
    "causal:read", "causal:write",
    "counterfactual:read", "counterfactual:write",
    "personalization:read", "personalization:write",
    "bandit:read", "bandit:write",
    "events:read", "events:write",
    "analytics:read", "analytics:write",
    "admin:read", "admin:write",
  ],
  analyst: [
    "users:read",
    "personas:read", "personas:write",
    "causal:read", "causal:write",
    "counterfactual:read", "counterfactual:write",
    "personalization:read", "personalization:write",
    "bandit:read", "bandit:write",
    "events:read", "events:write",
    "analytics:read",
  ],
  viewer: [
    "users:read",
    "personas:read",
    "causal:read",
    "counterfactual:read",
    "personalization:read",
    "bandit:read",
    "events:read",
    "analytics:read",
  ],
};

export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccess(role: Role | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_HIERARCHY: Role[] = ["viewer", "analyst", "admin"];

export function isAtLeast(role: Role | undefined | null, minRole: Role): boolean {
  if (!role) return false;
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole);
}
