// ============================================================
// PersonaForge — Insight Agent
// ============================================================
// Produces concise, business-facing observations from user,
// persona, and analytics data.
// ============================================================

import { BaseAgent } from "./base-agent";
import { AgentState } from "./types";
import { db } from "@/lib/db";
import { PERSONA_META } from "@/lib/types";

export class InsightAgent extends BaseAgent {
  readonly name = "InsightAgent";
  readonly description = "Generates business-facing insights from user and persona data";

  protected async execute(state: AgentState): Promise<AgentState> {
    const findings: string[] = [];
    const recommendations: string[] = [];

    // Gather platform-wide stats
    const [totalUsers, convertedUsers, revenueAgg] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({ where: { converted: true, deletedAt: null } }),
      db.user.aggregate({ _sum: { revenue: true }, where: { deletedAt: null } }),
    ]);

    const conversionRate = totalUsers > 0 ? convertedUsers / totalUsers : 0;
    const totalRevenue = revenueAgg._sum.revenue ?? 0;

    findings.push(
      `Platform has ${totalUsers} users with ${(conversionRate * 100).toFixed(1)}% conversion rate and $${totalRevenue.toFixed(2)} total revenue`
    );

    // Persona distribution
    const personaDist = await db.user.groupBy({
      by: ["personaKind"],
      _count: { id: true },
      _avg: { revenue: true },
      where: { deletedAt: null, personaKind: { not: null } },
      orderBy: { _count: { id: "desc" } },
    });

    if (personaDist.length > 0) {
      const topPersona = personaDist[0];
      const meta = PERSONA_META[topPersona.personaKind as keyof typeof PERSONA_META];
      findings.push(
        `Dominant persona: ${meta?.name ?? topPersona.personaKind} (${topPersona._count.id} users, avg revenue $${(topPersona._avg.revenue ?? 0).toFixed(2)})`
      );

      // Find highest-revenue persona
      const byRevenue = [...personaDist].sort((a, b) => (b._avg.revenue ?? 0) - (a._avg.revenue ?? 0));
      if (byRevenue[0]) {
        const highRevMeta = PERSONA_META[byRevenue[0].personaKind as keyof typeof PERSONA_META];
        findings.push(
          `Highest-revenue persona: ${highRevMeta?.name ?? byRevenue[0].personaKind} ($${(byRevenue[0]._avg.revenue ?? 0).toFixed(2)} avg revenue)`
        );
      }
    }

    // User-specific insights if a user is targeted
    if (state.userId && state.personaProfile) {
      findings.push(
        `Target user classified as ${state.personaProfile.name} with ${(state.personaProfile.confidence * 100).toFixed(0)}% confidence`
      );

      if (state.personaProfile.topFeatures.length > 0) {
        const topFeature = state.personaProfile.topFeatures[0];
        findings.push(
          `User's strongest signal: ${topFeature.feature} (${(topFeature.value * 100).toFixed(0)}%)`
        );
      }
    }

    // Treatment insights
    if (state.treatmentChoice) {
      recommendations.push(
        `Use "${state.treatmentChoice.label}" treatment — ${state.treatmentChoice.reason}`
      );
    }

    // Content insights
    if (state.generatedContent) {
      recommendations.push(
        `Deploy headline: "${state.generatedContent.headline}" with CTA: "${state.generatedContent.cta}"`
      );
    }

    // General recommendations
    if (conversionRate < 0.3) {
      recommendations.push(
        "Conversion rate is below 30% — consider A/B testing urgency messaging and social proof treatments"
      );
    }
    if (personaDist.length > 1) {
      const underserved = personaDist[personaDist.length - 1];
      const underMeta = PERSONA_META[underserved.personaKind as keyof typeof PERSONA_META];
      recommendations.push(
        `${underMeta?.name ?? underserved.personaKind} is underrepresented (${underserved._count.id} users) — explore acquisition strategies for this segment`
      );
    }

    // Build summary
    const summary = `## Marketing Intelligence Summary\n\n` +
      `### Key Findings\n${findings.map(f => `- ${f}`).join("\n")}\n\n` +
      `### Recommendations\n${recommendations.map(r => `- ${r}`).join("\n")}`;

    state.insights = {
      summary,
      keyFindings: findings,
      recommendations,
    };

    return state;
  }

  protected summarizeOutput(state: AgentState): string {
    return `Generated ${state.insights?.keyFindings.length ?? 0} findings and ${state.insights?.recommendations.length ?? 0} recommendations`;
  }
}
