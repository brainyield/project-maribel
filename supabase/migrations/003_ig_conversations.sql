-- Migration 003: Stores every message in every Instagram DM conversation
CREATE TABLE ig_conversations (
    id BIGSERIAL PRIMARY KEY,
    ig_sender_id TEXT NOT NULL,
    ig_username TEXT,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    message_mid TEXT,
    source TEXT DEFAULT 'ai'
        CHECK (source IN ('ai', 'manual', 'system', 'comment_trigger')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_sender ON ig_conversations(ig_sender_id);
CREATE INDEX idx_conv_created ON ig_conversations(created_at DESC);
CREATE INDEX idx_conv_sender_created ON ig_conversations(ig_sender_id, created_at DESC);
CREATE UNIQUE INDEX idx_conv_message_mid ON ig_conversations(message_mid) WHERE message_mid IS NOT NULL;
