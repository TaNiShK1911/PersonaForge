"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useForgeStore } from "@/lib/store";
import { PERSONA_META, PERSONA_KINDS, PersonaKind } from "@/lib/types";
import { generatePersonalization } from "@/lib/ai/content";
import { GlassPanel, StatPill } from "@/components/personaforge/primitives";
import {
  Mail,
  Megaphone,
  Smartphone,
  Star,
  Sparkles,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRESET_USERS: Record<PersonaKind, string | null> = {
  price_sensitive: null,
  brand_loyal: null,
  impulse_buyer: null,
  research_oriented: null,
  luxury_seeker: null,
  trend_follower: null,
};

export function PersonalizationCenterView() {
  const dataset = useForgeStore((s) => s.dataset);
  const personas = useForgeStore((s) => s.personas);

  // For each persona, find one representative user (first user of that persona)
  const representatives = useMemo(() => {
    const reps: Record<PersonaKind, typeof dataset.users[number] | undefined> = {} as any;
    for (const k of PERSONA_KINDS) {
      reps[k] = dataset.users.find((u) => u.persona === k);
    }
    return reps;
  }, [dataset.users]);

  const [selectedPersona, setSelectedPersona] = useState<PersonaKind>("price_sensitive");
  const user = representatives[selectedPersona];
  const persona = personas.find((p) => p.kind === selectedPersona) ?? personas[0];
  const output = useMemo(
    () => (user && persona ? generatePersonalization(user, persona) : null),
    [user, persona]
  );

  if (!user || !output) return null;
  const meta = PERSONA_META[selectedPersona];

  return (
    <div className="space-y-4">
      {/* Persona selector */}
      <GlassPanel
        title="Personalization Engine"
        subtitle="Persona-aware content generation across email, ads, push, and product ranking"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {PERSONA_KINDS.map((k) => {
            const m = PERSONA_META[k];
            const active = k === selectedPersona;
            return (
              <button
                key={k}
                onClick={() => setSelectedPersona(k)}
                className={`relative p-3 rounded-lg border transition-all ${
                  active
                    ? "glass-strong border-2"
                    : "bg-white/[0.02] border-white/5 hover:border-white/20"
                }`}
                style={active ? { borderColor: m.color } : {}}
              >
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-[11px] font-medium leading-tight">{m.name}</div>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {/* User context */}
      <GlassPanel>
        <div className="flex items-center gap-3">
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
          >
            {meta.emoji}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{user.name}</h3>
              <StatPill label="Persona" value={meta.name} color="violet" />
              <StatPill label="User ID" value={user.id} color="cyan" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.tagline}</p>
          </div>
          <div className="hidden md:flex gap-3 text-right">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Sessions</div>
              <div className="text-base font-semibold">{user.sessions}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Events</div>
              <div className="text-base font-semibold">{user.events.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Revenue</div>
              <div className="text-base font-semibold">${user.revenue}</div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Personalized content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Email preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <GlassPanel
            title="Email Content"
            subtitle="Subject line + body tailored to persona + causal drivers"
            right={<Mail className="w-4 h-4 text-violet-300" />}
          >
            <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 font-mono text-xs space-y-2">
              <div>
                <span className="text-muted-foreground">From: </span>
                <span>team@personaforge.dev</span>
              </div>
              <div>
                <span className="text-muted-foreground">To: </span>
                <span>{user.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Subject: </span>
                <span className="text-violet-300 font-semibold">{output.emailSubject}</span>
              </div>
              <div className="border-t border-white/5 pt-3 mt-3 whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans">
                {output.emailBody}
              </div>
              <div className="pt-3 mt-3 border-t border-white/5">
                <button className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: meta.color }}>
                  {output.cta}
                </button>
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        {/* Ad + Push */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassPanel
              title="Ad Copy"
              subtitle="High-intent ad creative for retargeting"
              right={<Megaphone className="w-4 h-4 text-fuchsia-300" />}
            >
              <div
                className="rounded-lg p-4 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}05)`,
                  border: `1px solid ${meta.color}55`,
                }}
              >
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Sponsored
                </div>
                <div className="text-lg font-semibold mb-2">{output.headline}</div>
                <div className="text-sm text-foreground/80 mb-3">{output.adCopy}</div>
                <button
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white"
                  style={{ background: meta.color }}
                >
                  {output.cta}
                </button>
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <GlassPanel
              title="Push Notification"
              subtitle="Lock-screen push optimized for the persona"
              right={<Smartphone className="w-4 h-4 text-cyan-300" />}
            >
              <div className="rounded-lg bg-black/40 border border-white/10 p-3 flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
                >
                  {meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">PersonaForge</span>
                    <span className="text-[10px] text-muted-foreground">now</span>
                  </div>
                  <div className="text-sm mt-0.5">{output.pushNotification}</div>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </div>

      {/* Product ranking */}
      <GlassPanel
        title="Personalized Product Ranking"
        subtitle="Top-5 products ranked by persona fit + causal context"
        right={
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs text-muted-foreground">
              Model score ∑ (persona match × causal uplift)
            </span>
          </div>
        }
      >
        <div className="space-y-2">
          {output.productRanking.map((p, i) => (
            <motion.div
              key={p.productId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-white/10 flex items-center justify-center text-xs font-bold">
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {p.productId}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.reason}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24">
                  <div className="text-[10px] text-muted-foreground mb-1">Score</div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.score * 100}%` }}
                      transition={{ delay: i * 0.08 + 0.2, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ background: meta.color }}
                    />
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold" style={{ color: meta.color }}>
                  {p.score.toFixed(2)}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassPanel>

      {/* CTA Headline Comparison */}
      <GlassPanel
        title="Headline Variants by Persona"
        subtitle="Side-by-side: how the same product would be pitched differently per persona"
      >
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {PERSONA_KINDS.map((k) => {
              const m = PERSONA_META[k];
              const rep = representatives[k];
              if (!rep) return null;
              const persona = personas.find((p) => p.kind === k);
              if (!persona) return null;
              const out = generatePersonalization(rep, persona);
              return (
                <div
                  key={k}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02]"
                >
                  <span
                    className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
                    style={{ background: `${m.color}22`, border: `1px solid ${m.color}55` }}
                  >
                    {m.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{m.name}</div>
                    <div className="text-sm font-medium truncate">{out.headline}</div>
                  </div>
                  <div className="text-xs font-mono" style={{ color: m.color }}>
                    {out.cta}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </GlassPanel>

      <GlassPanel className="border-violet-500/30">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-violet-300" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">How it works: </span>
            The personalization agent reads the user's persona + causal driver profile,
            then composes a headline, email, ad, push, and product ranking using
            persona-conditioned templates. The CTA, urgency language, and product ordering
            all shift based on what the causal engine identified as the user's strongest
            behavioral levers — turning explainable causal insights into directly-actionable
            marketing copy.
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
