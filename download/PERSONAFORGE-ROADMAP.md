# PersonaForge — 24-Hour Hackathon Implementation Roadmap

> Built-for-speed schedule · 6-person team · 24 hours total
> Pre-staged: All repos, accounts, design system ready at T=0

---

## Phase 0 — Pre-Hackathon (T-1 week)

| Task | Owner | Status |
|------|-------|--------|
| Set up GitHub org + repos (frontend, backend, infra) | Lead | ✓ |
| Provision Railway Postgres + Redis | DevOps | ✓ |
| Pre-install Claude API + Gemini fallback + LangChain | AI | ✓ |
| Pre-install PyTorch, scikit-learn, XGBoost, DoWhy, CausalML | ML | ✓ |
| Design system tokens (dark, violet, glassmorphism) | Design | ✓ |
| Storyboard the 8 dashboard views | PM | ✓ |
| Demo script + pitch deck skeleton | PM | ✓ |

---

## Phase 1 — Foundation (Hours 0–4)

### Hour 0–1: Kickoff + Architecture Lock-In
- **All hands**: Final architecture diagram on whiteboard
- Confirm 8 modules, API contract, data schema
- Set up Slack channels: `#frontend`, `#backend`, `#ml`, `#design`, `#demo`

### Hour 1–2: Scaffolding
- **Frontend**: `create-next-app` + shadcn/ui init + Tailwind 4 + Recharts + Framer Motion
- **Backend**: FastAPI scaffold + Pydantic models + Postgres + Redis
- **ML**: Python env with PyTorch, DoWhy, CausalML, XGBoost
- **Database schema**: PostgreSQL DDL (see below)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  persona_kind VARCHAR(32),
  features JSONB,
  converted BOOLEAN,
  revenue DECIMAL(10,2),
  created_at TIMESTAMP
);

CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(32),
  timestamp BIGINT,
  properties JSONB,
  page_depth INT
);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_type ON events(type);

CREATE TABLE personas (
  kind VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64),
  traits JSONB,
  embedding VECTOR(7),
  confidence FLOAT,
  member_count INT
);

CREATE TABLE causal_effects (
  treatment VARCHAR(32),
  outcome VARCHAR(32),
  ate FLOAT,
  ci_lower FLOAT,
  ci_upper FLOAT,
  p_value FLOAT,
  sample_treated INT,
  sample_control INT,
  PRIMARY KEY (treatment, outcome)
);

CREATE TABLE bandit_state (
  arm VARCHAR(16) PRIMARY KEY,
  alpha FLOAT,
  beta FLOAT,
  pulls INT,
  rewards INT,
  updated_at TIMESTAMP
);
```

### Hour 2–4: Synthetic Data Generator
- **ML engineer**: Build the user behavior simulator (Python)
  - 1,000 users across 6 personas
  - 70K+ events with realistic distributions
  - Treatment exposures tied to per-user responsiveness
- **Backend**: Loader script → populate Postgres
- **Frontend**: Stub all 8 views with placeholder data + nav working

**Exit criteria**: Live dashboard renders 8 views with mock data.

---

## Phase 2 — Core ML (Hours 4–12)

### Hour 4–6: Intent Trajectory Model
- **ML**: Implement LSTM (or transformer encoder if time allows) over event sequences
- Train/test split; report accuracy + confusion matrix
- **Backend**: `/api/intent/{user_id}` endpoint
- **Frontend**: User Explorer view wires up to live intent predictions

### Hour 6–8: Micro-Persona Engine
- **ML**: K-means or DBSCAN over 7-dim behavior embedding
- Auto-name clusters via LLM (Claude API) — prompt: "Given these trait vectors, name this customer persona"
- **Backend**: `/api/personas` endpoint returns cluster summary
- **Frontend**: Persona Studio view — cards + 2D scatter (t-SNE or PCA projection)

### Hour 8–10: Causal AI Engine
- **ML**: DoWhy backdoor adjustment with 4 confounders
- Compute ATE + bootstrap CIs + permutation p-values for 4 treatments
- **Backend**: `/api/causal/effects` endpoint
- **Frontend**: Causal Analysis view — bar chart with CIs + causal graph SVG

### Hour 10–12: Counterfactual Simulator
- **ML**: Structural causal model fit from ATEs
- Per-user responsiveness modulation
- 5 preset scenarios + custom toggle API
- **Backend**: `/api/counterfactual/{user_id}` endpoint
- **Frontend**: Counterfactual Lab view — interactive toggles, live prediction updates

**Exit criteria**: 4 ML modules working end-to-end, all wired to frontend.

---

## Phase 3 — AI + Optimization (Hours 12–18)

### Hour 12–14: Personalization Agent
- **AI engineer**: LangChain agent that takes (user, persona, causal_drivers) → generates:
  - Email subject + body (Claude API)
  - Ad copy
  - Push notification
  - Product ranking with reasons
- Persona-conditioned prompt templates
- **Backend**: `/api/personalize/{user_id}` endpoint
- **Frontend**: Personalization Center view — tabbed output per channel

### Hour 14–16: Explainability Layer
- **AI engineer**: Template-based explanation generator (deterministic, no LLM call needed for speed)
- Assembles: persona match + causal drivers + counterfactual note + similar-campaign uplift
- **Backend**: `/api/explain/{user_id}` endpoint
- **Frontend**: Explainability Console view — main narrative + driver breakdown cards

### Hour 16–18: Multi-Armed Bandit
- **ML**: Thompson Sampling in Python (Beta posteriors, Marsaglia-Tsang gamma sampling)
- 3 arms: Discount / Urgency / Social Proof
- WebSocket or polling for live updates
- **Backend**: `/api/bandit/step` (single round) + `/api/bandit/state`
- **Frontend**: Bandit Optimizer view — live posterior chart + regret curve + recent pulls

**Exit criteria**: All 8 modules operational end-to-end.

---

## Phase 4 — Polish + Demo (Hours 18–24)

### Hour 18–20: Visual Polish
- **Design**: Final pass on glassmorphism, gradient accents, hover states
- **Frontend**: Framer Motion page transitions, KPI counter animations, chart entry animations
- Empty states + loading states for all views
- Mobile responsive pass (test on iPhone + iPad widths)

### Hour 20–21: Bug Bash
- **All hands**: 30-min bug bash, each team member clicks through every flow
- Fix top 10 P0 bugs
- Verify all 8 views render with real data, no console errors

### Hour 21–22: Demo Rehearsal
- **PM + 1 engineer**: Run the demo script end-to-end
- Time it — must hit 4 minutes
- Pre-pick the "magic user" for counterfactual demo (high-uplift scenario)
- Pre-pick the bandit starting state (run 80 pulls before demo)

### Hour 22–23: Pitch Deck Finalized
- **PM**: Finalize 12-slide pitch deck
- Embed screenshots + GIFs of live demo
- Practice pitch — 5 minutes total, no overtime

### Hour 23–24: Buffer + Final Checks
- Buffer for any last-minute issues
- Final lint + build check
- Deploy to Vercel (frontend) + Railway (backend)
- Smoke test on production URL
- Pre-load the demo URL in a tab before judging starts

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Claude API rate limits | Medium | High | Pre-cache personalization outputs for demo users; fallback to templates |
| DoWhy library setup issues | Medium | High | Have manual backdoor-adjustment implementation ready (this MVP uses it) |
| Bandit doesn't converge in demo | Low | Medium | Pre-run 80 rounds before judging |
| Counterfactual predictions look unrealistic | Medium | High | Sanity-check predictions on 10 demo users; tune model coefficients |
| Live demo crashes | Low | Critical | Have a 90-sec screen recording as backup |
| Pitch runs over 5 min | Medium | Medium | PM cuts slides 4 + 10 if needed; demo is the star |

---

## Team Composition (Recommended)

| Role | Count | Owns |
|------|-------|------|
| Frontend Engineer | 2 | All 8 views + design system |
| ML Engineer | 2 | Causal, counterfactual, bandit, persona |
| AI Engineer | 1 | Personalization + explainability (LangChain) |
| Backend Engineer | 1 | FastAPI + Postgres + Redis + WebSockets |
| PM / Demo Lead | 1 | Demo script, pitch deck, time management |

(For a 4-person team: combine AI + Backend, drop one frontend.)

---

## Post-Hackathon Phase 5 (Bonus)

If we win:

- **Day +1**: Open-source the MVP, write a blog post
- **Week +1**: Reach out to 10 e-commerce brands for pilots
- **Month +1**: Implement real DoWhy causal identification (IV, front-door)
- **Month +3**: Production deploy with first paying customer

---

## Time Budget Cheat Sheet (if running behind)

| If over time by… | Cut this |
|------------------|----------|
| 1 hour | Skip LSTM, use weighted attention (this MVP) |
| 2 hours | Skip LangChain, use templates (this MVP) |
| 3 hours | Skip transformer, use k-means only (this MVP) |
| 4+ hours | Ship this MVP — it has all 8 modules in TypeScript |

**This MVP is the fallback**: All 8 modules in pure TypeScript, no external services required, runs in <1s on a laptop.
