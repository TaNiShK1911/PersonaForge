// ============================================================
// /api/telegram/push — Telegram Ad Push API
// ============================================================
// POST: Push a persona-specific ad to subscribed Telegram chats
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { applySecurityHeaders } from "@/lib/security/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const { personaKind, headline, cta, generatedContent, reasoning } = body;

    if (!personaKind || !headline) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required fields: personaKind, headline" },
          { status: 400 }
        )
      );
    }

    // Find subscribed chats for this persona
    const subscriptions = await db.telegramSubscription.findMany({
      where: { personaKind },
    });

    if (subscriptions.length === 0) {
      return applySecurityHeaders(
        NextResponse.json({
          pushed: 0,
          failed: 0,
          total: 0,
          results: [],
          latencyMs: Date.now() - start,
          message: `No Telegram subscriptions for persona: ${personaKind}`,
        })
      );
    }

    // Build the ad message
    const adMessage = formatAdMessage({
      personaKind,
      headline,
      cta,
      generatedContent,
      reasoning,
    });

    // Push to all subscribed chats
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const results: { chatId: string; success: boolean; error?: string }[] = [];

    if (botToken) {
      for (const sub of subscriptions) {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: sub.chatId,
                text: adMessage,
                parse_mode: "Markdown",
              }),
            }
          );

          const data = await response.json();
          results.push({
            chatId: sub.chatId,
            success: data.ok ?? false,
            error: data.ok ? undefined : data.description,
          });
        } catch (err) {
          results.push({
            chatId: sub.chatId,
            success: false,
            error: (err as Error).message,
          });
        }
      }
    } else {
      // No bot token — log what would be sent
      apiLogger.info("telegram_push_simulated", {
        personaKind,
        chatIds: subscriptions.map((s) => s.chatId),
        message: adMessage,
      });
      for (const sub of subscriptions) {
        results.push({ chatId: sub.chatId, success: true }); // Simulated success
      }
    }

    const pushed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    metrics.increment("telegram_pushes_total");

    return applySecurityHeaders(
      NextResponse.json({
        pushed,
        failed,
        total: subscriptions.length,
        results,
        latencyMs: Date.now() - start,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/telegram/push failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

function formatAdMessage(data: {
  personaKind: string;
  headline: string;
  cta?: string;
  generatedContent?: string;
  reasoning?: string;
}): string {
  const lines: string[] = [];

  lines.push(`🎯 *PersonaForge Ad*`);
  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(``);
  lines.push(`📣 *${data.headline}*`);
  lines.push(``);

  if (data.generatedContent) {
    lines.push(data.generatedContent);
    lines.push(``);
  }

  if (data.cta) {
    lines.push(`👉 ${data.cta}`);
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━`);
  lines.push(`🧬 Persona: \`${data.personaKind}\``);

  if (data.reasoning) {
    lines.push(`💡 ${data.reasoning}`);
  }

  lines.push(`⚡ _Powered by PersonaForge_`);

  return lines.join("\n");
}
