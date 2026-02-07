-- Migration 008: Daily aggregated metrics
CREATE TABLE ig_analytics_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_conversations INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    returning_leads INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    escalations INTEGER DEFAULT 0,
    escalations_resolved INTEGER DEFAULT 0,
    calendly_bookings INTEGER DEFAULT 0,
    avg_messages_per_conversation NUMERIC(5,2),
    avg_response_time_seconds NUMERIC(10,2),
    top_interests TEXT[],
    language_breakdown JSONB DEFAULT '{}',
    top_knowledge_chunks JSONB DEFAULT '{}',
    metadata_parse_failures INTEGER DEFAULT 0,
    duplicate_webhooks_detected INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
