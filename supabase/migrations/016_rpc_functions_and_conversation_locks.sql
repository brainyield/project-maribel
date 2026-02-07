-- Migration 016: RPC functions + conversation locks (A1 fix)
-- Uses row-level INSERT/DELETE locking instead of advisory locks.
-- Advisory locks don't work with Supabase's connection pooling (Supavisor/PgBouncer in transaction mode).

CREATE TABLE conversation_locks (
    ig_sender_id TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_by TEXT DEFAULT 'workflow',
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 seconds'
);

-- Acquire lock: INSERT with conflict handling
-- Returns TRUE if lock acquired, FALSE if already locked
CREATE OR REPLACE FUNCTION acquire_conversation_lock(sender_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO conversation_locks (ig_sender_id, locked_at, expires_at)
    VALUES (sender_id, NOW(), NOW() + INTERVAL '30 seconds')
    ON CONFLICT (ig_sender_id) DO UPDATE
        SET locked_at = NOW(),
            expires_at = NOW() + INTERVAL '30 seconds'
        WHERE conversation_locks.expires_at < NOW();

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

-- Periodic cleanup: Remove stale locks
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

-- Get consecutive metadata parse failure count for a sender
CREATE OR REPLACE FUNCTION get_consecutive_parse_failures(sender TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    fail_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fail_count
    FROM metadata_parse_failures
    WHERE ig_sender_id = sender
        AND auto_escalated = FALSE
        AND created_at > (
            SELECT COALESCE(MAX(c.created_at), '1970-01-01'::timestamptz)
            FROM ig_conversations c
            WHERE c.ig_sender_id = sender
                AND c.role = 'assistant'
                AND c.source = 'ai'
                AND c.metadata != '{}'::jsonb
                AND c.metadata->>'parse_error' IS NULL
        );
    RETURN fail_count;
END;
$$;

-- Get conversations needing summaries (session ended 2+ hours ago, no recent summary)
CREATE OR REPLACE FUNCTION get_conversations_needing_summary(gap_hours INTEGER DEFAULT 2)
RETURNS TABLE (
    ig_sender_id TEXT,
    last_message_at TIMESTAMPTZ,
    message_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.ig_sender_id,
        MAX(c.created_at) AS last_message_at,
        COUNT(*) AS message_count
    FROM ig_conversations c
    JOIN ig_leads l ON l.ig_sender_id = c.ig_sender_id
    WHERE c.created_at > NOW() - INTERVAL '7 days'
    GROUP BY c.ig_sender_id
    HAVING
        MAX(c.created_at) < NOW() - (gap_hours || ' hours')::INTERVAL
        AND (
            NOT EXISTS (SELECT 1 FROM ig_leads WHERE ig_leads.ig_sender_id = c.ig_sender_id AND summary_updated_at IS NOT NULL)
            OR (SELECT summary_updated_at FROM ig_leads WHERE ig_leads.ig_sender_id = c.ig_sender_id) < MAX(c.created_at)
        );
END;
$$;
