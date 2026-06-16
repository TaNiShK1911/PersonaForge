# PersonaForge — Causal Micro-Persona Engine

> An AI-powered personalization platform that learns user behavior, builds dynamic micro-personas, identifies causal drivers behind decisions, simulates counterfactual outcomes, generates persona-aware content, and explains every recommendation in plain English — continuously optimized via Thompson Sampling.

**Hackathon MVP** · Next.js 16 + TypeScript + Recharts + Framer Motion + Zustand
ML engine in pure TypeScript: k-means persona clustering, DoWhy-style ATE estimation, structural causal counterfactuals, Thompson-sampling multi-armed bandit.

---

## Why PersonaForge?

Traditional recommendation systems rely on **correlations** ("users who bought X also bought Y"). They:

- Can't explain *why* a recommendation was made
- Confuse correlation with causation (a discount appearing alongside a conversion ≠ discount caused the conversion)
- Treat users as static buckets, not evolving intent trajectories
- Cannot answer "what if we removed urgency messaging?" — the counterfactual question
- Bake in bias from observational data

PersonaForge solves this by combining **causal inference** (DoWhy-style backdoor adjustment), **micro-personas** (dynamic, behavior-driven clusters), **counterfactual simulation**, **explainable AI**, and **reinforcement learning** (Thompson Sampling bandit) into a single, hackathon-grade dashboard.

---

## ✨ Features (8 modules)

| # | Module | What it does |
|---|--------|--------------|
| 1 | **User Behavior Simulator** | Generates 1,000 synthetic users + 70K+ events across 6 hidden personas (deterministic seed) |
| 2 | **Intent Trajectory Model** | LSTM-style sequence model maps each user's events to awareness → interest → consideration → intent → purchase, with confidence + predicted next stage |
| 3 | **Micro-Persona Engine** | K-means clustering over a 7-dim behavior embedding → 6 dynamic personas with traits + confidence |
| 4 | **Causal AI Engine** | DoWhy-style backdoor adjustment estimating ATE for 4 treatments (discount, social proof, reviews, urgency) with bootstrap CIs + permutation p-values |
| 5 | **Counterfactual Simulator** | Interactive "what-if" engine — toggle treatments on/off for any user and see predicted conversion probability |
| 6 | **Personalization Agent** | Generates email subject + body, ad copy, push notification, and product ranking per persona, using causal context |
| 7 | **Explainability Layer** | Plain-English explanation for every recommendation: persona match + causal drivers + similar-campaign uplift + counterfactual delta |
| 8 | **Multi-Armed Bandit** | Live Thompson Sampling over 3 messaging variants — Beta posteriors, regret chart, exploration/exploitation rate |

---

## 🏗️ System Architecture

```
User Events → Behavior Processing → Intent Detection (LSTM-style)
                ↓
        Micro-Persona Engine (k-means)
                ↓
        Causal Analysis (DoWhy-style backdoor adjustment)
                ↓
        Counterfactual Simulator (structural causal model)
                ↓
        Personalization Agent (persona × causal context)
                ↓
        Explainability Layer (plain-English narrative)
                ↓
        Multi-Armed Bandit (Thompson Sampling optimization)
                ↓
        Recommendation Dashboard (8 views)
```

### Folder Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout, dark theme, fonts
│   ├── page.tsx             # Single-page view router (8 views)
│   └── globals.css          # Glassmorphism, dark palette, violet/fuchsia
├── components/
│   ├── personaforge/
│   │   ├── app-shell.tsx    # Sidebar + top bar + view transitions
│   │   └── primitives.tsx   # KpiCard, GlassPanel, StatPill
│   ├── views/
│   │   ├── overview-view.tsx
│   │   ├── user-explorer-view.tsx
│   │   ├── persona-studio-view.tsx
│   │   ├── causal-analysis-view.tsx
│   │   ├── counterfactual-lab-view.tsx
│   │   ├── personalization-center-view.tsx
│   │   ├── explainability-view.tsx
│   │   └── bandit-optimizer-view.tsx
│   └── ui/                  # shadcn/ui component set
├── lib/
│   ├── types.ts             # All TypeScript types
│   ├── store.ts             # Zustand store (dataset + derived + UI state)
│   ├── data/
│   │   └── generator.ts     # Synthetic data generator (1K users, 70K events)
│   ├── ml/
│   │   ├── intent.ts        # Intent trajectory model
│   │   ├── persona.ts       # K-means persona clustering
│   │   ├── causal.ts        # DoWhy-style ATE + permutation tests
│   │   ├── counterfactual.ts # Structural causal model
│   │   └── bandit.ts        # Thompson Sampling
│   └── ai/
│       └── content.ts       # Personalization + explanation generation
└── ...
```

---

## 🎨 Design System

- **Theme**: Dark, glassmorphism, violet/fuchsia accent gradients
- **Typography**: Geist Sans + Geist Mono
- **Charts**: Recharts with custom dark theming
- **Animations**: Framer Motion (page transitions, layout animations, KPI counters)
- **UI**: shadcn/ui (New York style) + custom glass primitives
- **Inspired by**: Vercel, Linear, Stripe Dashboard

---

## 🚀 Quick Start

```bash
# install dependencies
bun install

# start dev server (port 3000)
bun run dev

# production build
bun run build && bun run start

# lint
bun run lint
```

Open <http://localhost:3000> in your browser.

---

## 🔬 ML Pipeline Details

### 1. Synthetic Data Generator (`lib/data/generator.ts`)
- 1,000 users seeded across 6 hidden personas (round-robin)
- Each user gets 3–14 sessions, 5–14 events per session
- 9 event types: page_view, scroll_depth, search, product_click, add_to_cart, wishlist, purchase, time_on_page, exit
- Treatment exposures (discount, social_proof, reviews, urgency) sampled based on per-user responsiveness
- 2D embedding computed deterministically (price-sensitivity × impulse-drive)
- Mulberry32 PRNG → fully reproducible across reloads

### 2. Intent Trajectory Model (`lib/ml/intent.ts`)
- Weighted attention scheme over event sequence with recency decay (0.92)
- 5 intent stages: awareness → interest → consideration → intent → purchase
- Each event type contributes weighted scores to multiple stages
- Outputs: current_stage, confidence_score, predicted_next_stage, stage probabilities, trajectory snapshot

### 3. Persona Engine (`lib/ml/persona.ts`)
- K-means (k=6, 12 iterations) over 7-dim normalized feature vector
- Initialization: evenly-spaced points (deterministic)
- Cluster → persona kind mapped via nearest canonical profile
- Each persona gets: traits (auto-derived from centroid), behavior_embedding, confidence (= 1 − mean_dist/scale), top features

### 4. Causal AI Engine (`lib/ml/causal.ts`)
- **Backdoor adjustment**: stratify users by 4 binary confounders (price sens, urgency resp, review rely, trend aff) → 16 strata
- Within each stratum: P(convert | T=1) − P(convert | T=0)
- ATE = stratum-size-weighted average across strata
- **Bootstrap CIs**: 80 resamples with replacement → 90% CI
- **Permutation p-values**: 200 reshuffles of treatment labels within strata
- 4 treatments × 1 outcome (conversion) = 4 causal effects

### 5. Counterfactual Simulator (`lib/ml/counterfactual.ts`)
- Structural causal model: `P(convert | T) = baseline × Π(1 + ATE_t × user_responsiveness_t)`
- 5 preset scenarios per user: baseline (natural exposure), full stack, discount-only, remove urgency, personalized best treatment
- Live custom scenario builder with on/off toggles per treatment
- Winner = scenario with highest predicted conversion probability

### 6. Multi-Armed Bandit (`lib/ml/bandit.ts`)
- Thompson Sampling with Beta(α, β) posteriors
- 3 arms: A=Discount, B=Urgency, C=Social Proof
- Sampling via Marsaglia-Tsang gamma → Beta ratio
- Each pull: Bernoulli reward with hidden true rate
- Tracks: cumulative reward, cumulative optimal, regret, exploration rate (last 20 pulls), best arm, conversion improvement

### 7. Personalization + Explainability (`lib/ai/content.ts`)
- Persona-conditioned templates for 6 personas × 4 channels (email, ad, push, headline)
- Product ranking: persona × causal responsiveness → top-5 with reasons
- Explanations assemble: persona match + top-2 causal drivers + similar-campaign uplift + counterfactual delta into a single plain-English narrative

---

## 🧪 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), TypeScript 5, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| State | Zustand (UI) + memoized derived state (ML artifacts) |
| ML | Pure TypeScript implementations of k-means, DoWhy-style ATE, structural causal model, Thompson Sampling, Beta PDF |
| Database | In-memory (deterministic seed) — production would use PostgreSQL + Redis per the spec |
| Tooling | Bun, ESLint, Prisma (available for persistence if needed) |

---

## 🎯 Hackathon Differentiators

1. **Causal AI instead of collaborative filtering** — we estimate *what caused* conversion, not just what co-occurs
2. **Explainable recommendations** — every output comes with a plain-English narrative
3. **Counterfactual simulations** — answer "what if?" without running an A/B test
4. **Privacy-first personalization** — built on behavioral features, not PII; no third-party data needed
5. **Reinforcement learning optimization** — Thompson Sampling bandit continuously improves messaging

---

## 📦 Deliverables

| Deliverable | Location |
|-------------|----------|
| Live dashboard | `http://localhost:3000` |
| Source code | `/src` |
| README | this file |
| Demo script for judges | `download/PERSONAFORGE-DEMO-SCRIPT.md` |
| Pitch deck structure | `download/PERSONAFORGE-PITCH-DECK.md` |
| 24-hour implementation roadmap | `download/PERSONAFORGE-ROADMAP.md` |
| Deployment guide | `download/PERSONAFORGE-DEPLOYMENT.md` |
| Screenshots | `download/screenshot-*.png` |

---

## 📄 License

MIT — built for the PersonaForge hackathon. Use freely.
