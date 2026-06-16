// ============================================================
// PersonaForge — NextAuth Configuration
// ============================================================
// Supports Google, GitHub, and Email (magic link) providers.
// Roles stored on AuthUser table; enforced via RBAC module.
// In dev / when OAuth secrets are missing, falls back to
// demo credentials.
// ============================================================

import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authLogger } from "@/lib/monitoring/logger";

// EmailProvider is omitted by default because it requires nodemailer.
// To enable email magic link auth:
//   1. bun add nodemailer
//   2. Uncomment the import and provider block below
// import EmailProvider from "next-auth/providers/email";

const DEMO_USERS = [
  { email: "admin@personaforge.dev", name: "Demo Admin", role: "admin" as const },
  { email: "analyst@personaforge.dev", name: "Demo Analyst", role: "analyst" as const },
  { email: "viewer@personaforge.dev", name: "Demo Viewer", role: "viewer" as const },
];

export const authOptions: NextAuthOptions = {
  providers: [
    // OAuth providers — only registered if env vars are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
    // Email magic link — requires nodemailer + SMTP env vars.
    // Uncomment after installing nodemailer (see import note above).
    // ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
    //   ? [
    //       EmailProvider({
    //         server: process.env.EMAIL_SERVER!,
    //         from: process.env.EMAIL_FROM!,
    //       }),
    //     ]
    //   : []),
    // Demo credentials provider — always available for hackathon/demo
    CredentialsProvider({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@personaforge.dev" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const demo = DEMO_USERS.find((u) => u.email === credentials.email.toLowerCase());
        if (!demo) return null;
        authLogger.info("Demo login", { email: demo.email, role: demo.role });
        return {
          id: `demo-${demo.role}`,
          email: demo.email,
          name: demo.name,
          role: demo.role,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: persist role on token
        const role = (user as any).role ?? "viewer";
        token.role = role;
        token.userId = user.id;
        // Upsert into AuthUser table for OAuth providers
        if (user.email && !user.id.startsWith("demo-")) {
          try {
            await db.authUser.upsert({
              where: { email: user.email },
              update: { lastLoginAt: new Date(), name: user.name ?? undefined },
              create: {
                email: user.email,
                name: user.name,
                role: "viewer", // new sign-ups default to viewer
                lastLoginAt: new Date(),
              },
            });
          } catch (err) {
            authLogger.warn("Failed to upsert AuthUser on login", {
              email: user.email,
              error: (err as Error).message,
            });
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role ?? "viewer";
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "personaforge-dev-secret-change-in-production",
};
