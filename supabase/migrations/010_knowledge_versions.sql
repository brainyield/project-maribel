-- Migration 010: Audit log for knowledge base changes
CREATE TABLE knowledge_versions (
    id BIGSERIAL PRIMARY KEY,
    chunk_id BIGINT REFERENCES knowledge_chunks(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'reembed')),
    old_content TEXT,
    new_content TEXT,
    changed_by TEXT DEFAULT 'system',
    diff_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kv_chunk ON knowledge_versions(chunk_id);
CREATE INDEX idx_kv_created ON knowledge_versions(created_at DESC);
