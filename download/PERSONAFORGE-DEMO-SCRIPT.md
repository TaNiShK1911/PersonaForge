# PersonaForge — Demo Script for Judges (4 minutes)

> Total runtime: ~3 min 45 sec · Built for live pitch + screen-share demo

---

## Opening Hook (15 sec)

> "Every recommendation system on Earth tells you *what* — none of them tell you *why*.
> PersonaForge is the first platform that explains every recommendation using **causal AI** —
> not correlations, but actual causal drivers — and lets you simulate *what-if* scenarios
> before you spend a dollar on A/B testing."

---

## 1. Overview Dashboard (30 sec)

**Action**: Land on the **Overview** view (default).

**Say**: "We're looking at a synthetic dataset of **1,000 users and 70,000+ behavioral events** across 6 hidden micro-personas. The dashboard surfaces live KPIs — active users, conversion rate, revenue impact — and breaks down revenue by causal treatment, not just by persona."

**Highlight**:
- 14-day revenue trend with conversion overlay (Area chart)
- Conversion funnel across 5 intent stages with drop-off %
- Causal Revenue Impact bar chart — "Discount is our top causal driver at +X percentage points ATE"
- Persona performance table — note Luxury Seeker has highest avg revenue ($397) despite smaller size

---

## 2. User Explorer + Intent Trajectory (45 sec)

**Action**: Click **User Explorer** in sidebar. Click any user.

**Say**: "Click any user and you see their full event timeline — 9 event types including treatment exposures — plus a live **intent trajectory model**. This is an LSTM-style sequence model that maps the user's events to their current stage in the journey: awareness → interest → consideration → intent → purchase."

**Highlight**:
- Top-right shows current stage + confidence + predicted next stage
- The trajectory line chart visualizes how the user moved through stages over their journey
- Behavioral features panel shows per-user responsiveness to each treatment
- Event timeline shows treatment exposures (🏷️ discount, 👥 social-proof, ⭐ review, ⏰ urgency) inline with each event

---

## 3. Persona Studio (30 sec)

**Action**: Click **Persona Studio**.

**Say**: "Behind the scenes, k-means clustering over a 7-dimensional behavior embedding identified **6 dynamic micro-personas**. Each cluster has a name, traits, member count, conversion rate, average revenue, and confidence score."

**Highlight**:
- Persona cards with traits auto-derived from cluster centroids
- **2D embedding scatter plot** showing how clusters separate in feature space
- X-axis = price sensitivity × brand affinity; Y-axis = urgency × trend response
- Centroid table with confidence scores (90%+ across all clusters)

---

## 4. Causal Analysis — THE KEY SLIDE (45 sec)

**Action**: Click **Causal Analysis**.

**Say**: "This is our core differentiator. We use a **DoWhy-style backdoor adjustment** to estimate the **Average Treatment Effect** of each marketing treatment on conversion — adjusting for confounders like price sensitivity, urgency response, review reliance, and trend affinity."

**Highlight**:
- ATE bar chart with 90% bootstrap CIs
- p-values from permutation tests (200 reshuffles)
- The verdict column: ✓ Causal vs ◐ Correlation
- "Discount isn't just correlated with conversion — we've *causally* estimated it adds +X percentage points"
- **Causal graph** showing treatment → outcome edges with edge width ∝ |ATE|
- Confounder backdoor paths visualized

---

## 5. Counterfactual Lab — THE WOW MOMENT (45 sec)

**Action**: Click **Counterfactual Lab**.

**Say**: "Now the killer feature: **counterfactual simulation**. Pick any user — we use a structural causal model fit from the ATEs to predict what *would have happened* if we changed the treatment stack."

**Highlight**:
- 4 preset scenarios: Full Stack, Discount Only, Remove Urgency, Personalized Best Treatment
- The bar chart compares predicted conversion probability across scenarios
- **Winner card** shows the highest-conversion scenario with uplift %
- **Build Your Own Scenario** panel — toggle Discount ON, then Product Reviews ON
- "Watch the prediction update live — we just predicted this user would convert at 95% with this treatment combo, vs. 65% baseline. **That's a 46% uplift prediction without ever running an A/B test.**"

---

## 6. Personalization Center (30 sec)

**Action**: Click **Personalization**.

**Say**: "The personalization agent reads the persona + causal drivers and generates **persona-aware marketing copy** — email, ad, push notification, and product ranking — all conditioned on what the causal engine identified as the user's strongest levers."

**Highlight**:
- Click between personas (Bargain Hunter → Luxury Seeker → Impulse Buyer)
- Watch the headline shift from "Flash Sale: Save 30%" → "Premier Collection — By Invitation" → "Only 3 Left — Yours in 2 Hours"
- Email body, ad creative, push notification all transform
- **Headline Variants by Persona** at the bottom — shows all 6 personas side-by-side

---

## 7. Explainability Console (20 sec)

**Action**: Click **Explainability**.

**Say**: "Every recommendation comes with a **plain-English explanation** — persona match, top causal drivers with responsiveness %, similar-campaign uplift, and the counterfactual delta. This is what compliance teams, operators, and end users actually need to trust an AI."

**Highlight**: Read the bullet-pointed explanation aloud — it's literally judge-readable.

---

## 8. Bandit Optimizer (30 sec)

**Action**: Click **Bandit Optimizer**.

**Say**: "Finally, we don't just predict — we **continuously optimize**. A Thompson Sampling multi-armed bandit tests three messaging variants in production. Each arm maintains a Beta posterior; we sample from each and pull the highest."

**Highlight**:
- Click **+50** button → watch rounds jump, posteriors sharpen, regret curve grow sub-linearly
- **Beta Posterior Distributions** chart shows the live PDF of each arm's true conversion rate
- The best arm gets identified automatically; exploitation rate climbs as exploration declines
- "Conversion Improvement shows the lift the bandit has unlocked — +X% over the average arm"

---

## Closing (15 sec)

> "PersonaForge replaces correlation-based recommendations with **causal, explainable, counterfactual, continuously-optimized** personalization.
> We didn't just build a dashboard — we built a new way of thinking about *why* customers convert.
> Thank you — questions?"

---

## Q&A Prep

| Likely question | Answer |
|-----------------|--------|
| "Why not just use collaborative filtering?" | CF can't explain, can't counterfactual, and bakes in bias from observational data. Causal AI addresses all three. |
| "Is the causal identification really valid?" | Backdoor adjustment is the textbook DoWhy approach. We'd extend with IV / front-door in production. |
| "How does this scale?" | The expensive parts (causal estimation, persona clustering) run offline in batches. Online serving uses cached models — ms-latency. |
| "Privacy?" | Built on behavioral features, not PII. Federated learning compatible. No third-party cookies needed. |
| "How would you validate the counterfactuals?" | Hold out a random sample, run actual A/B tests, compare uplift predictions vs. observed. |
| "What's the production stack?" | FastAPI + PyTorch + DoWhy + CausalML on backend, Postgres + Redis, deployed on Railway/Vercel. |
