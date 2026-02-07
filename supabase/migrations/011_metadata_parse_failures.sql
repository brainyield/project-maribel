-- Migration 011: Log metadata parsing failures for monitoring
CREATE TABLE metadata_parse_failures (
    id BIGSERIAL PRIMARY KEY,
    ig_sender_id TEXT NOT NULL,
    raw_response TEXT,
    error_message TEXT,
    consecutive_failures INTEGER DEFAULT 1,
    auto_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mpf_sender ON metadata_parse_failures(ig_sender_id);
CREATE INDEX idx_mpf_created ON metadata_parse_failures(created_at DESC);
