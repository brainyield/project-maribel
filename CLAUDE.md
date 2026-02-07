# Project Maribel — Claude Code Context

> This file is auto-read by Claude Code at the start of every session. It serves as persistent context across all build phases.

---

## Project Summary

**Maribel** is a bilingual (English/Spanish) AI-powered Instagram DM agent for **Eaton Academic**, a homeschool education company in South Florida. Maribel handles customer service and sales conversations via Instagram Direct Messages — qualifying leads, answering program questions using RAG-retrieved knowledge, remembering returning parents across sessions, proactively booking consultation calls via Calendly, and escalating complex situations to Ivan via Telegram.

### Core Stack

| Component | Technology |
|---|---|
| Messaging Channel | Instagram DMs via Meta Messenger API for Instagram |
| Orchestration | n8n Cloud (`eatonacademic.app.n8n.cloud`) |
| AI Brain | Claude API (Anthropic) — `claude-sonnet-4-5-20250929` |
| Knowledge Retrieval (RAG) | pgvector on Supabase + OpenAI `text-embedding-3-small` |
| Data Store | Supabase (dedicated `maribel-agent` project) |
| Enrollment Data | Supabase (existing Eaton Academic project, read-only) |
| Appointment Booking | Calendly API (proactive slot booking + fallback link) |
| Escalation | Telegram Bot API (inline keyboard buttons) |
| Source Control | GitHub (`project-maribel`) |

---

## Key Architectural Decisions

1. **Concurrency** uses a `conversation_locks` TABLE with row-level INSERT/DELETE locking — **NOT** Postgres advisory locks. Advisory locks don't work with Supabase's connection pooling (Supavisor/PgBouncer in transaction mode).

2. **System prompt** is stored in the `agent_config` Supabase table, NOT hardcoded in n8n workflows.

3. **Graph API version** is stored in `agent_config`, NOT hardcoded anywhere.

4. **RAG** via pgvector on Supabase + OpenAI `text-embedding-3-small` embeddings (1536 dimensions).

5. **Two Supabase projects**: `maribel-agent` (dedicated, all Maribel tables) and the existing Eaton Academic project (read-only lookups for student/enrollment data).

6. **Calendly booking state** is tracked durably in `ig_leads.booking_state` column, not just via Claude's metadata.

7. **All configurable values** come from the `agent_config` table — nothing is hardcoded in workflows.

8. **Meta webhook deduplication** via `message_mid` unique index must happen before ANY processing.

---

## Critical Assumption Fixes (Always Apply These)

### A1: NEVER Use Advisory Locks
Do NOT use `pg_try_advisory_lock()` or any advisory lock functions. Always use the `conversation_locks` table with `acquire_conversation_lock()` and `release_conversation_lock()` RPC functions. These use row-level INSERT/DELETE locking that works correctly with Supabase's connection pooling. Locks auto-expire after 30 seconds as a safety net.

### A2: No fetch() in n8n Code Nodes
Do NOT use `fetch()` inside n8n Code nodes unless tested and confirmed working. Default to **HTTP Request nodes** for all external API calls (OpenAI, Calendly, Claude, Instagram Graph API, Telegram). Keep Code nodes for data transformation only (formatting, parsing, splitting).

### A3: Calendly API Requirements
The Calendly Scheduling API (Create Event Invitee) requires a **paid plan (Standard+)**. Verify endpoint paths from live docs at https://developer.calendly.com/api-docs before building the booking flow. The `event_type_available_times` endpoint has a 7-day limit per request.

### A5: Durable Booking State
The Calendly booking flow uses `ig_leads.booking_state` for durable state tracking across conversation turns. States: `slots_offered` → `slot_selected` → `email_requested` → `booking_confirmed` / `booking_failed`.

---

## Conventions

- All n8n workflows use **Workflow 9 (Global Error Handler)** as their error workflow.
- All external API calls use **retry logic with exponential backoff**.
- n8n instance URL: `eatonacademic.app.n8n.cloud`
- **Lock release must happen on ALL workflow exit paths** (success, error, fallback, escalation).
- **Meta WILL double-deliver webhooks** — dedup via `message_mid` must happen before ANY processing.
- Graph API version comes from `agent_config`, never hardcoded.
- The system prompt comes from `agent_config`, never hardcoded in workflows.
- Claude API budget is not a constraint — optimize for quality, not cost.

---

## Reference Documents (in docs/ folder)

- `docs/project-maribel-spec-v2.md` — Full V2 build specification
- `docs/maribel-assumptions-resolution.md` — All assumptions with fixes and risk levels
- `docs/maribel-build-plan.md` — Phased build plan with per-phase prompts

---

## Current Build Status

- Phase 0: ✅ Complete (repo scaffold, CLAUDE.md, reference docs)
- Phase 1: ⬜ Ivan's manual setup (Meta App, Telegram bot, API keys, Supabase project)
- Phase 2: ⬜ Supabase schema + migrations
- Phase 3: ⬜ Knowledge base + RAG ingestion
- Phase 4: ⬜ Core n8n workflows (DM handler, error handler, Telegram callback)
- Phase 5: ⬜ Secondary workflows (Comment-to-DM, analytics, summarizer, etc.)
- Phase 6: ⬜ Admin UI components
- Phase 7: ⬜ Docs, scripts, testing, hardening
