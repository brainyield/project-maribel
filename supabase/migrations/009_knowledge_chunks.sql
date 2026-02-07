-- Migration 009: RAG knowledge base — semantically chunked content with embeddings
CREATE TABLE knowledge_chunks (
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT NOT NULL,
    section_title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector index for cosine similarity search
CREATE INDEX idx_knowledge_embedding ON knowledge_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);

CREATE INDEX idx_knowledge_source ON knowledge_chunks(source_file);
CREATE INDEX idx_knowledge_active ON knowledge_chunks(is_active) WHERE is_active = TRUE;

-- Auto-update updated_at and increment version
CREATE OR REPLACE FUNCTION update_knowledge_chunk_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_chunk_version
    BEFORE UPDATE ON knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_chunk_version();

-- RPC function for cosine similarity search
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id BIGINT,
    source_file TEXT,
    section_title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kc.id,
        kc.source_file,
        kc.section_title,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.is_active = TRUE
        AND 1 - (kc.embedding <=> query_embedding) > match_threshold
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
