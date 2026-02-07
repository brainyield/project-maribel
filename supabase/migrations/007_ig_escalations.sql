-- Migration 007: Log of all escalated conversations
CREATE TABLE ig_escalations (
    id BIGSERIAL PRIMARY KEY,
    ig_sender_id TEXT NOT NULL,
    ig_username TEXT,
    reason TEXT NOT NULL,
    conversation_summary TEXT,
    telegram_message_id TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escalations_unresolved ON ig_escalations(resolved) WHERE resolved = FALSE;
CREATE INDEX idx_escalations_sender ON ig_escalations(ig_sender_id);
