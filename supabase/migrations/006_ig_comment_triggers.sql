-- Migration 006: Tracks which users we've already DM'd from which post (prevent duplicates)
CREATE TABLE ig_comment_triggers (
    id BIGSERIAL PRIMARY KEY,
    ig_sender_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    dm_sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ig_sender_id, media_id)
);

CREATE INDEX idx_comment_trigger_sender ON ig_comment_triggers(ig_sender_id);
