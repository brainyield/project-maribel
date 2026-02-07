# n8n Workflows

This folder contains exported JSON files for all Maribel n8n workflows.

## Workflows

| # | Name | Trigger | Description |
|---|------|---------|-------------|
| 1 | Maribel — IG DM Handler | Webhook (`/webhook/ig-dm`) | Main conversation handler |
| 2 | Maribel — Comment-to-DM Trigger | Webhook (`/webhook/ig-comments`) | Keyword comment to DM funnel |
| 3 | Maribel — Token Refresh | Cron (every 50 days) | Meta long-lived token refresh |
| 4 | Maribel — Daily Analytics | Cron (daily 8 AM EST) | Metrics aggregation + Telegram report |
| 5 | Maribel — Stale Conversation Alert | Cron (every 6 hours) | 24-hour window expiry warnings |
| 6 | Maribel — Conversation Summarizer | Cron (every 2 hours) | AI-generated conversation memory |
| 7 | Maribel — Knowledge Re-embedder | Webhook (`/webhook/reembed-knowledge`) | Re-embed knowledge chunks |
| 8 | Maribel — Telegram Callback Handler | Webhook (`/webhook/telegram-callback`) | Escalation resolution via inline buttons |
| 9 | Maribel — Global Error Handler | Error workflow | Centralized error handling + Telegram alerts |

## Instance

All workflows run on: `eatonacademic.app.n8n.cloud`
