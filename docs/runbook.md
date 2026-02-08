# Operational Runbook — Project Maribel

> Day-to-day operations guide for managing the Maribel Instagram DM agent. Covers monitoring, common issues, recovery procedures, and maintenance tasks.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Daily Monitoring](#daily-monitoring)
3. [Workflow Recovery](#workflow-recovery)
4. [Meta Token Management](#meta-token-management)
5. [Handling Meta Outages](#handling-meta-outages)
6. [Knowledge Base Management](#knowledge-base-management)
7. [Reading Analytics](#reading-analytics)
8. [Escalation Queue Management](#escalation-queue-management)
9. [Emergency Procedures](#emergency-procedures)
10. [Supabase Maintenance](#supabase-maintenance)
11. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## System Overview

### Components to Monitor

| Component | URL / Access | Health Check |
|---|---|---|
| n8n Cloud | `eatonacademic.app.n8n.cloud` | Dashboard -> Executions |
| Supabase (Maribel) | Supabase Dashboard | Table Editor -> `api_error_log` |
| Telegram Bot | Message the bot | Should respond to /start |
| Admin UI | Deployed URL | Dashboard loads with data |
| Instagram | DM the business account | Reply arrives within ~5 seconds |

### Workflows

| # | Name | Trigger | Schedule |
|---|---|---|---|
| 1 | IG DM Handler | Webhook (POST from Meta) | On every DM |
| 2 | Comment-to-DM | Webhook (POST from Meta) | On every comment |
| 3 | Token Refresh | Schedule | Every 50 days |
| 4 | Daily Analytics | Schedule | Daily at midnight ET |
| 5 | Stale Conversation Alert | Schedule | Every 4 hours |
| 6 | Conversation Summarizer | Schedule | Every 2 hours |
| 7 | Knowledge Re-embedder | Webhook | On admin UI trigger |
| 8 | Telegram Callback | Webhook | On Telegram button press |
| 9 | Global Error Handler | Error trigger | On any workflow error |

---

## Daily Monitoring

### Morning Check (~2 minutes)

1. **n8n Executions page**: Look for any red (failed) executions in the last 24 hours
2. **Admin UI Dashboard**: Check key metrics — messages received, response rate, open escalations
3. **Telegram**: Review any escalation alerts that came in overnight
4. **`api_error_log` table**: Check for new errors (filter by `resolved = false`)

### Weekly Check

1. **Analytics trends**: Compare this week vs. last week in the Admin UI
2. **RAG quality**: Review a few recent conversations — are answers accurate?
3. **Lead pipeline**: Check for leads stuck in `warm` or `hot` that haven't been contacted
4. **Knowledge base**: Any outdated info that needs updating? (seasonal programs, schedule changes)
5. **Token expiry**: Confirm the Meta token refresh ran successfully (check Workflow 3 execution history)

---

## Workflow Recovery

### A Workflow Stopped / Is Inactive

1. Go to n8n Cloud -> Workflows
2. Find the workflow (look for the toggle — grey = inactive)
3. Click the toggle to activate
4. Check the execution history for the last error

### A Workflow Is Failing Repeatedly

1. Open the workflow -> Executions tab
2. Click the failed execution to see which node failed
3. Common causes:
   - **HTTP 401/403**: API key expired or invalid -> check credentials
   - **HTTP 429**: Rate limited -> wait and retry, check if there's a loop
   - **HTTP 500**: External service error -> check status pages (Meta, Supabase, Anthropic)
   - **Timeout**: API call taking too long -> check if the external service is degraded
4. Fix the root cause, then manually re-run the failed execution if needed

### Workflow 1 (IG DM Handler) Is Down

**Impact**: No DMs are being processed. Parents get no replies.

1. **Immediate**: Check if the workflow is active in n8n
2. **Check Meta webhook**: Go to Meta App Dashboard -> Webhooks -> verify webhook URL is registered and active
3. **Check n8n webhook URL**: Should be `https://eatonacademic.app.n8n.cloud/webhook/ig-dm`
4. **Check for orphaned locks**: Run this SQL in Supabase:
   ```sql
   SELECT * FROM conversation_locks WHERE expires_at < NOW();
   DELETE FROM conversation_locks WHERE expires_at < NOW();
   ```
5. **Restart**: Deactivate and reactivate the workflow in n8n

### All Workflows Are Down (n8n Outage)

1. Check n8n status page: `https://status.n8n.io`
2. Messages during downtime are lost (Meta does not retry indefinitely)
3. Once n8n is back, activate all workflows
4. Check `ig_leads.last_contact_at` for any conversations that may need follow-up

---

## Meta Token Management

### How Token Refresh Works

- Workflow 3 runs every 50 days (before the 60-day expiry)
- It exchanges the current long-lived token for a new one
- The new token is stored in n8n credentials
- If refresh fails, a Telegram alert is sent

### Manual Token Refresh

If the automatic refresh fails:

1. **Check current token validity**:
   ```bash
   curl "https://graph.facebook.com/debug_token?input_token=YOUR_TOKEN&access_token=YOUR_APP_ID|YOUR_APP_SECRET"
   ```

2. **Exchange for new long-lived token**:
   ```bash
   curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=CURRENT_TOKEN"
   ```

3. **Update in n8n**: Go to Credentials -> find the Meta credential -> paste the new token

4. **If the token is completely expired** (error: "Invalid OAuth access token"):
   - Go to Meta Developer Dashboard -> Your App -> Messenger -> Instagram Settings
   - Click "Generate Token" for your page
   - Exchange the short-lived token for a long-lived one using the curl above
   - Update in n8n

### See also: `scripts/refresh_meta_token.sh`

---

## Handling Meta Outages

### Symptoms
- Workflow 1 stops receiving webhooks
- Instagram Send API returns 500 errors
- Token debug endpoint is unresponsive

### During the Outage

1. **Check Meta status**: `https://developers.facebook.com/status/`
2. **Do NOT** deactivate workflows — Meta will resume sending webhooks when back
3. **Monitor** `api_error_log` for the volume of failures
4. **Inform the team** via Telegram that DMs are temporarily down

### After the Outage

1. Check for messages that were received but got errors during sending
2. Query recent errors:
   ```sql
   SELECT * FROM api_error_log
   WHERE service = 'instagram'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```
3. Parents who messaged during the outage won't get replies — they'll need to message again, or a team member can follow up manually

---

## Knowledge Base Management

### Updating Knowledge Content

1. **Via Admin UI** (recommended):
   - Go to Knowledge Base section
   - Find the chunk to edit -> click Edit
   - Update the content
   - Click Save -> this triggers re-embedding automatically (Workflow 7)

2. **Via Supabase directly**:
   - Edit the row in `knowledge_chunks` table
   - After editing, trigger re-embedding by calling the Workflow 7 webhook:
     ```bash
     curl -X POST "https://eatonacademic.app.n8n.cloud/webhook/reembed" \
       -H "Content-Type: application/json" \
       -d '{"chunk_ids": [123]}'
     ```

### Adding New Knowledge

1. Write the content following the chunking guidelines in `knowledge-base/chunking-guide.md`
2. Each chunk should be self-contained, 200-800 tokens, covering one specific topic
3. Add via Admin UI -> Knowledge Base -> "Add Chunk"
4. Set `source_file`, `section_title`, and `metadata` tags
5. Save triggers automatic embedding

### Removing Knowledge

1. In Admin UI, set `is_active = false` on the chunk (soft delete)
2. The chunk will no longer be returned in RAG queries
3. The embedding is preserved in case you need to reactivate it

### Re-embedding All Chunks

If you change the embedding model or need a full refresh:
```bash
cd scripts/
./reembed_all_chunks.sh
```

---

## Reading Analytics

### Daily Analytics (Workflow 4)

The daily analytics workflow runs at midnight ET and populates the `ig_analytics_daily` table with:

- Total conversations, new vs. returning leads
- Messages received and sent
- Escalations opened and resolved
- Calendly bookings completed
- Average response time
- Top interests and language breakdown
- Metadata parse failures and duplicate webhooks detected

### Key Metrics to Watch

| Metric | Healthy Range | Action if Outside Range |
|---|---|---|
| Avg response time | < 10 seconds | Check Claude API latency, n8n queue |
| Escalation rate | < 15% of conversations | Review AGENTS.md escalation triggers |
| Metadata parse failure rate | < 5% of messages | Check Claude response format |
| Duplicate webhook rate | ~10-30% of webhooks | Normal — Meta double-delivers |
| Calendly booking completion | > 50% of offers | Check booking flow, API health |

### Viewing Analytics

- **Admin UI Dashboard**: Visual overview of all metrics
- **Direct SQL**: Query `ig_analytics_daily` in Supabase

---

## Escalation Queue Management

### Monitoring Escalations

- **Telegram**: Real-time alerts with inline buttons (Resolve & Resume / Resolve & Keep Paused)
- **Admin UI**: Escalation Manager shows all open escalations with conversation context

### Resolving Escalations

**Via Telegram** (fastest):
1. Read the escalation alert
2. Reply to the parent manually in Instagram if needed
3. Press "Resolve & Resume" to let Maribel handle future messages
4. Or press "Resolve & Keep Paused" to keep Maribel silent

**Via Admin UI**:
1. Go to Escalation Manager
2. Click on the escalation
3. Add resolution notes
4. Click Resolve

### Common Escalation Reasons
- Parent upset about schedule/pricing changes
- Questions outside knowledge base
- Parent explicitly asked for a human
- Billing or refund inquiries
- 3+ consecutive metadata parse failures (auto-escalation)

---

## Emergency Procedures

### Kill Switch — Stop All AI Replies

**Via Admin UI**:
1. Go to Config -> find `kill_switch_enabled`
2. Toggle to `true`
3. Maribel will immediately stop sending AI replies
4. Messages still get received and logged, but no response is sent

**Via Supabase directly**:
```sql
UPDATE agent_config SET value = 'true' WHERE key = 'kill_switch_enabled';
```

**To re-enable**: Set `kill_switch_enabled` back to `false`.

### Maribel Is Sending Bad Responses

1. **Activate kill switch** immediately
2. Check recent conversations in `ig_conversations` to assess scope
3. Review `AGENTS.md` system prompt for issues
4. Check if the system prompt was accidentally modified in `agent_config`
5. Review RAG chunks — was bad content added to the knowledge base?
6. Fix the root cause, test with a manual DM, then deactivate kill switch

### Database Connection Issues

1. Check Supabase Dashboard for service status
2. Check if you've hit the connection pool limit (visible in Supabase dashboard)
3. Check for orphaned conversation locks:
   ```sql
   SELECT * FROM conversation_locks;
   -- Clear all if stuck:
   DELETE FROM conversation_locks;
   ```

### Suspected Data Breach / Unauthorized Access

1. Rotate all API keys immediately:
   - Meta Page Access Token
   - Anthropic API key
   - OpenAI API key
   - Calendly API key
   - Telegram Bot Token
   - Supabase service key
2. Update all keys in n8n credentials
3. Check Supabase audit logs for unusual queries
4. If Admin UI was compromised, change the admin password

---

## Supabase Maintenance

### Cleaning Up Stale Locks

Run periodically or if conversations seem stuck:
```sql
SELECT cleanup_stale_locks();
```

### Checking Table Sizes

```sql
SELECT
  relname as table_name,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Archiving Old Conversations

If the `ig_conversations` table grows large (>100K rows), consider archiving old messages:
```sql
-- Check table size first
SELECT COUNT(*) FROM ig_conversations WHERE created_at < NOW() - INTERVAL '6 months';

-- Archive to a separate table or export, then delete
```

### Checking pgvector Index Health

```sql
-- Check knowledge chunk count
SELECT COUNT(*) FROM knowledge_chunks WHERE is_active = true;

-- If > 500 chunks, consider rebuilding the IVFFlat index with more lists
-- DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;
-- CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

---

## Common Issues & Troubleshooting

### "Messages not being received"
1. Check if Workflow 1 is active in n8n
2. Verify Meta webhook subscription is active (Meta App Dashboard -> Webhooks)
3. Check if the verify token matches between Meta and n8n
4. Check n8n execution history for incoming webhooks

### "Replies not being sent"
1. Check `api_error_log` for Instagram Send API errors
2. Verify Meta Page Access Token is valid (use debug_token endpoint)
3. Check if the 24-hour messaging window has expired for that user
4. Check if `kill_switch_enabled` is set to `true`

### "RAG returning irrelevant results"
1. Test with `scripts/test_rag_query.js` to see similarity scores
2. If scores are too low, lower `rag_match_threshold` in `agent_config`
3. If irrelevant chunks score high, improve chunk content or add more specific chunks
4. Check if embeddings exist: `SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NULL;`

### "Duplicate messages being sent"
1. Check `duplicate_webhook_log` — dedup should be catching Meta's double-delivery
2. If duplicates are getting through, check the `message_mid` unique index on `ig_conversations`
3. Verify the dedup check node in Workflow 1 is working correctly

### "Conversation lock stuck"
1. Check `conversation_locks` table for the stuck sender
2. If `expires_at` is in the past, the cleanup function should handle it
3. Manual fix: `DELETE FROM conversation_locks WHERE ig_sender_id = 'THE_SENDER_ID';`
4. Run `SELECT cleanup_stale_locks();` to clear all expired locks
