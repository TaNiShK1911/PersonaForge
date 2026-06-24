// ============================================================
// PersonaForge — Telegram Bot Service
// ============================================================
// Standalone bot that accepts persona subscriptions and receives
// push jobs from PersonaForge to deliver persona-specific ads.
//
// Commands:
//   /start       — Welcome message
//   /subscribe   — Subscribe to persona ads
//   /unsubscribe — Unsubscribe from persona ads
//   /mystats     — Show subscription info
//   /demo        — Trigger a demo ad push
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PERSONAFORGE_API_URL = process.env.PERSONAFORGE_API_URL ?? "http://localhost:3000";
const PERSONAFORGE_API_KEY = process.env.PERSONAFORGE_API_KEY ?? "";

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const PERSONA_OPTIONS = [
  { kind: "price_sensitive", name: "🏷️ Bargain Hunter" },
  { kind: "brand_loyal", name: "💖 Brand Loyalist" },
  { kind: "impulse_buyer", name: "⚡ Impulse Buyer" },
  { kind: "research_oriented", name: "🔍 Deep Researcher" },
  { kind: "luxury_seeker", name: "💎 Luxury Seeker" },
  { kind: "trend_follower", name: "📈 Trend Follower" },
];

// ---- Telegram API helpers ----

async function sendMessage(chatId: string, text: string, options?: { parseMode?: string; replyMarkup?: unknown }) {
  if (!BOT_TOKEN) {
    console.log(`[telegram-bot] Would send to ${chatId}:`, text);
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "Markdown",
      reply_markup: options?.replyMarkup,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`[telegram-bot] Send failed:`, data.description);
  }
  return data;
}

// ---- Database helpers ----
// Removed direct Supabase REST API in favor of Prisma.

// ---- Command handlers ----

async function handleStart(chatId: string) {
  await sendMessage(chatId, `🎯 *Welcome to PersonaForge Bot!*

I deliver personalized marketing ads based on your persona subscription.

*Available Commands:*
/subscribe — Subscribe to persona-specific ads
/unsubscribe — Stop receiving ads
/mystats — View your subscriptions
/demo — See a demo ad

Powered by PersonaForge — Causal Micro-Persona Engine ⚡`);
}

async function handleSubscribe(chatId: string, args: string) {
  if (!args) {
    const buttons = PERSONA_OPTIONS.map((p) => `• \`${p.kind}\` — ${p.name}`).join("\n");
    await sendMessage(chatId, `📋 *Choose a persona to subscribe to:*

${buttons}

Usage: \`/subscribe price_sensitive\``);
    return;
  }

  const personaKind = args.trim().toLowerCase();
  const valid = PERSONA_OPTIONS.find((p) => p.kind === personaKind);

  if (!valid) {
    await sendMessage(chatId, `❌ Unknown persona: \`${personaKind}\`\n\nValid options: ${PERSONA_OPTIONS.map((p) => `\`${p.kind}\``).join(", ")}`);
    return;
  }

  try {
    await db.telegramSubscription.upsert({
      where: {
        chatId_personaKind: {
          chatId: String(chatId),
          personaKind,
        },
      },
      update: {},
      create: {
        chatId: String(chatId),
        personaKind,
      },
    });
    await sendMessage(chatId, `✅ Subscribed to *${valid.name}* ads!\n\nYou'll receive personalized ads when PersonaForge detects relevant persona events.`);
  } catch {
    await sendMessage(chatId, `⚠️ You may already be subscribed to ${valid.name}, or there was an error.`);
  }
}

async function handleUnsubscribe(chatId: string, args: string) {
  if (!args) {
    await db.telegramSubscription.deleteMany({ where: { chatId: String(chatId) } });
    await sendMessage(chatId, `✅ Unsubscribed from all persona ads.`);
    return;
  }

  const personaKind = args.trim().toLowerCase();
  await db.telegramSubscription.deleteMany({
    where: {
      chatId: String(chatId),
      personaKind,
    },
  });
  await sendMessage(chatId, `✅ Unsubscribed from *${personaKind}* ads.`);
}

async function handleMyStats(chatId: string) {
  const subs = await db.telegramSubscription.findMany({
    where: { chatId: String(chatId) },
    select: { personaKind: true, createdAt: true },
  });

  if (!Array.isArray(subs) || subs.length === 0) {
    await sendMessage(chatId, `📊 *Your Subscriptions:* None\n\nUse /subscribe to start receiving persona-specific ads.`);
    return;
  }

  const lines = subs.map((s: any) => {
    const persona = PERSONA_OPTIONS.find((p) => p.kind === s.personaKind);
    return `• ${persona?.name ?? s.personaKind} — since ${new Date(s.createdAt).toLocaleDateString()}`;
  });

  await sendMessage(chatId, `📊 *Your Subscriptions:*\n\n${lines.join("\n")}\n\nUse /unsubscribe to stop receiving ads.`);
}

async function handleDemo(chatId: string) {
  await sendMessage(chatId, `🎯 *PersonaForge Ad*
━━━━━━━━━━━━━━━━━━

📣 *Flash Sale: Save 40% Today Only*

We noticed you've been comparing options — smart move. Here's our best offer: 40% off your wishlist items, today only.

👉 Claim My Discount

━━━━━━━━━━━━━━━━━━
🧬 Persona: \`price_sensitive\`
💡 Targeted based on browsing behavior analysis
⚡ _Powered by PersonaForge_`);
}

// ---- Webhook handler ----

async function handleUpdate(update: any) {
  const message = update.message;
  if (!message?.text) return;

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    await handleStart(chatId);
  } else if (text.startsWith("/subscribe")) {
    await handleSubscribe(chatId, text.replace("/subscribe", "").trim());
  } else if (text.startsWith("/unsubscribe")) {
    await handleUnsubscribe(chatId, text.replace("/unsubscribe", "").trim());
  } else if (text.startsWith("/mystats")) {
    await handleMyStats(chatId);
  } else if (text.startsWith("/demo")) {
    await handleDemo(chatId);
  }
}

// ---- Polling mode (for dev) ----

async function startPolling() {
  if (!BOT_TOKEN) {
    console.log("[telegram-bot] No TELEGRAM_BOT_TOKEN — running in simulation mode");
    console.log("[telegram-bot] Bot commands will be logged to console");
    return;
  }

  console.log("[telegram-bot] Starting long-polling...");
  let offset = 0;

  while (true) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=30`
      );
      const data = await response.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          await handleUpdate(update);
          offset = update.update_id + 1;
        }
      }
    } catch (err) {
      console.error("[telegram-bot] Polling error:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// Start the bot
startPolling();
