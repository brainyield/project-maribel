# Project Maribel — Assumptions Resolution Guide

> **Purpose:** This document lists every assumption made in the V2 spec, categorizes each by risk level, and provides a concrete resolution: either a spec change to make before building, a validation step to perform during the build, or a configuration note for Claude Code. Hand this to Claude Code alongside each build phase prompt so it can apply the correct fix at the right time.

---

## How to Use This Document

Each assumption has:
- **Risk Level:** 🔴 High (could block the build or cause production failures), 🟡 Medium (will degrade functionality if wrong), 🟢 Low (tunable after launch)
- **Resolution Type:** `SPEC CHANGE` (modify the spec before building), `VALIDATE DURING BUILD` (test during that phase), or `CONFIGURE POST-LAUNCH` (tune after go-live)
- **Applies To Phase:** Which build phase (from the phased build plan) this affects

---

## 🔴 A1 — Advisory Locks Don't Work with Supabase Connection Pooling

**The Assumption:** The spec uses `pg_try_advisory_lock()` (session-level) via RPC functions `acquire_conversation_lock` and `release_conversation_lock` to serialize messages per sender. Session-level advisory locks require a persistent database connection for the duration of the lock.

**Why It's Wrong:** Supabase uses Supavisor (previously PgBouncer) in **transaction pooling mode** on port 6543. In transaction pooling, the database connection is returned to the pool after each transaction completes. Session-level advisory locks are released when the connection is returned — which means the lock disappears immediately after the RPC call returns, making it useless.

**Resolution Type:** `SPEC CHANGE` — Replace the concurrency mechanism before building.

**Applies To Phase:** Phase 2 (Supabase Schema)

**Fix — Replace advisory locks with a row-level locking table:**

```sql
-- Replace Migration 016's advisory lock functions with this:

CREATE TABLE conversation_locks (
    ig_sender_id TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_by TEXT DEFAULT 'workflow',  -- workflow execution ID if available
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 seconds'
);

-- Acquire lock: INSERT with conflict handling
-- Returns TRUE if lock acquired, FALSE if already locked
CREATE OR REPLACE FUNCTION acquire_conversation_lock(sender_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Try to insert a lock row. If it already exists and hasn't expired, fail.
    -- If it exists but IS expired, take it over (stale lock cleanup).
    INSERT INTO conversation_locks (ig_sender_id, locked_at, expires_at)
    VALUES (sender_id, NOW(), NOW() + INTERVAL '30 seconds')
    ON CONFLICT (ig_sender_id) DO UPDATE
        SET locked_at = NOW(),
            expires_at = NOW() + INTERVAL '30 seconds'
        WHERE conversation_locks.expires_at < NOW();  -- Only take over expired locks

    -- If a row was inserted or updated, we got the lock
    RETURN FOUND;
END;
$$;

-- Release lock: DELETE the row
CREATE OR REPLACE FUNCTION release_conversation_lock(sender_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM conversation_locks WHERE ig_sender_id = sender_id;
END;
$$;

-- Periodic cleanup: Remove stale locks (run from a cron or the global error handler)
CREATE OR REPLACE FUNCTION cleanup_stale_locks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    cleaned INTEGER;
BEGIN
    DELETE FROM conversation_locks WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned = ROW_COUNT;
    RETURN cleaned;
END;
$$;
```

**Additional workflow changes:**
- Node 9 in Workflow 1: Call `acquire_conversation_lock()`. If returns FALSE, wait 3 seconds and retry up to 3 times. If still locked, save the user message and exit.
- Node 28 in Workflow 1: Call `release_conversation_lock()`. Also add this to ALL exit paths (fallback, error, escalation) to prevent orphaned locks.
- Add `cleanup_stale_locks()` call to the beginning of Workflow 4 (Daily Analytics) as housekeeping.
- The 30-second expiry acts as a safety net — even if a workflow crashes without releasing, the lock auto-expires.

---

## 🔴 A2 — n8n Code Nodes May Not Support `fetch()` Natively

**The Assumption:** Several Code nodes contain inline `fetch()` calls (OpenAI embeddings in Node 14, lock acquisition logic).

**Why It's Risky:** n8n Code nodes run in a sandboxed JavaScript environment. While recent versions of n8n support `fetch()` globally (Node.js 18+), n8n Cloud may have restrictions. If `fetch()` isn't available, these nodes will fail silently or throw runtime errors.

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 4 (n8n Workflows)

**Fix:** Claude Code should test `fetch()` availability in a simple n8n Code node early in the workflow build. If it's not available:
- Replace all inline `fetch()` calls with dedicated **HTTP Request nodes** (n8n's native node for external API calls)
- The OpenAI embedding call (Node 14) becomes an HTTP Request node instead of a Code node
- The Calendly slot fetch (Node 20a) is already an HTTP Request node, so no change needed there
- Keep Code nodes for data transformation only (formatting, parsing, splitting) — not for HTTP calls

**Test script for Claude Code:**
```javascript
// Run this in an n8n Code node first to verify
try {
  const res = await fetch('https://httpbin.org/get');
  const data = await res.json();
  return [{ json: { fetch_works: true, status: data.url } }];
} catch (e) {
  return [{ json: { fetch_works: false, error: e.message } }];
}
```

---

## 🔴 A3 — Calendly Programmatic Booking API Requirements

**The Assumption:** The spec has Maribel fetching available slots via `GET /event_type_available_times` and booking via a "Create Event Invitee" POST endpoint.

**Status: CONFIRMED VALID (with conditions).** Calendly launched their Scheduling API (Create Event Invitee endpoint) in October 2025. It supports the exact AI agent booking flow described in the spec. However:

**Conditions that must be met:**
1. **Paid Calendly plan required** — The Scheduling API is not available on the free plan. Ivan must be on Standard or higher.
2. **OAuth application OR Personal Access Token** — A Personal Access Token (PAT) works for accessing your own organization's data. The spec uses a PAT, which is correct.
3. **The `event_type_available_times` endpoint has a 7-day limit per request** — The spec already sets `calendly_slot_days_ahead` to 5, which is within this limit. Good.
4. **Location handling** — If the event type has a location configured that requires invitee input (like "ask invitee" or "outbound call"), the booking POST must include `location` details. This is not in the current spec.
5. **The actual endpoint is `POST /scheduled_events/{event_uuid}/invitees`** — Verify the exact endpoint path matches Calendly's current docs at build time.

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 4 (Workflow 1, Nodes 20a-20b) and Phase 1 (Ivan's manual Calendly setup)

**Fix:**
- Claude Code should read the Calendly API docs (`https://developer.calendly.com/api-docs/p3ghrxrwbl8kqe-create-event-invitee`) during the Calendly workflow build phase to confirm exact endpoint paths and required fields.
- Add `calendly_event_location_kind` to `agent_config` seed data (e.g., `'google_meet'`, `'zoom'`, `'phone'`, etc.) so the booking POST includes the correct location.
- Verify Ivan's Calendly plan is Standard or higher before attempting API access.
- The fallback (sharing the booking link) remains as-is — this is the safety net.

---

## 🟡 A4 — Service Role Key Exposed in Browser (Admin UI)

**The Assumption:** The admin UI uses `VITE_SUPABASE_MARIBEL_SERVICE_KEY` directly in the browser Supabase client. The service role key bypasses all Row Level Security.

**Why It's Risky:** If anyone accesses the `/maribel` routes (even through your existing app's auth), they have unrestricted database access to all Maribel tables. This is fine if and only if:
- Your existing app has authentication that prevents unauthorized access to `/maribel` routes
- Only you (Ivan) can reach those routes

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 6 (Admin UI)

**Fix — Choose one of these approaches:**

**Option A (simplest, recommended for now):** Keep the service key but add a route guard. Your existing app presumably has auth. Make sure the `/maribel` routes are behind it. Claude Code should wrap the Maribel route group in whatever auth guard your app already uses.

**Option B (more secure, recommended if you ever add team members):** Use the anon key instead of the service key, and implement RLS policies on all Maribel tables. This is more work but means a compromised browser session only has access to what RLS allows. This can be a V2 improvement.

**For now, go with Option A.** Add this note to the Phase 6 prompt for Claude Code: "Wrap all `/maribel` routes in the existing app's authentication guard. Only authenticated admin users should be able to access these routes."

---

## 🟡 A5 — Calendly Booking State Managed by Metadata Only (No Durable State Machine)

**The Assumption:** The multi-turn booking flow (offer slots → pick slot → collect email → book) is tracked entirely through Claude's `next_action` metadata field. There's no database column tracking booking state.

**Why It's Risky:** If metadata parsing fails mid-booking, or Claude misinterprets the conversation, the booking state is lost. The parent might say "number 2" to pick a slot, Claude generates the wrong `next_action`, and the flow breaks.

**Resolution Type:** `SPEC CHANGE`

**Applies To Phase:** Phase 2 (Schema) + Phase 4 (Workflow 1)

**Fix — Add a `booking_state` column to `ig_leads`:**

```sql
-- Add to Migration 004 (ig_leads):
booking_state TEXT DEFAULT NULL
    CHECK (booking_state IN (NULL, 'slots_offered', 'slot_selected', 'email_requested', 'booking_confirmed', 'booking_failed')),
booking_selected_slot TIMESTAMPTZ,          -- The slot the parent chose
booking_email TEXT,                          -- Email collected for booking
```

**Workflow changes:**
- When Maribel offers slots (`next_action = 'offer_booking_slots'`): Update `booking_state = 'slots_offered'` and store the offered slots in the metadata or a temp field.
- When parent picks a slot: Update `booking_state = 'slot_selected'`, set `booking_selected_slot`.
- When email is collected: Update `booking_state = 'email_requested'`, set `booking_email`.
- After successful booking: Update `booking_state = 'booking_confirmed'`, set `calendly_booked = true`.
- On failure: Update `booking_state = 'booking_failed'`.

This way, even if metadata parsing fails, the workflow can check `booking_state` to know where the flow left off.

---

## 🟡 A6 — Echo Message Detection Consistency

**The Assumption:** When Ivan replies manually in Instagram, Meta sends a webhook with `is_echo: true` and a `sender_id` matching the page account. The spec distinguishes Ivan's manual replies from Maribel's echoed-back messages by checking `message_mid` against `ig_conversations`.

**Why It's Risky:** Meta's echo behavior may not be 100% consistent. Edge cases:
- Echoes might arrive without `is_echo` flag in some scenarios
- The `sender_id` for echoes might not always match `instagram_page_sender_id`
- Maribel's own sent messages might not always be in `ig_conversations` by the time the echo arrives (race condition)

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 4 (Workflow 1, Node 6a-6d) + Testing Phase

**Fix:**
- During testing (Phase F in the test plan), thoroughly test echo detection with multiple message types (text, emoji, images).
- Add a 500ms delay before the echo dedup check (Node 6b) to give Node 23 (save assistant reply) time to write to the database first.
- Log ALL echo messages to a dedicated log or to `api_error_log` with service='instagram' so you can audit echo behavior in production.
- If echoes are inconsistent, fall back to: treat ALL echoes as manual replies, but only log them if the `message_mid` is NOT already in `ig_conversations` (which handles the Maribel-own-echo case).

---

## 🟡 A7 — HUMAN_AGENT Tag Not Implemented

**The Assumption:** The spec mentions the 7-day messaging window with the HUMAN_AGENT tag but doesn't implement sending messages with that tag.

**Resolution Type:** `SPEC CHANGE`

**Applies To Phase:** Phase 4 (Workflow 1, Node 22 — Instagram Send API)

**Fix:** When Ivan's manual replies are detected and logged (Node 6c), Maribel's *next* response (after escalation is resolved) should be sent with the HUMAN_AGENT tag to extend the window. Add to Node 22:

```javascript
// In the Send API request body, add message_tag for post-escalation replies
const isPostEscalation = $('Node 10').first().json.was_recently_escalated; // Check if resolved in last 7 days

const body = {
  recipient: { id: sender_id },
  message: { text: chunk }
};

// Only add HUMAN_AGENT tag if this conversation was recently escalated
// and Ivan has manually replied (extending from 24hr to 7-day window)
if (isPostEscalation) {
  body.messaging_type = 'MESSAGE_TAG';
  body.tag = 'HUMAN_AGENT';
}
```

**Note:** The HUMAN_AGENT tag is only for human-initiated follow-ups. Using it for bot messages could violate Meta's policies and risk app suspension. Only apply it when Ivan is actively involved.

---

## 🟡 A8 — Meta Comment Webhook Payload Structure

**The Assumption:** The comment-to-DM workflow (Workflow 2) assumes the comment webhook payload follows a similar structure to the messaging webhook.

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 5 (Workflow 2 — Comment-to-DM)

**Fix:** Claude Code should reference the Meta Webhooks documentation (`https://developers.facebook.com/docs/instagram-platform/webhooks/`) during the Workflow 2 build to verify:
- The exact payload structure for comment events (it uses `changes[].value` not `messaging[]`)
- The field names for commenter ID, comment text, and media ID
- Whether comment webhooks require a separate subscription or are part of the same webhook endpoint

The comment webhook payload is significantly different from the DM webhook payload. Claude Code needs to parse it accordingly.

---

## 🟡 A9 — Admin UI Tech Stack

**The Assumption:** The spec assumes the existing app uses React 19, TypeScript 5.9, Vite, Tailwind (dark theme), TanStack Query v5, React Router v7, and Lucide React.

**Resolution Type:** `VALIDATE DURING BUILD`

**Applies To Phase:** Phase 6 (Admin UI)

**Fix:** Before Claude Code starts the admin UI build, it should:
1. Inspect the existing app's `package.json` for actual dependency versions
2. Check the existing router setup (file-based vs config-based routes)
3. Check the existing Supabase client pattern (how it's initialized, where it lives)
4. Check whether TanStack Query is already configured with a QueryClient provider
5. Match component patterns (does the app use a specific component library? shadcn/ui? custom components?)

Claude Code should adapt the admin UI components to match whatever it finds, not what the spec assumes.

---

## 🟢 A10 — RAG Similarity Threshold (0.3)

**The Assumption:** The default `rag_match_threshold` is 0.3.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Phase 3 (Knowledge Base Ingestion) + ongoing tuning

**Fix:** This is configurable via `agent_config`, so it can be tuned after launch. However, during the testing phase:
- Run 10-15 sample parent questions against the embedded knowledge base
- Log the similarity scores of returned chunks
- If relevant chunks score below 0.3, lower the threshold
- If irrelevant chunks score above 0.3, raise it
- A good starting range is 0.25-0.40 for `text-embedding-3-small`

---

## 🟢 A11 — Top 5 Chunks Retrieval Count

**The Assumption:** The spec retrieves 5 knowledge chunks per query.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Ongoing tuning

**Fix:** Configurable via `agent_config.rag_match_count`. At your current knowledge base size (probably 30-80 chunks), 5 is likely fine. Monitor:
- If Claude's responses seem to lack relevant info, increase to 7-8
- If responses include irrelevant tangents, decrease to 3
- Check token usage per request — 5 chunks of 200-800 tokens each adds 1,000-4,000 tokens per request, well within the context window

---

## 🟢 A12 — OpenAI text-embedding-3-small is the Right Model

**The Assumption:** OpenAI's `text-embedding-3-small` (1536 dimensions) was chosen for cost efficiency.

**Resolution Type:** `CONFIGURE POST-LAUNCH` (but hard to change later)

**Applies To Phase:** Phase 3 (Knowledge Base Ingestion)

**Fix:** This is actually the hardest thing to change after launch because switching embedding models requires re-embedding the entire knowledge base and changing the vector dimension in the schema. For your use case (small knowledge base, conversational queries), `text-embedding-3-small` is appropriate. If you wanted to explore alternatives:
- `text-embedding-3-large` (3072 dims): Better accuracy, 2x storage, not needed at your scale
- Anthropic's Voyage embeddings: Would keep you in the Anthropic ecosystem, but the OpenAI embeddings are more battle-tested for RAG

**Recommendation:** Stick with `text-embedding-3-small`. It's the right choice for this project.

---

## 🟢 A13 — Conversation Summarizer: 300 max_tokens, 2-hour cadence

**The Assumption:** The summarizer uses 300 max_tokens and runs every 2 hours.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Ongoing tuning

**Fix:** Both values are configurable:
- `max_tokens`: If summaries feel truncated, increase to 500. Monitor the actual token usage — most summaries won't hit 300.
- `memory_session_gap_hours`: 2 hours is reasonable. If conversations tend to be shorter (parents who message, get an answer, and leave), 1 hour might be better. If they stretch longer, keep 2.

---

## 🟢 A14 — 15 Messages of Conversation History

**The Assumption:** 15 messages are fetched for context.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Ongoing tuning

**Fix:** Not currently configurable via `agent_config`. Add a config key:

```sql
-- Add to Migration 015 seed:
('conversation_history_limit', '15', 'Number of recent messages to include in Claude context window');
```

Then reference it in Node 12 instead of hardcoding LIMIT 15. This lets you tune it without editing the workflow.

---

## 🟢 A15 — IVFFlat Indexing with lists=20

**The Assumption:** The pgvector index uses IVFFlat with 20 lists, suitable for <1,000 chunks.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Phase 2 (Schema, Migration 009)

**Fix:** This is fine for launch. If the knowledge base grows past ~500 chunks, consider:
- Increasing lists to 50-100
- Switching to HNSW index (better accuracy, slightly more memory)
- The index can be dropped and recreated without data loss

---

## 🟢 A16 — Spanish Language Detection via Regex

**The Assumption:** Fallback language detection uses a regex checking for Spanish characters and common words.

**Resolution Type:** `CONFIGURE POST-LAUNCH`

**Applies To Phase:** Phase 4 (Workflow 1, Node 19) + Phase 5 (Workflow 2, Node 10)

**Fix:** The regex approach is a reasonable fallback for metadata parse failures and keyword-only comments. To improve over time:
- Add more Spanish indicator words to the regex as you encounter misclassifications
- Consider using a lightweight language detection library if misclassification rates are high
- The primary language detection path (Claude's metadata) is much more accurate — the regex is only the fallback

---

## 🟢 A17 — Single Operator (Ivan Only)

**The Assumption:** Only Ivan handles escalations and manual replies.

**Resolution Type:** No action needed now. `CONFIGURE POST-LAUNCH` if you add team members.

**Fix:** If you ever add team members:
- The Telegram escalation flow would need to support multiple chat IDs or a group chat
- The admin UI would need user-specific access controls
- The `resolved_by` field already supports different values, so the data model is ready

---

## 🟢 A18 — Dedicated Supabase Project

**The Assumption:** Maribel gets its own Supabase project rather than sharing the existing Eaton Academic one.

**Resolution Type:** No change needed. This is the right call.

**Rationale:** The isolation benefits outweigh the complexity cost:
- Maribel's tables won't pollute your existing 50+ table schema
- You can manage RLS, backups, and scaling independently
- If Maribel has issues, it doesn't affect your core business app
- The admin UI's second Supabase client is a one-time setup cost

---

## Summary: What Must Change Before Building

| # | Risk | What | Action |
|---|------|------|--------|
| A1 | 🔴 | Advisory locks | Replace with row-level lock table in Migration 016 |
| A2 | 🔴 | `fetch()` in Code nodes | Test early; replace with HTTP Request nodes if needed |
| A3 | 🔴 | Calendly booking API | Confirm endpoint paths and required fields from live docs |
| A4 | 🟡 | Service key in browser | Wrap `/maribel` routes in auth guard |
| A5 | 🟡 | Booking state management | Add `booking_state` column to `ig_leads` |
| A7 | 🟡 | HUMAN_AGENT tag | Add conditional tag to post-escalation send requests |
| A14 | 🟢 | History limit hardcoded | Add `conversation_history_limit` to `agent_config` |
