// ============================================================
// PersonaForge — Database Seed Script
// ============================================================
// Run with: bun run db:seed
// Seeds: 6 personas, 4 treatments, 3 bandit variants,
// 3 demo auth users, 1000 sample users (optional).
// ============================================================

import { db } from "../../src/lib/db";
import { generateDataset } from "../../src/lib/data/generator";
import { buildPersonas } from "../../src/lib/ml/persona";
import { PERSONA_META, PERSONA_KINDS, TREATMENTS, TREATMENT_META, BANDIT_ARMS, ARM_META } from "../../src/lib/types";
import { runBanditEpisodes } from "../../src/lib/ml/bandit";

// ============================================================
// Identity Signal Generator (Phase 1)
// ============================================================
type SignalType = "email" | "device_id" | "cookie_id" | "loyalty_id" | "phone_hash";
type Channel = "web" | "app" | "email" | "ctv" | "instore";

function generateIdentitySignals(userId: string, userEmail: string, rng: () => number) {
  const signals: Array<{
    userId: string;
    signalType: SignalType;
    signalValue: string;
    channel: Channel;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }> = [];

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Realistic distribution: each user gets 2-5 signals across 2-3 channels
  const signalCount = 2 + Math.floor(rng() * 4); // 2-5 signals

  // Always include email if available
  if (userEmail) {
    signals.push({
      userId,
      signalType: "email",
      signalValue: userEmail,
      channel: "email",
      firstSeenAt: new Date(weekAgo.getTime() + rng() * (now.getTime() - weekAgo.getTime())),
      lastSeenAt: new Date(dayAgo.getTime() + rng() * (now.getTime() - dayAgo.getTime())),
    });
  }

  // Generate additional signals
  const signalTypes: SignalType[] = ["device_id", "cookie_id", "loyalty_id", "phone_hash"];
  const channels: Channel[] = ["web", "app", "ctv", "instore"];

  for (let i = 1; i < signalCount; i++) {
    const signalType = signalTypes[Math.floor(rng() * signalTypes.length)];
    const channel = channels[Math.floor(rng() * channels.length)];

    // Generate pseudo-random signal value (would be real IDs in production)
    let signalValue: string;
    if (signalType === "email") {
      signalValue = `${userId.slice(0, 8)}@example.com`;
    } else if (signalType === "phone_hash") {
      signalValue = `ph_${userId.slice(0, 12)}`;
    } else if (signalType === "loyalty_id") {
      signalValue = `loy_${userId.slice(0, 10)}`;
    } else if (signalType === "device_id") {
      signalValue = `dev_${userId.slice(0, 16)}`;
    } else {
      signalValue = `ck_${userId.slice(0, 20)}`;
    }

    // Add some noise — 5% of signals are slightly corrupted/shared to create ambiguity
    if (rng() < 0.05) {
      signalValue = signalValue.slice(0, -2) + "XX";
    }

    signals.push({
      userId,
      signalType,
      signalValue,
      channel,
      firstSeenAt: new Date(weekAgo.getTime() + rng() * (now.getTime() - weekAgo.getTime())),
      lastSeenAt: new Date(dayAgo.getTime() + rng() * (now.getTime() - dayAgo.getTime())),
    });
  }

  return signals;
}

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

    // Seeded RNG for reproducibility
    let seed = 12345;
    const seededRng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

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
        // Assign realistic consent distribution: ~20% none, ~35% basic, ~45% full
        let consentLevel: "none" | "basic" | "full";
        const consentRand = seededRng();
        if (consentRand < 0.2) {
          consentLevel = "none";
        } else if (consentRand < 0.55) {
          consentLevel = "basic";
        } else {
          consentLevel = "full";
        }

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
            consentLevel,
            consentTimestamp: new Date(),
          },
        });
      } catch {
        // skip duplicates
      }
    }
    console.log(`  → Inserted ${ds.users.length} users with consent levels`);

    // 5b. Generate identity signals for each user
    console.log("  → Generating identity signals…");
    let signalCount = 0;

    for (const u of ds.users) {
      const signals = generateIdentitySignals(u.id, u.email, seededRng);
      for (const sig of signals) {
        try {
          await db.identitySignal.create({
            data: sig,
          });
          signalCount++;
        } catch {
          // skip duplicates
        }
      }
    }
    console.log(`  → Inserted ${signalCount} identity signals`);
  } else if (userCount > 0) {
    console.log(`  → Found ${userCount} existing users`);
    
    // Check if identity signals exist
    const signalCount = await db.identitySignal.count();
    if (signalCount === 0 && process.env.SEED_SAMPLE_USERS === "true") {
      console.log("  → Generating identity signals for existing users…");
      
      // Seeded RNG for reproducibility
      let seed = 12345;
      const seededRng = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      // Fetch existing users
      const users = await db.user.findMany({ take: 1000 });
      let newSignalCount = 0;

      for (const user of users) {
        const signals = generateIdentitySignals(user.id, user.email || "", seededRng);
        for (const sig of signals) {
          try {
            await db.identitySignal.create({
              data: sig,
            });
            newSignalCount++;
          } catch {
            // skip duplicates
          }
        }
      }
      console.log(`  → Inserted ${newSignalCount} identity signals for ${users.length} users`);
    } else if (signalCount > 0) {
      console.log(`  → Found ${signalCount} existing identity signals`);
    }
  } else {
    console.log(`  → Skipping sample users (SEED_SAMPLE_USERS!=true)`);
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
