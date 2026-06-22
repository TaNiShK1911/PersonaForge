// ============================================================
// PersonaForge — Auth Helpers (server-side)
// ============================================================
// getServerSession wrapper + permission-check helpers for
// API route handlers.
// ============================================================

import { getServerSession } from "next-auth";
import { authOptions } from "./config";
import { Permission, hasPermission } from "./rbac";
import type { Role } from "./rbac";
import { NextResponse } from "next/server";
import { authLogger } from "@/lib/monitoring/logger";

export interface AuthSession {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role: Role;
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as unknown as AuthSession;
}

export async function requirePermission(
  permission: Permission
): Promise<{ session: AuthSession } | NextResponse> {
  console.log('[AUTH] requirePermission called, NODE_ENV:', process.env.NODE_ENV);
  
  // Development mode bypass - allow all permissions
  if (process.env.NODE_ENV === "development") {
    console.log('[AUTH] Development mode detected - bypassing auth');
    const devSession: AuthSession = {
      user: {
        id: "dev-user",
        email: "dev@personaforge.local",
        name: "Development User",
        image: null,
        role: "admin",
      },
    };
    return { session: devSession };
  }

  console.log('[AUTH] Production mode - checking session');
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, permission)) {
    authLogger.warn("Permission denied", {
      email: session.user.email,
      role: session.user.role,
      permission,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session };
}

export async function requireRole(
  minRole: Role
): Promise<{ session: AuthSession } | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const hierarchy: Role[] = ["viewer", "analyst", "admin"];
  if (hierarchy.indexOf(session.user.role) < hierarchy.indexOf(minRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { session };
}
