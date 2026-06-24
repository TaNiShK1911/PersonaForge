// ============================================================
// PersonaForge — Content Generator Agent
// ============================================================
// Generates persona-specific campaign content: email copy,
// ad copy, push copy, and headline variants.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { PERSONA_META, PersonaKind } from "@/lib/types";
import { getProviderChain } from "@/lib/ai/factory";
import { db } from "@/lib/db";

export class ContentGeneratorAgent extends BaseAgent {
  readonly name = "ContentGeneratorAgent";
  readonly description = "Generates persona-specific campaign content across channels using LLM";

  protected async execute(state: AgentState): Promise<AgentState> {
    const personaKind = state.personaKind ?? "price_sensitive";
    
    // Fetch user or mock one if no user id
    let user = null;
    if (state.userId) {
      user = await db.user.findUnique({ where: { id: state.userId } });
    }
    
    if (!user) {
      user = {
        id: "mock_user",
        email: "mock@example.com",
        name: "Mock User",
        personaKind,
        features: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const persona = {
      kind: personaKind,
      name: PERSONA_META[personaKind as PersonaKind]?.name ?? personaKind,
      description: PERSONA_META[personaKind as PersonaKind]?.description ?? "A target user segment.",
      basePrompt: PERSONA_META[personaKind as PersonaKind]?.basePrompt ?? "Generate content for this persona.",
    };

    try {
      const chain = getProviderChain();
      const result = await chain.generatePersonalizedContent({
        user: user as any,
        persona: persona as any,
        causalEffects: [],
        channel: "ad",
      });

      state.generatedContent = {
        headline: result.headline,
        emailSubject: result.emailSubject,
        emailBody: result.emailBody,
        adCopy: result.adCopy,
        pushNotification: result.pushNotification,
        cta: result.cta,
      };
      
      state.totalTokens += result.tokensUsed;
    } catch (err) {
      state.errors.push(`ContentGeneratorAgent failed: ${(err as Error).message}`);
      
      // Fallback to empty strings if generation fails completely
      state.generatedContent = {
        headline: "Personalized Offer",
        emailSubject: "Your Exclusive Deal",
        emailBody: "Check out our latest arrivals tailored just for you.",
        adCopy: "Discover products that match your unique style.",
        pushNotification: "Your personalized deal is ready.",
        cta: "Shop Now",
      };
    }

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    return `Generated content for ${state.personaKind ?? "unknown"}: "${state.generatedContent?.headline ?? ""}"`;
  }
}
