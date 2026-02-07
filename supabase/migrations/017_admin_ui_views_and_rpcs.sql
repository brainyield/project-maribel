-- Migration 017: Admin UI views and RPCs

-- Escalation queue view for admin UI
CREATE OR REPLACE FUNCTION get_escalation_queue()
RETURNS TABLE (
    escalation_id BIGINT,
    ig_sender_id TEXT,
    ig_username TEXT,
    reason TEXT,
    conversation_summary TEXT,
    created_at TIMESTAMPTZ,
    lead_score TEXT,
    parent_name TEXT,
    total_messages INTEGER,
    recent_messages JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS escalation_id,
        e.ig_sender_id,
        e.ig_username,
        e.reason,
        e.conversation_summary,
        e.created_at,
        l.lead_score,
        l.parent_name,
        l.total_messages,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'role', c.role,
                'content', c.content,
                'source', c.source,
                'created_at', c.created_at
            ) ORDER BY c.created_at DESC)
            FROM (
                SELECT * FROM ig_conversations ic
                WHERE ic.ig_sender_id = e.ig_sender_id
                ORDER BY ic.created_at DESC
                LIMIT 10
            ) c
        ) AS recent_messages
    FROM ig_escalations e
    LEFT JOIN ig_leads l ON l.ig_sender_id = e.ig_sender_id
    WHERE e.resolved = FALSE
    ORDER BY e.created_at DESC;
END;
$$;

-- Resolve escalation (called from admin UI or Telegram callback)
CREATE OR REPLACE FUNCTION resolve_escalation(
    p_escalation_id BIGINT,
    p_resolved_by TEXT DEFAULT 'admin_ui',
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ig_escalations
    SET resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        resolved_notes = p_notes
    WHERE id = p_escalation_id;

    UPDATE ig_leads
    SET status = 'active'
    WHERE ig_sender_id = (
        SELECT ig_sender_id FROM ig_escalations WHERE id = p_escalation_id
    );
END;
$$;

-- Lead pipeline query for admin UI
CREATE OR REPLACE FUNCTION get_lead_pipeline(
    p_score_filter TEXT DEFAULT NULL,
    p_status_filter TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    lead_id BIGINT,
    ig_sender_id TEXT,
    ig_username TEXT,
    parent_name TEXT,
    child_name TEXT,
    child_grade TEXT,
    location TEXT,
    interests TEXT[],
    lead_score TEXT,
    status TEXT,
    language TEXT,
    calendly_booked BOOLEAN,
    total_messages INTEGER,
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    conversation_summary TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id AS lead_id,
        l.ig_sender_id,
        l.ig_username,
        l.parent_name,
        l.child_name,
        l.child_grade,
        l.location,
        l.interests,
        l.lead_score,
        l.status,
        l.language,
        l.calendly_booked,
        l.total_messages,
        l.first_contact_at,
        l.last_contact_at,
        l.conversation_summary,
        COUNT(*) OVER() AS total_count
    FROM ig_leads l
    WHERE (p_score_filter IS NULL OR l.lead_score = p_score_filter)
        AND (p_status_filter IS NULL OR l.status = p_status_filter)
        AND (p_date_from IS NULL OR l.first_contact_at >= p_date_from)
        AND (p_date_to IS NULL OR l.first_contact_at <= p_date_to)
    ORDER BY l.last_contact_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Analytics aggregation for admin dashboard
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_period TEXT DEFAULT 'week'
)
RETURNS TABLE (
    period_date DATE,
    total_conversations INTEGER,
    new_leads INTEGER,
    returning_leads INTEGER,
    messages_received INTEGER,
    messages_sent INTEGER,
    escalations INTEGER,
    escalations_resolved INTEGER,
    calendly_bookings INTEGER,
    avg_response_time_seconds NUMERIC,
    language_breakdown JSONB,
    top_interests TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.date AS period_date,
        a.total_conversations,
        a.new_leads,
        a.returning_leads,
        a.messages_received,
        a.messages_sent,
        a.escalations,
        a.escalations_resolved,
        a.calendly_bookings,
        a.avg_response_time_seconds,
        a.language_breakdown,
        a.top_interests
    FROM ig_analytics_daily a
    WHERE a.date >= CASE
        WHEN p_period = 'day' THEN CURRENT_DATE
        WHEN p_period = 'week' THEN CURRENT_DATE - INTERVAL '7 days'
        WHEN p_period = 'month' THEN CURRENT_DATE - INTERVAL '30 days'
        ELSE CURRENT_DATE - INTERVAL '7 days'
    END
    ORDER BY a.date DESC;
END;
$$;
