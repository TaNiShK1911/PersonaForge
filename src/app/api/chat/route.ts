// ============================================================
// /api/chat — RAG Chatbot API
// ============================================================
// POST: Accept a question, run RAG pipeline, return answer
// GET: Fetch conversation history
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { processChat, getConversations, getConversation } from "@/lib/rag/chat";
import { metrics } from "@/lib/monitoring/metrics";
import { apiLogger } from "@/lib/monitoring/logger";
import { applySecurityHeaders } from "@/lib/security/headers";
import { marked } from "marked";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const { question, conversationId, authUserId } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required field: question" },
          { status: 400 }
        )
      );
    }

    const result = await processChat({
      question: question.trim(),
      conversationId,
      authUserId,
    });

    metrics.increment("chat_requests_total");
    metrics.observe("chat_latency_ms", Date.now() - start);

    return applySecurityHeaders(
      NextResponse.json({
        conversationId: result.conversationId,
        messageId: result.messageId,
        answer: await marked.parse(result.answer),
        sources: result.sources,
        suggestAgentRun: result.suggestAgentRun,
        tokensUsed: result.tokensUsed,
        latencyMs: result.latencyMs,
        provider: result.provider,
      })
    );
  } catch (err) {
    metrics.increment("http_errors_total");
    apiLogger.error("POST /api/chat failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const authUserId = url.searchParams.get("authUserId") ?? undefined;
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));

    if (conversationId) {
      const conversation = await getConversation(conversationId);
      if (!conversation) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Conversation not found" }, { status: 404 })
        );
      }
      
      const parsedConversation = {
        ...conversation,
        messages: await Promise.all(
          conversation.messages.map(async (m) => ({
            ...m,
            content: await marked.parse(m.content),
          }))
        ),
      };

      return applySecurityHeaders(NextResponse.json(parsedConversation));
    }

    const conversations = await getConversations(authUserId, limit);
    const parsedConversations = await Promise.all(
      conversations.map(async (c) => ({
        ...c,
        messages: await Promise.all(
          c.messages.map(async (m) => ({
            ...m,
            content: await marked.parse(m.content),
          }))
        ),
      }))
    );

    return applySecurityHeaders(NextResponse.json({ conversations: parsedConversations }));
  } catch (err) {
    apiLogger.error("GET /api/chat failed", {}, err as Error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
