# Supabase Schema & Migrations

This folder contains all database migrations for the `maribel-agent` Supabase project.

## Migration Order

Migrations are numbered 001-017 and must be run in sequence. See `docs/project-maribel-spec-v2.md` Section 6 for full schema details.

## Tables

- `agent_config` — Central configuration (system prompt, API versions, feature flags)
- `ig_conversations` — All DM message history
- `ig_leads` — CRM-lite lead tracking
- `keyword_triggers` — Comment keyword to DM template mapping
- `ig_comment_triggers` — Dedup for comment-to-DM outreach
- `ig_escalations` — Escalation log with Telegram integration
- `ig_analytics_daily` — Daily aggregated metrics
- `knowledge_chunks` — RAG knowledge base with pgvector embeddings
- `knowledge_versions` — Knowledge base change audit log
- `metadata_parse_failures` — Claude response parse failure log
- `duplicate_webhook_log` — Meta webhook dedup log
- `api_error_log` — External API error tracking
- `conversation_locks` — Row-level concurrency locks (NOT advisory locks)
