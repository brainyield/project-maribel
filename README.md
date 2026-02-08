# Project Maribel

AI-powered bilingual Instagram DM agent for [Eaton Academic](https://eatonacademic.com), a homeschool education company in South Florida.

Maribel handles customer service and sales conversations via Instagram Direct Messages — qualifying leads, answering program questions using RAG-retrieved knowledge, remembering returning parents across sessions, proactively booking consultation calls via Calendly, and escalating complex situations to a human operator via Telegram.

## Tech Stack

| Component | Technology | Role |
|---|---|---|
| Messaging | Instagram DMs via Meta Messenger API | Inbound/outbound messages |
| Orchestration | n8n Cloud | Workflow engine, webhook receiver, routing |
| AI Brain | Claude API (Anthropic) | Conversation intelligence |
| Knowledge Retrieval | pgvector + OpenAI embeddings | RAG: retrieve relevant knowledge chunks |
| Data Store | Supabase (dedicated project) | Messages, leads, analytics, config |
| Enrollment Data | Supabase (existing project) | Student/enrollment lookups (read-only) |
| Booking | Calendly API | Proactive consultation scheduling |
| Escalation | Telegram Bot API | Human operator notifications |
| Embeddings | OpenAI `text-embedding-3-small` | Knowledge base + query embeddings |

## Key Features

- **Bilingual**: Responds in English and Spanish, detecting language automatically
- **RAG-powered**: Answers questions from an embedded knowledge base (programs, pricing, FAQ, enrollment)
- **Conversation memory**: Remembers returning parents across sessions via AI-generated summaries
- **Proactive booking**: Fetches Calendly availability and books consultations directly in DM
- **Lead qualification**: Extracts and tracks parent name, child grade, interests, lead score
- **Comment-to-DM funnels**: Keyword comments on posts trigger personalized DM outreach
- **Escalation system**: Complex situations escalated to Telegram with inline resolution buttons
- **Admin dashboard**: React-based UI for analytics, lead management, knowledge editing, and config
- **Concurrency safe**: Row-level locking prevents race conditions from rapid messages
- **Deduplication**: Meta's double-delivered webhooks are caught before any processing

## Repository Structure

```
project-maribel/
├── CLAUDE.md                 # Claude Code persistent context (auto-read)
├── SETUP.md                  # Step-by-step Meta Platform setup guide
├── supabase/migrations/      # Database schema + migrations
├── n8n/workflows/            # Exported n8n workflow JSONs
├── knowledge-base/           # RAG source content (markdown)
├── admin-ui/                 # React admin dashboard components
├── scripts/                  # Utility and maintenance scripts
└── docs/                     # Reference docs + guides
```

## Getting Started

### Prerequisites

- Meta Developer account with a Business-type app
- Instagram Business Account linked to a Facebook Page
- n8n Cloud instance
- Supabase account (two projects: one new for Maribel, one existing for Eaton)
- Anthropic API key
- OpenAI API key
- Calendly account (Standard plan or higher)
- Telegram account

### Setup

1. **Follow the complete setup guide**: [SETUP.md](SETUP.md)
   - Create Meta Developer App
   - Configure Instagram webhooks
   - Generate and exchange access tokens
   - Set up Telegram bot
   - Create Supabase project
   - Fill in all environment variables

2. **Copy and configure environment variables**:
   ```bash
   cp .env.example .env
   # Fill in all values — see SETUP.md for how to get each one
   ```

3. **Build phases** are documented in [docs/maribel-build-plan.md](docs/maribel-build-plan.md)

## Documentation

### Setup & Architecture
- [SETUP.md](SETUP.md) — Complete Meta Platform setup guide (start here)
- [docs/project-maribel-spec-v2.md](docs/project-maribel-spec-v2.md) — Full V2 build specification
- [docs/maribel-assumptions-resolution.md](docs/maribel-assumptions-resolution.md) — Technical assumptions and fixes
- [docs/maribel-build-plan.md](docs/maribel-build-plan.md) — Phased build plan
- [docs/meta-app-review-guide.md](docs/meta-app-review-guide.md) — Tips for passing Meta App Review

### Operations & Testing
- [docs/runbook.md](docs/runbook.md) — Operational runbook (monitoring, recovery, maintenance)
- [docs/conversation-flow-examples.md](docs/conversation-flow-examples.md) — 13 example conversation flows
- [docs/adversarial-test-cases.md](docs/adversarial-test-cases.md) — 20 red-team / safety test cases
- [docs/development-mode-guide.md](docs/development-mode-guide.md) — Testing during Meta App Review

### Utility Scripts
- `scripts/test_webhook_verification.sh` — Test webhook GET verification handshake
- `scripts/test_send_dm.sh` — Send a test DM via Graph API
- `scripts/refresh_meta_token.sh` — Manual Meta token refresh
- `scripts/export_n8n_workflows.sh` — Guide for exporting n8n workflows

## n8n Workflows

All 9 Maribel workflows are exported to `n8n/workflows/` as JSON:

| # | Workflow | Trigger | Nodes |
|---|---|---|---|
| 1 | IG DM Handler | Webhook (`/ig-dm`) | 53 |
| 2 | Comment-to-DM Trigger | Webhook (`/ig-comments`) | 16 |
| 3 | Token Refresh | Schedule (every 50 days) | 9 |
| 4 | Daily Analytics | Schedule (daily 8 AM EST) | 8 |
| 5 | Stale Conversation Alert | Schedule (every 6 hours) | 5 |
| 6 | Conversation Summarizer | Schedule (every 2 hours) | 11 |
| 7 | Knowledge Re-embedder | Webhook (`/reembed-knowledge`) | 12 |
| 8 | Telegram Callback Handler | Webhook (`/telegram-callback`) | 8 |
| 9 | Global Error Handler | Error Trigger | 5 |

## License

Private — Eaton Academic
