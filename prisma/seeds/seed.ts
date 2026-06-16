// ============================================================
// PersonaForge — Database Seed Script
// ============================================================
// Run with: bun run db:seed
// Seeds: 6 personas, 4 treatments, 3 bandit variants,
// 3 demo auth users, 1000 sample users (optional).
// ============================================================

import { db } from "../src/lib/db";
import { generateDataset } from "../src/lib/data/generator";
import { buildPersonas } from "../src/lib/ml/persona";
import { PERSONA_META, PERSONA_KINDS, TREATMENTS, TREATMENT_META, BANDIT_ARMS, ARM_META } from "../src/lib/types";
import { runBanditEpisodes } from "../src/lib/ml/bandit";

async function seed() {
  console.log("🌱 Seeding PersonaForge database…");

  // 1. Personas
  console.log("  → Seeding personas…");
  for (const kind of PERSONA_KINDS) {
    const meta = PERSONA_META[kind];
    await db.persona.upsert({
      where: { kind },
      update: {
        name: meta.name,
        tagline: meta.tagline,
        color: meta.color,
        emoji: meta.emoji,
      },
      create: {
        kind,
        name: meta.name,
        tagline: meta.tagline,
        color: meta.color,
        emoji: meta.emoji,
        traits: JSON.stringify([]),
        embedding: JSON.stringify([0.5, 0.5]),
        confidence: 0,
      },
    });
  }

  // 2. Treatments
  console.log("  → Seeding treatments…");
  for (const t of TREATMENTS) {
    const meta = TREATMENT_META[t];
    await db.treatment.upsert({
      where: { key: t },
      update: {
        label: meta.label,
        description: meta.description,
        color: meta.color,
      },
      create: {
        key: t,
        label: meta.label,
        description: meta.description,
        color: meta.color,
      },
    });
  }

  // 3. Bandit variants
  console.log("  → Seeding bandit variants…");
  for (const arm of BANDIT_ARMS) {
    const meta = ARM_META[arm];
    await db.banditVariant.upsert({
      where: { armKey: arm },
      update: {},
      create: {
        armKey: arm,
        label: meta.label,
        description: meta.description,
        color: meta.color,
        trueRate: arm === "discount" ? 0.18 : arm === "urgency" ? 0.12 : 0.15,
      },
    });
  }

  // 4. Demo auth users
  console.log("  → Seeding demo auth users…");
  const demoUsers = [
    { email: "admin@personaforge.dev", name: "Demo Admin", role: "admin" as const },
    { email: "analyst@personaforge.dev", name: "Demo Analyst", role: "analyst" as const },
    { email: "viewer@personaforge.dev", name: "Demo Viewer", role: "viewer" as const },
  ];
  for (const u of demoUsers) {
    await db.authUser.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role },
    });
  }

  // 5. Optionally seed 1000 sample users (skip if already populated)
  console.log("  → Checking sample users…");
  const userCount = await db.user.count();
  if (userCount === 0 && process.env.SEED_SAMPLE_USERS === "true") {
    console.log("  → Generating 1000 sample users…");
    const ds = generateDataset(1000);
    const personas = buildPersonas(ds.users, 6);

    // Persist personas
    for (const p of personas) {
      await db.persona.update({
        where: { kind: p.kind },
        data: {
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

    // Persist users (batched)
    for (const u of ds.users) {
      try {
        await db.user.create({
          data: {
            id: u.id,
            name: u.name,
            email: u.email,
            personaKind: u.persona,
            features: JSON.stringify(u.features),
            converted: u.converted,
            revenue: u.revenue,
            sessions: u.sessions,
          },
        });
      } catch {
        // skip duplicates
      }
    }
    console.log(`  → Inserted ${ds.users.length} users`);
  } else {
    console.log(`  → Skipping sample users (already ${userCount} present or SEED_SAMPLE_USERS!=true)`);
  }

  // 6. Pre-run bandit 80 rounds for demo
  console.log("  → Pre-running bandit 80 rounds…");
  const banditState = runBanditEpisodes(80);
  for (const arm of BANDIT_ARMS) {
    const armState = banditState.arms[arm];
    await db.banditVariant.update({
      where: { armKey: arm },
      data: {
        alpha: armState.alpha,
        beta: armState.beta,
        pulls: armState.pulls,
        rewards: armState.rewards,
        observedRate: armState.observedRate,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("   Demo logins:");
  demoUsers.forEach((u) => console.log(`     ${u.email} (${u.role})`));
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
