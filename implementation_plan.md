# PersonaForge — Final Hackathon Implementation Plan
## Epsilon TeXpedition | AI Hyper-Personalization at Scale
### Integrated 4-Feature Build Plan: RAG Chatbot + Agentic AI + Bazaar Demo Store + Supabase + Telegram Ads

> This version rewrites the earlier plan to fit the **existing PersonaForge website and codebase only**.
> No separate admin dashboard. No parallel UI. Every new feature is integrated into the current PersonaForge app shell, route system, and data model.
> The goal is to turn the current synthetic demo into a live, end-to-end hyper-personalization platform.

---

## 0. What Already Exists in PersonaForge

This plan assumes the current repo as the ground truth.

### Current runtime stack
- Next.js 16 + TypeScript
- Bun
- Prisma
- Redis fallback / BullMQ pipeline
- NextAuth
- Zustand
- Recharts
- shadcn/ui
- AI provider chain with fallback behavior

### Current platform surfaces
PersonaForge already exposes the core marketing intelligence endpoints and dashboard concepts:
- `/api/events`
- `/api/personalize`
- `/api/users`
- `/api/users/[id]`
- `/api/personas`
- `/api/analytics`
- `/api/bandit`
- `/api/bandit/update`
- `/api/counterfactual`
- `/api/health`
- `/api/metrics`
- `/api/docs`

The current UI already has the main dashboard views and a synthetic-data foundation. The job now is not to rebuild it — the job is to **upgrade it in place**.

### Current constraint to fix first
The demo store cannot depend on authenticated admin-only ingestion. The existing `/api/events` path is protected. The build must therefore add a **public event ingestion path** for the Bazaar demo store and keep the internal protected APIs for the dashboard.

---

## 1. Final Target Architecture

PersonaForge remains the single product. The new features are just additional modules inside the same system.

```text
PersonaForge Website (single app)
├── Existing dashboard views
│   ├── Overview
│   ├── Personas
│   ├── Users
│   ├── Analytics
│   ├── Bandit Optimizer
│   ├── Counterfactual Lab
│   └── Events
│
├── New integrated views
│   ├── AI Copilot (RAG chatbot)
│   ├── Agent Console
│   ├── Live Demo Monitor
│   └── Telegram Ad Feed
│
├── API layer
│   ├── existing internal routes
│   ├── /api/chat
│   ├── /api/agents
│   ├── /api/agents/run
│   ├── /api/events/public
│   ├── /api/personalize/public
│   └── /api/telegram/push
│
├── Data layer
│   ├── Prisma ORM
│   ├── Supabase PostgreSQL
│   ├── pgvector for RAG embeddings
│   └── Supabase auth/storage if needed
│
└── Background layer
    ├── BullMQ jobs
    ├── persona refresh
    ├── embedding refresh
    ├── agent runs
    └── telegram push jobs
```

### The requested agent chain
The agent system must follow this exact delegated order:

**SupervisorAgent → PersonaClassifierAgent → ContentGeneratorAgent → BanditOptimizerAgent → InsightAgent → CounterfactualAgent**

The SupervisorAgent orchestrates the run, collects outputs, then writes the final synthesis back into PersonaForge.

---

## 2. Build Order

The build should happen in this order:

1. Supabase migration and schema alignment
2. Public event / personalization endpoints for the Bazaar demo store
3. RAG chatbot inside PersonaForge
4. Agentic system inside PersonaForge
5. Live demo monitor inside PersonaForge
6. Bazaar website integration with the public APIs
7. Telegram ad bot
8. Final deployment and demo rehearsal

This order matters. The live demo depends on stable ingestion and stable personalization endpoints.

---

## 3. Feature 1 — RAG Chatbot Inside PersonaForge

### Goal
Add a chatbot directly inside the existing PersonaForge website so marketers can ask questions in natural language and get answers grounded in live platform data.

### User-facing behavior
The chatbot should live inside the existing PersonaForge app shell as a new page or panel, not a separate website.

Example questions:
- Which persona converts best on discounts?
- What treatment should I use for price-sensitive users?
- Which content angle works best for trend chasers?
- What would happen if I increase urgency messaging?
- Run the agentic system on my top users.

### What the chatbot must do
- Retrieve live data from Supabase-backed PersonaForge tables
- Retrieve persona, analytics, user, recommendation, and counterfactual context using pgvector
- Ground the response in current database facts
- Offer a direct action path into the agentic system
- Store conversation history inside PersonaForge

### New Prisma models
Add the following models to `prisma/schema.prisma`:

```prisma
model ChatConversation {
  id          String      @id @default(cuid())
  authUserId  String?
  title       String?
  context     String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  messages    ChatMessage[]

  @@index([authUserId])
  @@index([createdAt])
}

model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String
  content        String
  sources        String?
  tokensUsed     Int      @default(0)
  latencyMs      Int      @default(0)
  provider       String?
  agentTrace     String?
  createdAt      DateTime @default(now())

  conversation   ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}
```

### RAG storage in Supabase
Use Supabase PostgreSQL with `pgvector` for retrieval.

Create a table for embeddings:
- `embeddings`
- `document_type`
- `document_id`
- `content`
- `metadata`
- `embedding`

Add a similarity function like `match_embeddings(...)` so PersonaForge can do vector search for user, persona, and analytics records.

### RAG indexing strategy
Index these document classes:
- User profile summaries
- Persona summaries
- Analytics snapshots
- Recommendation summaries
- Counterfactual results
- Generated content examples

### New library layer
Create a dedicated RAG layer inside PersonaForge:
- `src/lib/rag/embed.ts`
- `src/lib/rag/indexers.ts`
- `src/lib/rag/chat.ts`
- `src/lib/rag/prompts.ts`

### RAG workflow
1. User asks a question in the PersonaForge chatbot
2. Query is embedded
3. Relevant records are fetched from Supabase using vector similarity
4. Retrieved records and live database stats are assembled into a prompt
5. Claude or the configured provider generates the answer
6. Response is stored in the chat conversation thread
7. If the question implies an action, the UI shows a “run agentic analysis” button

### New API route
Create:

- `POST /api/chat`
- `GET /api/chat`

`POST /api/chat` should:
- accept the user question
- retrieve relevant context
- generate the response
- store messages
- return answer + sources + suggested action

### New PersonaForge UI view
Add a new integrated view:
- **AI Copilot**

This view should:
- sit in the existing app shell nav
- reuse the existing PersonaForge styling
- show chat history, source citations, and action buttons
- allow users to trigger agent runs from chat answers

### Deliverable from this feature
A marketer can stay inside PersonaForge and ask:
- “Write me a campaign for impulse buyers”
- “Explain the top persona drivers”
- “Show me why this user is high value”
without leaving the platform.

---

## 4. Feature 2 — Agentic AI System Inside PersonaForge

### Goal
Replace single-shot LLM behavior with a structured multi-agent orchestration layer, still embedded in PersonaForge.

### Required chain
Use the exact chain below as the canonical execution flow:

**SupervisorAgent → PersonaClassifierAgent → ContentGeneratorAgent → BanditOptimizerAgent → InsightAgent → CounterfactualAgent**

### Meaning of each agent
**SupervisorAgent**  
Controls the run, chooses the path, merges outputs, and writes the final recommendation.

**PersonaClassifierAgent**  
Classifies the user into the best-fitting persona using behavior, engagement, and profile signals.

**ContentGeneratorAgent**  
Generates persona-specific campaign content:
- email copy
- ad copy
- push copy
- headline variants

**BanditOptimizerAgent**  
Chooses the most promising treatment arm using bandit state and prior performance.

**InsightAgent**  
Produces concise, business-facing observations from user, persona, and analytics data.

**CounterfactualAgent**  
Runs what-if analysis and estimates how outcomes might change under alternative treatments.

### Why this should exist inside PersonaForge
The agentic system is not a separate product. It is the operational intelligence layer behind:
- chat actions
- campaign generation
- analysis reports
- demo explainability
- live persona decisions

### New Prisma model
Add an `AgentRun` table.

```prisma
model AgentRun {
  id             String   @id @default(cuid())
  conversationId String?
  triggeredBy    String
  status         String   @default("running")
  input          String
  output         String?
  trace          String?
  agentsUsed     String
  totalTokens    Int      @default(0)
  latencyMs      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
  @@index([conversationId])
}
```

### Agent runtime design
Create a shared state object that carries:
- userId
- personaKind
- question
- goal
- personaProfile
- generatedContent
- treatmentChoice
- insights
- counterfactualResult
- trace log

Each agent updates the shared state and returns it to the SupervisorAgent.

### New code structure
Add a dedicated agent folder:

- `src/lib/agents/types.ts`
- `src/lib/agents/base-agent.ts`
- `src/lib/agents/supervisor-agent.ts`
- `src/lib/agents/persona-classifier-agent.ts`
- `src/lib/agents/content-generator-agent.ts`
- `src/lib/agents/bandit-optimizer-agent.ts`
- `src/lib/agents/insight-agent.ts`
- `src/lib/agents/counterfactual-agent.ts`

### Orchestration behavior
The SupervisorAgent should:
1. Read the user goal or chat context
2. Dispatch PersonaClassifierAgent if a user/persona target exists
3. Dispatch ContentGeneratorAgent to produce persona-aware assets
4. Dispatch BanditOptimizerAgent to select the best treatment
5. Dispatch InsightAgent to summarize the opportunity
6. Dispatch CounterfactualAgent to estimate alternative outcomes
7. Write a final synthesized recommendation
8. Persist the full trace to the database

### New API routes
Add:
- `GET /api/agents`
- `POST /api/agents/run`

`POST /api/agents/run` should:
- create an AgentRun record
- run the agent chain
- update the run result
- return a run id immediately
- allow the UI to poll for completion

### New PersonaForge UI view
Add:
- **Agent Console**

This view should:
- show all recent runs
- display status, runtime, token usage, and output
- let the user trigger a demo agent run
- show the sequential agent chain visually
- expose the final generated output and counterfactual result

### Connection to the chatbot
If a chat response detects an analysis intent, show a button:
- Run with agents

That button should send the current context into the agent system and show the result inside the Agent Console.

### Deliverable from this feature
PersonaForge becomes a real agentic marketing engine, not just a chat wrapper.

---

## 5. Feature 3 — Bazaar Website Integration With Backend

### Goal
Use the existing Lovable-built Bazaar website as a live behavior simulator that feeds PersonaForge with real-time events.

This is not a replacement for PersonaForge. It is a behavioral input source for PersonaForge.

### What the Bazaar site must do
The Bazaar website should:
- track page views
- track category browsing
- track product views
- track add-to-cart
- track checkout starts
- track purchases
- track search queries
- track scroll depth
- request personalized content from PersonaForge

### Integration principle
The Bazaar site should never write directly into PersonaForge internals. It should only call public PersonaForge endpoints.

### Public PersonaForge endpoints required
Add these routes:

- `POST /api/events/public`
- `GET /api/personalize/public`
- `POST /api/telegram/push`
- optionally `GET /api/live/status`

### Public event ingestion requirements
`/api/events/public` must:
- accept anonymous or semi-anonymous demo user IDs
- validate the payload
- create or update the user record
- enqueue event ingestion into BullMQ
- trigger persona refresh
- trigger recommendation refresh
- optionally trigger Telegram push if a persona changes meaningfully

### Public personalization requirements
`/api/personalize/public` must:
- accept the Bazaar user id
- return:
  - persona kind
  - persona label
  - headline
  - CTA
  - short recommendation summary
  - optional product/content variant
- respond quickly enough for homepage and product pages

### Bazaar client integration
In the Bazaar frontend:
- create a small PersonaForge SDK module
- track user actions on every key page
- keep a stable local demo user id
- call `getPersonalization()` on page load and on refresh intervals
- render a “Personalized For You” section on the homepage
- show a persona badge or micro-label on product pages

### Bazaar SDK responsibilities
The SDK should:
- create and persist a demo user id
- send page events to PersonaForge
- request live personalization
- degrade gracefully if the backend is down
- keep demo interactions simple and reliable

### Live demo monitor inside PersonaForge
Add a **Live Demo Monitor** view to the existing PersonaForge app.

This should show:
- incoming Bazaar events
- persona changes over time
- purchase/add-to-cart signals
- latest user state
- latest personalized output
- a “live activity feed” feel for judges

### Why this is important
This is the proof that PersonaForge is not just generating text. It is reacting to live behavior and updating decisions in real time.

---

## 6. Feature 4 — Supabase Migration

### Goal
Move the project from local/dev storage to Supabase PostgreSQL so the demo is production-like and persistence is centralized.

### Migration philosophy
Do the migration without changing the product shape.

Keep the app behavior the same. Move the data layer only.

### Prisma datasource update
Update Prisma to use PostgreSQL in production and Supabase connection URLs.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Supabase responsibilities
Supabase will store:
- users
- personas
- events
- sessions
- recommendations
- counterfactual experiments
- bandit variants
- bandit observations
- generated content
- explanations
- analytics snapshots
- chat conversations
- chat messages
- agent runs
- embeddings
- telegram subscriptions

### Migration steps
1. Create Supabase project
2. Enable PostgreSQL
3. Enable `pgvector`
4. Generate new database URLs
5. Run Prisma migration against Supabase
6. Seed personas, demo users, and bandit state
7. Seed RAG embeddings
8. Verify all existing API routes still work
9. Switch production deployment to Supabase URLs

### Extra tables for the new features
Add:
- `chat_conversations`
- `chat_messages`
- `agent_runs`
- `embeddings`
- `telegram_subscriptions`

### Data handling rules
- internal dashboard data stays under authenticated APIs
- demo store calls public APIs only
- embeddings are refreshed asynchronously
- agent run traces are persisted for demo explainability
- Telegram subscriptions are persistent and queryable

### Why Supabase matters for the demo
It gives:
- stable persistence
- live retrieval for RAG
- vector search
- cleaner deployment
- easier judge demonstration
- less risk than local SQLite for the final presentation

---

## 7. Feature 5 — Telegram Bot for Personalized Advertisement Pushing

### Goal
Push persona-specific ads to Telegram when a meaningful user event or persona change occurs.

### Why this feature is strong for the hackathon
It shows personalization outside the website itself. PersonaForge becomes a multi-channel activation engine.

### Telegram bot behavior
The bot should:
- accept subscriptions to one or more personas
- accept a demo subscribe command
- store subscriptions in Supabase
- receive push jobs from PersonaForge
- send persona-specific ads to the subscribed Telegram chats

### Bot location
Use the existing `mini-services/` folder for the bot service.

### Telegram bot commands
Support:
- `/start`
- `/subscribe`
- `/unsubscribe`
- `/mystats`
- `/demo`

### Bot data model
Create a table:

```sql
telegram_subscriptions
- id
- chat_id
- persona_kind
- created_at
```

### Push payload contract
PersonaForge should send:
- personaKind
- headline
- cta
- generatedContent
- optional reasoning or source note

### Ad generation
The advertisement should be generated from:
- persona kind
- current product or offer
- selected treatment
- content generator output
- bandit choice
- current live context

### Telegram push workflow
1. Bazaar user action changes persona state
2. PersonaForge detects meaningful update
3. BullMQ enqueues `telegram-push`
4. Telegram bot looks up subscriptions
5. Persona-specific ad is generated
6. The ad is sent to the matching chats

### Bot failure tolerance
If the bot service is unavailable:
- the push job is queued again
- or stored as a pending delivery
- the demo can still proceed using the Agent Console and Live Demo Monitor

---

## 8. Integrated UI Plan Inside PersonaForge

The current website should remain the same product shell. Add only the views that support the new workflow.

### Existing views stay
- Overview
- Users
- Personas
- Analytics
- Counterfactual Lab
- Bandit Optimizer
- Events

### New integrated views
- AI Copilot
- Agent Console
- Live Demo Monitor
- Telegram Feed

### Navigation rule
All of these live inside the current PersonaForge app shell. No second dashboard. No separate product clone.

### UX priority
The judge should be able to do the entire demo from one browser tab:
- see live events
- ask the chatbot
- trigger agents
- inspect the generated ad
- show the Telegram push
- show causal and bandit output

---

## 9. API Contract Summary

### Internal authenticated APIs
- `/api/users`
- `/api/personas`
- `/api/analytics`
- `/api/bandit`
- `/api/counterfactual`
- `/api/chat`
- `/api/agents`
- `/api/agents/run`

### Public demo APIs
- `/api/events/public`
- `/api/personalize/public`

### Messaging / push APIs
- `/api/telegram/push`

### Background jobs
- `ingest-event`
- `update-persona`
- `run-counterfactual`
- `generate-content`
- `snapshot-analytics`
- `embed-user`
- `embed-persona`
- `embed-analytics`
- `multi-agent-analyze`
- `telegram-push`

---

## 10. Environment Variables

### PersonaForge
```bash
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
REDIS_URL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DEMO_STORE_API_KEY=
DEMO_STORE_ORIGIN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_SECRET=
TELEGRAM_BOT_URL=
```

### Bazaar website
```bash
NEXT_PUBLIC_PERSONAFORGE_URL=
NEXT_PUBLIC_PERSONAFORGE_KEY=
```

### Telegram bot
```bash
TELEGRAM_BOT_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
PERSONAFORGE_API_URL=
PERSONAFORGE_API_KEY=
```

---

## 11. Implementation Checklist

### Phase 1 — data and public integration
- migrate Prisma to Supabase
- enable pgvector
- add embeddings table
- add telegram subscriptions table
- add public event ingestion endpoint
- add public personalization endpoint

### Phase 2 — RAG
- create embeddings indexers
- create chatbot route
- add AI Copilot view
- seed embeddings
- verify retrieval grounded in live data

### Phase 3 — agentic system
- add AgentRun table
- create supervisor and sub-agents
- add agent execution route
- add Agent Console view
- connect chat to agents

### Phase 4 — Bazaar integration
- wire Bazaar SDK
- track live events
- request personalized homepage content
- show live demo activity in PersonaForge

### Phase 5 — Telegram bot
- create bot service
- create subscription store
- create push handler
- send persona-specific ads
- test end-to-end delivery

### Phase 6 — final hardening
- add caching and rate limiting
- verify all public endpoints
- verify Supabase persistence
- verify demo fallbacks
- verify final judge flow

---

## 12. Demo Script

### Demo sequence
1. Open PersonaForge dashboard
2. Show live analytics and existing persona intelligence
3. Open Bazaar website in a second tab or phone
4. Browse products and add to cart
5. Watch the Live Demo Monitor update in PersonaForge
6. Show the chatbot explaining the live persona
7. Trigger the agentic system from chat
8. Show the full chain output in Agent Console
9. Refresh Bazaar and show the personalized content changed
10. Show the Telegram ad delivered to the subscribed chat

### What the judge should understand
- PersonaForge sees behavior
- PersonaForge classifies the user
- PersonaForge reasons about the next best action
- PersonaForge generates content
- PersonaForge chooses the best treatment
- PersonaForge pushes the ad across channels

---

## 13. What Makes This Better Than the First-Round Build

The first-round build showed the idea. This final version shows a real platform.

The upgrade is not “more pages.”  
The upgrade is:
- live behavior ingestion
- grounded retrieval
- agent orchestration
- omnichannel activation
- persistent storage
- production-style deployment

That is what makes it feel like a real MarTech system rather than a prototype.

---

## 14. Fallback Plan

If something breaks during the demo, keep the flow alive.

### Fallback order
1. Show PersonaForge on synthetic data if Supabase is not ready
2. Show precomputed agent runs if live agents are slow
3. Show cached personalization if public endpoints fail
4. Show the Telegram bot locally if remote deployment fails
5. Show the Bazaar site with mocked event callbacks if network issues occur

### Non-negotiable fallback rule
The PersonaForge UI must always remain the single source of truth in the demo. Even if other services fail, the explanation and the business logic must still be visible there.

---

## 15. Final Deliverable Summary

By the end, the system should deliver all of the following inside one connected ecosystem:

1. **RAG chatbot inside PersonaForge**
2. **Agentic AI system inside PersonaForge**
3. **Bazaar website connected to PersonaForge backend**
4. **Supabase migration**
5. **Telegram bot that pushes persona-specific ads**

This is the final integrated hackathon product.
