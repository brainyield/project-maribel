-- Migration 012: Log duplicate webhook deliveries for monitoring
CREATE TABLE duplicate_webhook_log (
    id BIGSERIAL PRIMARY KEY,
    message_mid TEXT NOT NULL,
    ig_sender_id TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dwl_created ON duplicate_webhook_log(received_at DESC);
