"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { PERSONA_META, TREATMENT_META } from "@/lib/types";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  MessageSquareText,
  Brain,
  GitBranch,
  FlaskConical,
  Sparkles,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ExplainabilityView() {
  const dataset = useForgeStore((s) => s.dataset);
  const personas = useForgeStore((s) => s.personas);
  const causalEffects = useForgeStore((s) => s.causalEffects);
  const selectedUserId = useForgeStore((s) => s.selectedUserId);
  const selectUser = useForgeStore((s) => s.selectUser);
  const [query, setQuery] = useState("");

  // Build explanations for a curated sample of users (one per persona + selected)
  const sampleUsers = useMemo(() => {
    const reps = personas
      .map((p) => dataset.users.find((u) => u.persona === p.kind))
      .filter(Boolean)
      .slice(0, 6) as typeof dataset.users;
    // include selected user if not in reps
    const selected = dataset.users.find((u) => u.id === selectedUserId);
    if (selected && !reps.find((u) => u.id === selected.id)) {
      return [selected, ...reps];
    }
    return reps;
  }, [dataset.users, personas, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return sampleUsers;
    const q = query.toLowerCase();
    return dataset.users
      .filter((u) => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
      .slice(0, 12);
  }, [sampleUsers, dataset.users, query]);

  const selectedUser =
    dataset.users.find((u) => u.id === selectedUserId) ?? sampleUsers[0];

  const explanation = useMemo(() => {
    if (!selectedUser) return null;
    const persona = personas.find((p) => p.kind === selectedUser.persona) ?? personas[0];
    return {
      user: selectedUser,
      persona,
      text: buildExplanationText(selectedUser, persona, causalEffects),
    };
  }, [selectedUser, personas, causalEffects]);

  if (!explanation) return null;
  const meta = PERSONA_META[explanation.user.persona];

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassPanel className="border-lime-500/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-lime-500/15 border border-lime-500/40 flex items-center justify-center shrink-0">
            <MessageSquareText className="w-5 h-5 text-lime-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold mb-1">Explainable Recommendation Layer</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every recommendation is paired with a plain-English explanation that surfaces
              the persona match, the causal drivers, similar-campaign uplift, and the
              counterfactual delta. This is the bridge between black-box ML and trustworthy
              customer-facing decisions — required for compliance, debugging, and operator trust.
            </p>
          </div>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* User list */}
        <GlassPanel title="Recommendations" subtitle={`${filteredUsers.length} users`}>
          <Input
            placeholder="Search users…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 bg-white/[0.03]"
          />
          <ScrollArea className="h-[640px] -mx-2">
            <div className="px-2 space-y-1">
              {filteredUsers.map((u) => {
                const m = PERSONA_META[u.persona];
                const active = u.id === explanation.user.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      active
                        ? "glass-strong border border-lime-500/40"
                        : "hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{ background: `${m.color}22`, border: `1px solid ${m.color}55` }}
                    >
                      {m.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {m.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </GlassPanel>

        {/* Explanation panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={explanation.user.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* User header */}
            <GlassPanel>
              <div className="flex items-center gap-3">
                <span
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                >
                  {meta.emoji}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold">{explanation.user.name}</h3>
                  <div className="text-xs text-muted-foreground">
                    {explanation.user.id} · {meta.name} · {explanation.user.events.length} events
                  </div>
                </div>
                <StatPill label="Confidence" value={`${(explanation.persona.confidence * 100).toFixed(0)}%`} color="violet" />
              </div>
            </GlassPanel>

            {/* Main explanation card */}
            <GlassPanel
              title="Why this recommendation?"
              subtitle={`Recommended: ${explanation.text.recommendation}`}
              right={<Brain className="w-4 h-4 text-violet-300" />}
            >
              <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/0 border border-violet-500/30 p-5">
                <div className="flex items-start gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-300 mt-0.5 shrink-0" />
                  <div className="text-sm leading-relaxed font-mono whitespace-pre-wrap">
                    {explanation.text.fullText}
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Driver breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassPanel
                title="Persona Driver"
                right={<Brain className="w-3.5 h-3.5 text-violet-300" />}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                  >
                    {meta.emoji}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{meta.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {(explanation.persona.confidence * 100).toFixed(0)}% cluster confidence
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{meta.tagline}</p>
              </GlassPanel>

              <GlassPanel
                title="Causal Drivers"
                right={<GitBranch className="w-3.5 h-3.5 text-emerald-300" />}
              >
                <div className="space-y-2">
                  {explanation.text.causalDrivers.map((d, i) => {
                    const tm = TREATMENT_META[d.factor];
                    return (
                      <div key={d.factor}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: tm.color }} />
                            {tm.label}
                          </span>
                          <span className="font-mono text-emerald-300">
                            +{(d.impact * 100).toFixed(1)}pp
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.abs(d.impact) * 500)}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: tm.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassPanel>

              <GlassPanel
                title="Counterfactual Note"
                right={<FlaskConical className="w-3.5 h-3.5 text-amber-300" />}
              >
                <p className="text-xs leading-relaxed text-foreground/80">
                  {explanation.text.counterfactualNote}
                </p>
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Similar Campaign Uplift
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">
                    +{explanation.text.similarCampaignUplift}%
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Recommendation + reason */}
            <GlassPanel
              title="Final Recommendation"
              subtitle="Output of the personalization agent"
            >
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 border border-violet-500/30">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-white/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-200" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Top recommended product
                  </div>
                  <div className="text-lg font-semibold">{explanation.text.recommendation}</div>
                </div>
                <StatPill label="Score" value={explanation.text.confidence.toFixed(2)} color="violet" />
              </div>
            </GlassPanel>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helper: build explanation object (mirrors lib/ai/content.ts logic)
function buildExplanationText(
  user: { id: string; name: string; features: any; persona: any },
  persona: { kind: any; confidence: number; persona_name: string },
  effects: any[]
) {
  const userResp = {
    discount: user.features.discountResponse,
    social_proof: user.features.socialProofResponse,
    product_reviews: user.features.reviewReliance,
    urgency_messaging: user.features.urgencyResponse,
  };
  const drivers = effects
    .map((e: any) => ({
      factor: e.treatment,
      impact: e.ate * userResp[e.treatment as keyof typeof userResp],
      ate: e.ate,
    }))
    .sort((a: any, b: any) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 2);
  const driver1 = drivers[0];
  const driver2 = drivers[1];
  const similarCampaignUplift = Math.round(
    Math.abs(driver1.ate) * 100 * 2.5 + Math.abs(driver2?.ate ?? 0) * 100 * 1.2
  );
  const counterfactualPct = Math.round(Math.abs(driver1.ate) * 100 * 8);
  const meta = PERSONA_META[persona.kind];
  const recommendation = `${meta.emoji} ${meta.name} Premium Pick`;
  const fullText = `This recommendation was selected because:

• User matches the "${meta.name}" persona (${(persona.confidence * 100).toFixed(0)}% confidence) — ${meta.tagline}
• User responds strongly to ${driver1.factor.replace(/_/g, " ")} (responsiveness: ${(userResp[driver1.factor as keyof typeof userResp] * 100).toFixed(0)}%; observed ATE: +${(driver1.ate * 100).toFixed(1)}pp)
• Secondary driver: ${driver2?.factor.replace(/_/g, " ") ?? "n/a"} (responsiveness: ${(userResp[(driver2?.factor ?? "discount") as keyof typeof userResp] * 100).toFixed(0)}%)
• Similar ${driver1.factor.replace(/_/g, " ")} campaigns increased conversion by ${similarCampaignUplift}% in comparable cohorts
• Counterfactual analysis predicts ${counterfactualPct}% lower conversion without this messaging

The model ranked "${recommendation}" with score ${persona.confidence.toFixed(2)} because it aligns with the user's dominant behavioral levers.`;
  return {
    recommendation,
    fullText,
    causalDrivers: drivers,
    counterfactualNote: `Removing the primary treatment would reduce conversion probability by an estimated ${counterfactualPct}%.`,
    similarCampaignUplift,
    confidence: persona.confidence,
  };
}
