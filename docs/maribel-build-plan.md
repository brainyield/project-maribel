# Project Maribel — Phased Build Plan for Claude Code

> **Purpose:** This document breaks the V2 spec into sequential Claude Code sessions. Each phase is scoped to fit within a single Claude Code session, has clear entry/exit criteria, and includes the specific prompt to give Claude Code.

---

## Overview: 8 Phases

| Phase | What Gets Built | Estimated Effort | Dependencies |
|-------|----------------|-----------------|--------------|
| **0** | Repo scaffold, CLAUDE.md, setup guide, all reference docs committed | Light | None |
| **1** | Ivan's manual setup steps | Manual (Ivan) | Phase 0 |
| **2** | Supabase schema + migrations | Medium | Phase 0 |
| **3** | Knowledge base + RAG ingestion | Medium | Phase 2 |
| **4** | Core n8n workflows (DM handler + supporting) | Heavy | Phases 2, 3 |
| **5** | Comment-to-DM + secondary workflows | Medium | Phase 4 |
| **6** | Admin UI (standalone app) | Medium | Phase 2 |
| **7** | Docs, scripts, testing, hardening | Medium | All above |

---

## How Context Works Across Sessions

Claude Code is a terminal tool — there's no file upload. Instead, all reference documents live **in the repo itself**, and Claude Code reads them from disk at the start of each session.

**`CLAUDE.md`** is special: Claude Code reads it **automatically** when it starts in the repo directory. It's the persistent memory across all sessions — containing project context, architectural decisions, assumption fixes, and conventions that every phase needs.

All other reference docs (the spec, the assumptions guide, this build plan) are committed to the `docs/` folder during Phase 0. Each phase prompt tells Claude Code to read the specific files it needs.

**Directory structure for reference docs:**

```
project-maribel/
├── CLAUDE.md                                    # Auto-read every session
├── docs/
│   ├── project-maribel-spec-v2.md               # The full V2 spec
│   ├── maribel-assumptions-resolution.md         # Assumptions resolution guide
│   ├── maribel-build-plan.md                     # This file
│   ├── meta-app-review-guide.md
│   └── ...
```

---

## Phase 0 — Repo Scaffold + CLAUDE.md + Setup Guide

**Goal:** Create the GitHub repo with all reference documents committed, the CLAUDE.md file that will guide every future session, the SETUP.md for Meta Platform setup, and the full directory scaffolding. No infrastructure is created yet — this is documentation, reference docs, and file scaffolding.

**What gets built:**
- GitHub repo: `project-maribel`
- **CLAUDE.md** (auto-read by Claude Code every session)
- README.md with project overview
- .gitignore (Node, Python, .env)
- .env.example with all required variables (from spec Section 13)
- SETUP.md (complete Meta Platform setup guide from spec Section 5)
- Empty directory structure for all folders (supabase/, n8n/, knowledge-base/, scripts/, docs/)
- docs/project-maribel-spec-v2.md (the full spec, committed to repo)
- docs/maribel-assumptions-resolution.md (assumptions guide, committed to repo)
- docs/maribel-build-plan.md (this file, committed to repo)
- docs/meta-app-review-guide.md

**Exit criteria:**
- [ ] Repo exists with all directories
- [ ] CLAUDE.md is at repo root with full project context
- [ ] All three reference docs committed to docs/
- [ ] .env.example has every variable from Section 13
- [ ] SETUP.md has complete step-by-step Meta App setup guide
- [ ] README.md describes the project and references SETUP.md

**Prompt for Claude Code:**

```
I'm building Project Maribel — an AI-powered Instagram DM agent for my homeschool education company, Eaton Academic. This is the first session — we're setting up the repo foundation.

We're on PHASE 0: Repo Scaffold + CLAUDE.md + Setup Guide.

I'm going to give you the contents of three reference documents that need to be committed to the repo. But first, here's what to build:

1. Create the GitHub repo `project-maribel` with the full directory structure (create empty placeholder READMEs in each subfolder):
   - supabase/migrations/
   - n8n/workflows/
   - knowledge-base/
   - scripts/
   - docs/

2. Create .gitignore for Node.js, Python, .env files, node_modules, dist.

3. Create .env.example with ALL of these variables and descriptive comments:
   - META_APP_ID, META_APP_SECRET, META_PAGE_ACCESS_TOKEN, META_VERIFY_TOKEN, META_PAGE_ID, INSTAGRAM_BUSINESS_ACCOUNT_ID
   - ANTHROPIC_API_KEY
   - OPENAI_API_KEY
   - SUPABASE_MARIBEL_URL, SUPABASE_MARIBEL_ANON_KEY, SUPABASE_MARIBEL_SERVICE_KEY
   - SUPABASE_EATON_URL, SUPABASE_EATON_ANON_KEY
   - CALENDLY_API_KEY
   - TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

4. Create CLAUDE.md at the repo root. This is the most important file — it's auto-read by Claude Code at the start of every session and serves as persistent context across all build phases. Include:

   **Project Summary:**
   - What Maribel is (bilingual Instagram DM agent for Eaton Academic)
   - Core stack: n8n Cloud for orchestration, Claude API (Anthropic) for AI, Supabase for data, Instagram via Meta Messenger API, OpenAI for embeddings, Calendly for booking, Telegram for escalations

   **Key Architectural Decisions:**
   - Concurrency uses a `conversation_locks` TABLE with row-level INSERT/DELETE locking (NOT Postgres advisory locks — advisory locks don't work with Supabase's connection pooling)
   - System prompt is stored in `agent_config` Supabase table, NOT hardcoded in n8n workflows
   - Graph API version is stored in `agent_config`, NOT hardcoded
   - RAG via pgvector on Supabase + OpenAI text-embedding-3-small embeddings
   - Two Supabase projects: `maribel-agent` (dedicated, all Maribel tables) and the existing Eaton Academic project (read-only lookups)
   - Calendly booking state is tracked durably in `ig_leads.booking_state` column, not just via Claude's metadata
   - All configurable values come from the `agent_config` table — nothing is hardcoded in workflows
   - Admin UI is a standalone Vite + React + TypeScript + Tailwind app — NOT integrated into the existing eaton-console business management app. Separate repo/project, own routing, own auth, own deployment.

   **Critical Assumption Fixes (always apply these):**
   - A1: NEVER use advisory locks (pg_try_advisory_lock). Always use the conversation_locks table with acquire/release RPC functions.
   - A2: Do NOT use fetch() inside n8n Code nodes unless tested and confirmed working. Default to HTTP Request nodes for all external API calls. Keep Code nodes for data transformation only.
   - A3: Calendly Scheduling API (Create Event Invitee) requires a paid plan (Standard+). Verify endpoint paths from live docs at https://developer.calendly.com/api-docs before building booking flow.
   - A5: The Calendly booking flow uses ig_leads.booking_state for durable state tracking across conversation turns.

   **Conventions:**
   - All n8n workflows use Workflow 9 (Global Error Handler) as their error workflow
   - All external API calls use retry logic with exponential backoff
   - n8n instance URL: eatonacademic.app.n8n.cloud
   - Lock release must happen on ALL workflow exit paths (success, error, fallback, escalation)
   - Meta WILL double-deliver webhooks — dedup via message_mid must happen before ANY processing

   **Reference Documents (in docs/ folder):**
   - docs/project-maribel-spec-v2.md — Full V2 build specification
   - docs/maribel-assumptions-resolution.md — All assumptions with fixes and risk levels
   - docs/maribel-build-plan.md — Phased build plan with per-phase prompts

   **Current Build Status:**
   - Phase 0: ✅ Complete (repo scaffold, CLAUDE.md, reference docs)
   - Phase 1: ⬜ Ivan's manual setup
   - Phase 2: ⬜ Supabase schema
   - Phase 3: ⬜ Knowledge base + RAG
   - Phase 4: ⬜ Core n8n workflows
   - Phase 5: ⬜ Secondary workflows
   - Phase 6: ⬜ Admin UI (standalone app)
   - Phase 7: ⬜ Docs, scripts, testing

5. Create SETUP.md with the complete step-by-step Meta Platform setup guide. I've never created a Meta Developer App before, so make this beginner-friendly. Cover:
   - Creating a Meta Developer account
   - Creating the Meta App
   - Adding Messenger and Webhooks products
   - Linking the Instagram Business Account
   - Generating and exchanging tokens
   - Getting the Instagram Business Account ID
   - Configuring webhooks
   - Enabling page subscriptions
   - Submitting for App Review
   - Creating the Telegram bot
   (Full details are in the spec Section 5 — I'll paste the spec content below)

6. Create README.md with a project overview, tech stack table, and "Getting Started" section pointing to SETUP.md.

7. Create docs/meta-app-review-guide.md with tips for passing Meta App Review.

8. Commit the three reference documents to docs/:
   - docs/project-maribel-spec-v2.md
   - docs/maribel-assumptions-resolution.md
   - docs/maribel-build-plan.md

Do NOT create any Supabase tables, n8n workflows, or application code yet. This phase is documentation and scaffolding only.

[PASTE THE SPEC, ASSUMPTIONS GUIDE, AND BUILD PLAN CONTENTS are in the downloads folder of this computer, find them and commit them to the repo]
```

**After Phase 0 is complete:** Verify CLAUDE.md's build status shows Phase 0 as ✅.

---

## Phase 1 — Ivan's Manual Setup (NOT Claude Code)

**Goal:** Ivan completes all manual platform setup steps before any code is built. This is a checklist, not a Claude Code session.

**Ivan's checklist:**
- [ ] Create Meta Developer account at developers.facebook.com
- [ ] Create Meta App ("Eaton Academic IG Agent"), record APP_ID and APP_SECRET
- [ ] Add Messenger and Webhooks products
- [ ] Link Instagram Business Account (@eatonacademic)
- [ ] Generate Page Access Token, exchange for long-lived token
- [ ] Get Instagram Business Account ID and Page ID
- [ ] Create Telegram bot via @BotFather, record TELEGRAM_BOT_TOKEN
- [ ] Get Telegram chat ID by messaging the bot
- [ ] Get Calendly Personal Access Token (requires paid plan — Standard or higher)
- [ ] Get Calendly event type URI via API: `GET https://api.calendly.com/event_types` with Bearer token
- [ ] Get Calendly user URI via: `GET https://api.calendly.com/users/me`
- [ ] Get OpenAI API key from platform.openai.com
- [ ] Create new Supabase project named "maribel-agent" in the same organization as the existing Eaton project
- [ ] Record SUPABASE_MARIBEL_URL, SUPABASE_MARIBEL_ANON_KEY, SUPABASE_MARIBEL_SERVICE_KEY
- [ ] Fill in ALL values in .env (copy from .env.example)

**IMPORTANT — Validate before proceeding:**
- [ ] Calendly plan is Standard or higher (required for Scheduling API)
- [ ] Meta App is created (even if App Review hasn't been submitted yet)
- [ ] All API keys are working (test with a simple curl)

**After Phase 1 is complete:** Update CLAUDE.md's build status in the next Claude Code session.

---

## Phase 2 — Supabase Schema + Migrations

**Goal:** Create all database tables, indexes, RPC functions, and seed data in the new Supabase project. This includes the corrected concurrency mechanism (row-level locks instead of advisory locks per Assumption A1).

**What gets built:**
- All 17 migrations from spec Section 6
- WITH the A1 fix: `conversation_locks` table replacing advisory lock functions
- WITH the A5 fix: `booking_state`, `booking_selected_slot`, `booking_email` columns added to `ig_leads`
- WITH the A14 fix: `conversation_history_limit` added to `agent_config` seed
- Enable pgvector extension
- All RPC functions (match_knowledge_chunks, get_escalation_queue, resolve_escalation, get_lead_pipeline, get_analytics_summary, get_conversations_needing_summary)
- Seed data for keyword_triggers and agent_config

**Exit criteria:**
- [ ] All tables created in Supabase
- [ ] pgvector extension enabled
- [ ] `conversation_locks` table exists (NOT advisory lock functions)
- [ ] `ig_leads` has `booking_state`, `booking_selected_slot`, `booking_email` columns
- [ ] `agent_config` has `conversation_history_limit` key
- [ ] All RPC functions created and callable
- [ ] Seed data inserted for keyword_triggers and agent_config
- [ ] Unique index on `ig_conversations.message_mid` exists (critical for dedup)

**Prompt for Claude Code:**

```
We're on PHASE 2: Supabase Schema + Migrations.

Read these files first:
- CLAUDE.md (should auto-load, but verify you see the architectural decisions and assumption fixes)
- docs/project-maribel-spec-v2.md — Section 6 (Phase 1: Supabase Schema & Migrations)
- docs/maribel-assumptions-resolution.md — Items A1, A5, and A14

CRITICAL CHANGES TO APPLY (from the assumptions guide):
1. **A1 (Advisory Locks):** Do NOT create the advisory lock functions from Migration 016. Instead, create a `conversation_locks` table with `acquire_conversation_lock()` and `release_conversation_lock()` functions that use row-level INSERT/DELETE locking. See the assumptions resolution guide for the exact SQL. Also add a `cleanup_stale_locks()` function.

2. **A5 (Booking State):** Add these columns to the `ig_leads` table (Migration 004):
   - `booking_state TEXT DEFAULT NULL CHECK (booking_state IN (NULL, 'slots_offered', 'slot_selected', 'email_requested', 'booking_confirmed', 'booking_failed'))`
   - `booking_selected_slot TIMESTAMPTZ`
   - `booking_email TEXT`

3. **A14 (History Limit):** Add this row to the agent_config seed (Migration 015):
   - key: 'conversation_history_limit', value: '15', description: 'Number of recent messages to include in Claude context window'

Now, using the Supabase MCP:
1. Connect to the maribel-agent Supabase project.
2. Run all migrations 001 through 017, applying the three changes above.
3. Verify each table was created correctly.
4. Verify all RPC functions are callable (test with simple SELECT calls).
5. Verify seed data is in place for keyword_triggers and agent_config.

Keep the migration files in supabase/migrations/ for version control.

After completion, update CLAUDE.md build status: Phase 2 ✅.
```

---

## Phase 3 — Knowledge Base + RAG Ingestion

**Goal:** Write all knowledge base markdown files, create the chunking/ingestion script, and embed all chunks into the `knowledge_chunks` table.

**What gets built:**
- knowledge-base/programs.md (all program details, pricing, schedules)
- knowledge-base/faq.md (30+ FAQs)
- knowledge-base/enrollment-process.md (step-by-step enrollment flow)
- knowledge-base/events.md (upcoming events placeholder)
- knowledge-base/chunking-guide.md (from spec Appendix E)
- scripts/ingest_knowledge_base.sh (chunk + embed script)
- scripts/reembed_all_chunks.sh
- All chunks embedded and stored in `knowledge_chunks` table

**IMPORTANT:** Ivan will need to provide or review the actual program content. Claude Code should create realistic placeholder content based on what it knows about Eaton Academic from the spec, clearly marking sections that need Ivan's review.

**Exit criteria:**
- [ ] All knowledge base markdown files created with content
- [ ] Chunking follows Appendix E guidelines (semantic chunks, 200-800 tokens each)
- [ ] Ingestion script works end-to-end (reads .md files → chunks → embeds via OpenAI → inserts into Supabase)
- [ ] All chunks have embeddings in the `knowledge_chunks` table
- [ ] Test: Run a similarity search manually — "How much do Tuesday pods cost?" should return relevant chunks

**Prompt for Claude Code:**

```
We're on PHASE 3: Knowledge Base + RAG Ingestion.

Read these files first:
- docs/project-maribel-spec-v2.md — Section 8 (AGENTS.md) for program knowledge placeholders, Appendix E (Knowledge Base Chunking Guide)
- docs/maribel-assumptions-resolution.md — Item A12 (embedding model choice)

Do the following:

1. Create knowledge-base/programs.md — Write comprehensive program information for Eaton Academic covering: Learning Pods (schedules, pricing, age groups, locations), Eaton Online (class catalog, nationwide availability), Microschool in Kendall, Eaton Hub (drop-in model), Academic Coaching, and Consulting. Use realistic placeholder content based on what a South Florida homeschool company would offer. Mark any sections that need my review with [REVIEW NEEDED].

2. Create knowledge-base/faq.md — Write 30+ frequently asked questions and answers covering: enrollment process, pricing, scheduling, curriculum, teacher qualifications, locations, age requirements, trial classes, refund policy, technology requirements for online, etc.

3. Create knowledge-base/enrollment-process.md — Step-by-step enrollment flow from initial inquiry to first day.

4. Create knowledge-base/events.md — Template with placeholder events (open houses, info sessions, etc.) that I can update seasonally.

5. Create knowledge-base/chunking-guide.md — Guidelines from spec Appendix E.

6. Create scripts/ingest_knowledge_base.sh — A script that:
   - Reads each .md file in knowledge-base/
   - Splits into semantic chunks following the chunking guide (by section/topic, not arbitrary character count)
   - Calls OpenAI's text-embedding-3-small API to embed each chunk
   - Inserts into Supabase knowledge_chunks table with source_file, section_title, content, embedding, and metadata
   - Logs each chunk inserted
   IMPORTANT: Use a standalone script (Python or Node), NOT fetch() inside n8n. The OpenAI API key and Supabase credentials come from the .env file.

7. Create scripts/reembed_all_chunks.sh — Re-embeds all active chunks.

8. Run the ingestion script to populate knowledge_chunks.

9. Test: Query the match_knowledge_chunks RPC with a sample question embedding to verify retrieval works. Try "How much do Tuesday pods cost?" and verify relevant chunks come back.

After completion, update CLAUDE.md build status: Phase 3 ✅.
```

---

## Phase 4 — Core n8n Workflows

**Goal:** Build the main DM handler workflow (Workflow 1) and its direct dependencies (Global Error Handler, Telegram Callback Handler). This is the heaviest phase — the DM handler has 28 nodes.

**What gets built:**
- Workflow 9: Global Error Handler
- Workflow 8: Telegram Callback Handler
- Workflow 1: Maribel — IG DM Handler (the main workflow, all 28 nodes)
- AGENTS.md (the system prompt — needed before Workflow 1 can be tested)

**Critical assumptions to apply during this phase:**
- **A1:** Use `conversation_locks` table functions, not advisory locks, in Nodes 9 and 28
- **A2:** Test `fetch()` in a Code node first. If it doesn't work, convert Node 14 (OpenAI embedding) to an HTTP Request node
- **A3:** Verify Calendly API endpoint paths from live documentation for Nodes 20a-20b
- **A5:** Use `booking_state` column in the Calendly booking flow (Nodes 20-20b)
- **A6:** Add logging for echo messages to audit behavior
- **A7:** Add conditional HUMAN_AGENT tag to Node 22 for post-escalation replies

**Exit criteria:**
- [ ] Global Error Handler workflow is active and configured as error workflow for all others
- [ ] Telegram Callback Handler receives callbacks and resolves escalations
- [ ] AGENTS.md written and content inserted into agent_config.system_prompt
- [ ] DM Handler workflow complete with all 28 nodes
- [ ] Webhook verification (GET challenge) works
- [ ] Row-level locks used for concurrency (not advisory locks)
- [ ] Dedup check happens before any processing
- [ ] Metadata parsing has robust fallback
- [ ] Calendly booking flow uses durable state (`booking_state` column)
- [ ] `fetch()` availability confirmed or HTTP Request nodes used as fallback

**Prompt for Claude Code:**

```
We're on PHASE 4: Core n8n Workflows. This is the biggest phase.

Read these files first:
- docs/project-maribel-spec-v2.md — Section 7 (Phase 2: n8n Workflows), Section 8 (Phase 3: AGENTS.md)
- docs/maribel-assumptions-resolution.md — Items A1, A2, A3, A5, A6, A7 (all apply to this phase)

BEFORE BUILDING ANYTHING, do these two validation steps:

1. **Test fetch() availability:** Create a simple n8n test workflow with a Code node that runs:
   try { const res = await fetch('https://httpbin.org/get'); return [{ json: { fetch_works: true } }]; }
   catch (e) { return [{ json: { fetch_works: false, error: e.message } }]; }
   If fetch() doesn't work, you MUST use HTTP Request nodes for all external API calls (OpenAI, Calendly, etc.) instead of inline fetch() in Code nodes.

2. **Verify Calendly API endpoints:** Read the Calendly API docs at https://developer.calendly.com/api-docs to confirm:
   - The exact endpoint path for Create Event Invitee
   - Required fields (especially location handling)
   - Whether the event_type_available_times endpoint has changed

CRITICAL CHANGES FROM ASSUMPTIONS GUIDE:
- A1: Nodes 9 and 28 use `conversation_locks` table (INSERT/DELETE), NOT advisory locks. Add lock release to ALL exit paths.
- A2: If fetch() doesn't work, convert Node 14 (OpenAI embedding) to an HTTP Request node. Keep Code nodes for data transformation only.
- A3: Adjust Calendly endpoint paths to match current API docs. Add location handling if the event type requires it.
- A5: After Calendly flow nodes (20a-20b), update ig_leads.booking_state to track multi-turn progress.
- A7: In Node 22 (Send Instagram Reply), add conditional HUMAN_AGENT tag for post-escalation messages.

Now build in this order:

1. **Write AGENTS.md** — The full system prompt from spec Section 8. Then insert its content into agent_config.system_prompt in Supabase.

2. **Workflow 9: Global Error Handler** — Build first since all other workflows reference it.

3. **Workflow 8: Telegram Callback Handler** — Handles inline button callbacks for escalation resolution.

4. **Workflow 1: Maribel — IG DM Handler** — The main workflow, all nodes (1-28):
   - Webhook reception + GET verification challenge
   - Echo detection + manual reply logging
   - Dedup check BEFORE all processing
   - Concurrency lock via conversation_locks table
   - Kill switch check from agent_config
   - Conversation history + lead profile fetch
   - RAG: embed question + retrieve chunks
   - Agent config fetch (system prompt, all settings)
   - Claude API call with prompt caching (cache_control on static system prompt)
   - Response parsing with metadata fallback defaults
   - Calendly booking flow with durable state (booking_state column)
   - Message splitting + Instagram Send API with retry
   - Lead upsert + escalation handling
   - Lock release on ALL exit paths

Test the webhook verification after building:
curl "https://eatonacademic.app.n8n.cloud/webhook/ig-dm?hub.mode=subscribe&hub.verify_token=eaton_maribel_verify_2026&hub.challenge=TESTCHALLENGE123"
Should return: TESTCHALLENGE123

After completion, update CLAUDE.md build status: Phase 4 ✅.
```

---

## Phase 5 — Comment-to-DM + Secondary Workflows

**Goal:** Build all remaining n8n workflows: Comment-to-DM, Token Refresh, Daily Analytics, Stale Conversation Alert, Conversation Summarizer, and Knowledge Re-embedder.

**What gets built:**
- Workflow 2: Comment-to-DM Trigger
- Workflow 3: Token Refresh (scheduled)
- Workflow 4: Daily Analytics (scheduled)
- Workflow 5: Stale Conversation Alert (scheduled)
- Workflow 6: Conversation Summarizer (scheduled)
- Workflow 7: Knowledge Re-embedder (webhook-triggered)

**Assumptions to apply:**
- **A8:** Verify Meta comment webhook payload structure from Instagram Platform docs before building Workflow 2
- **A1 cleanup:** Add `cleanup_stale_locks()` call to Workflow 4 (Daily Analytics) as housekeeping

**Exit criteria:**
- [ ] All 6 workflows created and active
- [ ] Comment-to-DM correctly parses comment webhook payloads
- [ ] Token Refresh scheduled every 50 days
- [ ] Daily Analytics runs at 8 AM EST, sends Telegram summary
- [ ] Stale Conversation Alert runs every 6 hours
- [ ] Conversation Summarizer runs every 2 hours, generates summaries
- [ ] Knowledge Re-embedder accepts webhook trigger from admin UI
- [ ] All workflows have Workflow 9 set as their error workflow
- [ ] Lock cleanup runs as part of Daily Analytics

**Prompt for Claude Code:**

```
We're on PHASE 5: Comment-to-DM + Secondary Workflows.

Read these files first:
- docs/project-maribel-spec-v2.md — Section 7 (Workflows 2-7), Section 9 (Comment-to-DM Funnels), Section 10 (Monitoring & Alerts)
- docs/maribel-assumptions-resolution.md — Items A1 (lock cleanup) and A8 (comment webhook payload)

BEFORE building Workflow 2 (Comment-to-DM):
Verify the Meta Instagram comment webhook payload structure. Comment webhooks use a `changes[].value` format, NOT the `messaging[]` format used by DM webhooks. Check Meta docs at https://developers.facebook.com/docs/instagram-platform/webhooks/ to confirm exact field names for commenter ID, comment text, and media ID.

ASSUMPTION FIX A1: Add a call to `cleanup_stale_locks()` RPC at the beginning of Workflow 4 (Daily Analytics) to clean up any orphaned conversation locks.

Build these workflows:

1. **Workflow 2: Comment-to-DM Trigger** — Webhook at /webhook/ig-comments. Parse comment events (using the correct payload structure), match keywords from keyword_triggers table, check for duplicate outreach in ig_comment_triggers, detect language (default English for keyword-only comments), send opening DM via Graph API using graph_api_version from agent_config (not hardcoded), log to ig_comment_triggers.

2. **Workflow 3: Token Refresh** — Cron every 50 days. Refresh Meta long-lived token. Notify via Telegram on success/failure.

3. **Workflow 4: Daily Analytics** — Cron daily at 8 AM EST. First call cleanup_stale_locks(). Then query yesterday's metrics, insert into ig_analytics_daily, send Telegram summary.

4. **Workflow 5: Stale Conversation Alert** — Cron every 6 hours. Find conversations with last user message >20 hours and <24 hours ago. Alert Ivan via Telegram.

5. **Workflow 6: Conversation Summarizer** — Cron every 2 hours. Find conversations needing summaries via get_conversations_needing_summary RPC. For each: fetch messages since last summary, call Claude API (300 max_tokens), upsert summary into ig_leads.conversation_summary.

6. **Workflow 7: Knowledge Re-embedder** — Webhook at /webhook/reembed-knowledge. Accepts optional chunk_ids array. Fetches chunks, re-embeds via OpenAI, updates Supabase, logs to knowledge_versions, notifies via Telegram.

Set Workflow 9 (Global Error Handler) as the error workflow for ALL of these.

After completion, update CLAUDE.md build status: Phase 5 ✅.
```

---

## Phase 6 — Admin UI (Standalone App)

**Goal:** Scaffold and build a standalone admin UI application for managing Maribel. This is a separate project from eaton-console — it has its own Vite config, routing, auth, and deployment.

**What gets built:**
- New Vite + React 19 + TypeScript + Tailwind project (scaffolded from scratch)
- Simple auth gate (password-based or Supabase auth — just needs to keep the app private)
- Supabase client configured for the maribel-agent project
- types/maribel.ts (TypeScript interfaces)
- TanStack Query hooks for all read/write operations
- MaribelDashboard (analytics cards, charts, kill switch toggle, recent escalations)
- EscalationManager (queue, resolution, conversation viewer)
- LeadPipeline (filterable table, drill-down, conversation history)
- KnowledgeEditor (CRUD table, re-embed buttons, version history)
- AgentConfigEditor (grouped settings, system prompt editor)
- ConversationViewer (shared chat-style component)
- React Router configuration for all routes

**Assumptions to apply:**
- **A4:** The app needs its own authentication — even a simple password gate is fine for now since only Ivan uses it. Can upgrade to Supabase Auth later if team members are added.

**Exit criteria:**
- [ ] Standalone Vite app scaffolded and runs locally
- [ ] Auth gate prevents unauthenticated access
- [ ] Supabase client connects to maribel-agent project
- [ ] All components created and TypeScript-clean
- [ ] Dashboard shows real data from Supabase
- [ ] Escalation manager can resolve escalations
- [ ] Lead pipeline has filtering and drill-down
- [ ] Knowledge editor CRUD works with re-embed trigger
- [ ] Config editor can update agent_config values
- [ ] Kill switch toggles auto_reply_enabled
- [ ] App is deployable (Vercel, Netlify, or similar)

**Prompt for Claude Code:**

```
We're on PHASE 6: Admin UI (Standalone App).

Read these files first:
- docs/project-maribel-spec-v2.md — Section 11 (Phase 6: Admin UI Module)
- docs/maribel-assumptions-resolution.md — Item A4 (service key security)

IMPORTANT ARCHITECTURAL DECISION: The admin UI is a STANDALONE application, NOT integrated into the existing eaton-console app. Build it as its own project from scratch.

Scaffold the app:
1. Create a new Vite + React 19 + TypeScript project.
2. Install dependencies: @supabase/supabase-js, @tanstack/react-query, react-router-dom, tailwindcss, lucide-react, recharts (for dashboard charts).
3. Configure Tailwind with a dark theme.
4. Set up React Router with routes:
   - / → Dashboard
   - /escalations → EscalationManager
   - /leads → LeadPipeline
   - /leads/:senderId → LeadDetail
   - /knowledge → KnowledgeEditor
   - /config → AgentConfigEditor
5. Add a simple auth gate — a password check on app load is sufficient for now (Ivan is the only user). Store the password hash in an env var. This can be upgraded to Supabase Auth later.
6. Create .env with VITE_SUPABASE_MARIBEL_URL and VITE_SUPABASE_MARIBEL_SERVICE_KEY.

ASSUMPTION FIX A4: The service key is acceptable here since only Ivan accesses the app and it's behind an auth gate. If team members are added later, switch to Supabase Auth + RLS.

Now build all components from spec Section 11:
1. lib/supabase.ts — Supabase client for the maribel-agent project.
2. types/maribel.ts — All TypeScript interfaces from the spec.
3. hooks/useMaribelData.ts — TanStack Query hooks for all read operations.
4. hooks/useMaribelActions.ts — Mutation hooks for write operations.
5. All page components:
   - MaribelDashboard (analytics cards, charts, kill switch toggle, recent escalations)
   - EscalationManager (queue, resolution, conversation viewer)
   - LeadPipeline (filterable table, drill-down, conversation history)
   - KnowledgeEditor (CRUD table, re-embed buttons, version history)
   - AgentConfigEditor (grouped settings, system prompt editor)
   - ConversationViewer (shared chat-style component used by escalations and leads)

Use a clean, dark-themed UI. This is an internal admin tool — prioritize clarity and function over polish.

After completion, update CLAUDE.md build status: Phase 6 ✅.
```

---

## Phase 7 — Docs, Scripts, Testing, Hardening

**Goal:** Create all remaining documentation, utility scripts, export workflow JSONs, and run through the complete test plan.

**What gets built:**
- docs/conversation-flow-examples.md
- docs/runbook.md
- docs/development-mode-guide.md
- docs/adversarial-test-cases.md
- scripts/test_webhook_verification.sh
- scripts/test_send_dm.sh
- scripts/refresh_meta_token.sh
- scripts/export_n8n_workflows.sh
- Export all n8n workflow JSONs to n8n/workflows/ for version control
- Run through test plan (spec Section 12)

**Exit criteria:**
- [ ] All documentation written
- [ ] All utility scripts created and executable
- [ ] n8n workflow JSONs exported to repo
- [ ] Webhook verification test passes
- [ ] Dedup test passes (send same payload twice)
- [ ] Concurrency test passes (rapid messages serialized)
- [ ] Metadata fallback test passes (malformed metadata still sends reply)
- [ ] Escalation → Telegram → resolve flow works
- [ ] RAG retrieval returns relevant chunks for test questions
- [ ] Adversarial test cases documented with expected behaviors

**Prompt for Claude Code:**

```
We're on PHASE 7: Docs, Scripts, Testing, Hardening. This is the final phase.

Read these files first:
- docs/project-maribel-spec-v2.md — Section 12 (Testing Plan), Section 14 (Deployment Checklist), Section 15 (Development Mode Operating Plan)
- docs/maribel-assumptions-resolution.md — Full document (for any remaining fixes)

Build the following:

1. **Documentation:**
   - docs/conversation-flow-examples.md — 10+ example conversations showing different scenarios (new English lead, Spanish lead, returning lead with memory, escalation, Calendly booking, FAQ, upset parent, etc.)
   - docs/runbook.md — Operational runbook: what to do when workflows stop, how to restart, manual token refresh, handling Meta outages, updating knowledge base, reading analytics, emergency procedures
   - docs/development-mode-guide.md — How to test during Meta review waiting period (from spec Section 15)
   - docs/adversarial-test-cases.md — Full red-team test suite from spec Section 12 Phase I, with expected behavior for each case

2. **Utility Scripts:**
   - scripts/test_webhook_verification.sh — Curl command to test webhook handshake
   - scripts/test_send_dm.sh — Curl command to send a test DM via Graph API
   - scripts/refresh_meta_token.sh — Manual token refresh script
   - scripts/export_n8n_workflows.sh — Export all workflows as JSON for version control

3. **Export n8n workflows** to n8n/workflows/ directory as JSON files.

4. **Run through the test plan** (spec Section 12):
   - Phase A: Test webhook verification
   - Phase D: Test deduplication (send same webhook payload twice, verify duplicate is caught and logged)
   - Phase D: Test concurrency (verify conversation_locks table works — not advisory locks)
   - Phase E: Verify error handling paths
   - Phase G: Test RAG retrieval with sample questions
   - Document any issues found and fix them.

5. **Final cleanup:**
   - Verify all files match the directory structure from spec Section 4
   - Verify .env.example is complete and accurate
   - Update README.md with any changes from the build process
   - Update CLAUDE.md build status: ALL PHASES ✅

6. **Final CLAUDE.md update:** Change build status to show all phases complete, and add a "Maintenance Notes" section covering: how to update knowledge base content, how to modify the system prompt, how to add new keyword triggers, how to tune RAG threshold.
```

---

## Post-Build: Go-Live Checklist

After all 7 phases are complete and Meta App Review is approved:

```
[ ] Meta App Review approved for all permissions
[ ] Switch Meta App from Development to Live mode
[ ] Verify webhook subscriptions are still active after mode switch
[ ] Set instagram_page_sender_id in agent_config (the sender ID that represents your IG page)
[ ] Set Telegram bot webhook:
    POST https://api.telegram.org/bot{TOKEN}/setWebhook
    Body: { "url": "https://eatonacademic.app.n8n.cloud/webhook/telegram-callback" }
[ ] Activate all n8n workflows
[ ] Send a test DM from a non-test account to verify live traffic works
[ ] Monitor first hour closely — check Telegram for any error alerts
[ ] Review first Daily Analytics report the next morning
[ ] Begin posting content with keyword CTAs (PODS, SCHEDULE, INFO, etc.)
[ ] Review conversation quality after first 20 real conversations
[ ] Tune rag_match_threshold if needed based on retrieval quality
[ ] Review and iterate on AGENTS.md weekly based on conversation data
```
