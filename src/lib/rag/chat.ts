// ============================================================
// PersonaForge — RAG Chat Engine
// ============================================================
// Orchestrates the full RAG pipeline: embed query → retrieve
// context → assemble prompt → generate response → persist.
// ============================================================

import { db } from "@/lib/db";
import { generateEmbedding } from "./embed";
import { matchEmbeddings } from "@/lib/supabase";
import { SYSTEM_PROMPT, buildUserPrompt, detectAgentIntent } from "./prompts";
import { getProviderChain } from "@/lib/ai/factory";

export interface ChatRequest {
  conversationId?: string;
  question: string;
  authUserId?: string;
}

export interface ChatResponse {
  conversationId: string;
  messageId: string;
  answer: string;
  sources: { documentType: string; documentId: string; content: string; similarity: number }[];
  suggestAgentRun: boolean;
  tokensUsed: number;
  latencyMs: number;
  provider: string;
}

/**
 * Process a chat question through the full RAG pipeline.
 */
export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();

  // 1. Get or create conversation
  let conversationId = req.conversationId;
  if (!conversationId) {
    const conv = await db.chatConversation.create({
      data: {
        authUserId: req.authUserId,
        title: req.question.slice(0, 100),
      },
    });
    conversationId = conv.id;
  }

  // 2. Store user message
  await db.chatMessage.create({
    data: {
      conversationId,
      role: "user",
      content: req.question,
    },
  });

  // 3. Embed the question and retrieve relevant context
  const queryEmbedding = await generateEmbedding(req.question);
  const matches = await matchEmbeddings(queryEmbedding, 8, 0.3);

  // 4. Build context string from retrieved documents
  const contextParts = matches.map(
    (m, i) => `[Source ${i + 1} — ${m.document_type} (relevance: ${(m.similarity * 100).toFixed(0)}%)]\n${m.content}`
  );
  const context = contextParts.length > 0
    ? contextParts.join("\n\n")
    : "No relevant documents found in the knowledge base. Using general platform knowledge.";

  // 5. Fetch live stats for grounding
  const liveStats = await fetchLiveStats();

  // 6. Build the full prompt
  const userPrompt = buildUserPrompt(req.question, context, liveStats);

  // 7. Generate response using the AI provider chain
  let answer: string;
  let tokensUsed = 0;
  let provider = "template";

  try {
    const result = await generateChatResponse(userPrompt);
    answer = result.answer;
    tokensUsed = result.tokensUsed;
    provider = result.provider;
  } catch (err) {
    console.error("[rag/chat] AI generation failed:", err);
    answer = generateFallbackAnswer(req.question, matches, liveStats);
    provider = "fallback";
  }

  // 8. Check if user wants agent action
  const suggestAgentRun = detectAgentIntent(req.question);

  // 9. Store assistant message
  const message = await db.chatMessage.create({
    data: {
      conversationId,
      role: "assistant",
      content: answer,
      sources: JSON.stringify(matches.map((m) => ({
        documentType: m.document_type,
        documentId: m.document_id,
        similarity: m.similarity,
      }))),
      tokensUsed,
      latencyMs: Date.now() - start,
      provider,
    },
  });

  return {
    conversationId,
    messageId: message.id,
    answer,
    sources: matches.map((m) => ({
      documentType: m.document_type,
      documentId: m.document_id,
      content: m.content,
      similarity: m.similarity,
    })),
    suggestAgentRun,
    tokensUsed,
    latencyMs: Date.now() - start,
    provider,
  };
}

/**
 * Fetch live platform stats for prompt grounding.
 */
async function fetchLiveStats() {
  try {
    const [totalUsers, convertedUsers, revenueResult] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { converted: true, deletedAt: null } }),
      db.user.aggregate({
        _sum: { revenue: true },
        where: { deletedAt: null },
      }),
    ]);

    const topPersona = await db.user.groupBy({
      by: ["personaKind"],
      _count: { id: true },
      where: { deletedAt: null, personaKind: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    return {
      totalUsers,
      convertedUsers,
      conversionRate: totalUsers > 0 ? convertedUsers / totalUsers : 0,
      revenue: revenueResult._sum.revenue ?? 0,
      topPersona: topPersona[0]?.personaKind ?? undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Generate a chat response using the AI provider chain.
 */
async function generateChatResponse(userPrompt: string): Promise<{
  answer: string;
  tokensUsed: number;
  provider: string;
}> {
  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.content[0].text,
          tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
          provider: "claude",
        };
      }
    } catch (err) {
      console.warn("[rag/chat] Claude failed, trying next provider:", err);
    }
  }

  // Try Google Gemini
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return {
          answer: text,
          tokensUsed: data.usageMetadata?.totalTokenCount ?? 0,
          provider: "gemini",
        };
      } else {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (err) {
      console.warn("[rag/chat] Gemini failed, trying next provider:", err);
    }
  }

  // Try Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.choices[0].message.content,
          tokensUsed: data.usage?.total_tokens ?? 0,
          provider: "groq",
        };
      } else {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (err) {
      console.warn("[rag/chat] Groq failed:", err);
    }
  }

  // Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.choices[0].message.content,
          tokensUsed: data.usage?.total_tokens ?? 0,
          provider: "openai",
        };
      }
    } catch (err) {
      console.warn("[rag/chat] OpenAI failed:", err);
    }
  }

  // If no providers work, throw to trigger fallback
  throw new Error("No AI providers available");
}

/**
 * Generate a template-based fallback answer when AI providers are unavailable.
 */
function generateFallbackAnswer(
  question: string,
  matches: { document_type: string; content: string; similarity: number }[],
  liveStats?: { totalUsers?: number; convertedUsers?: number; conversionRate?: number; revenue?: number; topPersona?: string }
): string {
  const lower = question.toLowerCase();
  let answer = "## PersonaForge Insights\n\n";

  if (liveStats) {
    answer += `**Live Platform Summary:**\n`;
    answer += `- ${liveStats.totalUsers ?? 0} total users tracked\n`;
    answer += `- ${liveStats.convertedUsers ?? 0} converted (${((liveStats.conversionRate ?? 0) * 100).toFixed(1)}% rate)\n`;
    answer += `- $${(liveStats.revenue ?? 0).toFixed(2)} total revenue\n`;
    if (liveStats.topPersona) answer += `- Top persona: ${liveStats.topPersona}\n`;
    answer += `\n`;
  }

  if (matches.length > 0) {
    answer += `**Relevant Data Found:**\n\n`;
    for (const m of matches.slice(0, 3)) {
      answer += `> ${m.content.split("\n")[0]} *(${(m.similarity * 100).toFixed(0)}% relevant)*\n\n`;
    }
  }

  if (lower.includes("persona") || lower.includes("segment")) {
    answer += `\nFor deeper persona analysis, I recommend running the **agentic analysis system** which will classify users, generate targeted content, and run counterfactual simulations.\n`;
  } else if (lower.includes("campaign") || lower.includes("content")) {
    answer += `\nTo generate persona-specific campaign content, try running the **Content Generator Agent** through the Agent Console.\n`;
  }

  answer += `\n> 💡 *Connect an AI provider (Anthropic, Google, or OpenAI) for richer, more detailed answers.*`;

  return answer;
}

/**
 * Fetch conversation history.
 */
export async function getConversations(authUserId?: string, limit = 20) {
  return db.chatConversation.findMany({
    where: authUserId ? { authUserId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });
}

/**
 * Fetch a single conversation with messages.
 */
export async function getConversation(conversationId: string) {
  return db.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
