-- Migration 013: Log all external API errors for monitoring and debugging
CREATE TABLE api_error_log (
    id BIGSERIAL PRIMARY KEY,
    service TEXT NOT NULL CHECK (service IN ('claude', 'instagram', 'supabase', 'calendly', 'openai', 'telegram')),
    endpoint TEXT,
    status_code INTEGER,
    error_message TEXT,
    request_context JSONB DEFAULT '{}',
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ael_service ON api_error_log(service);
CREATE INDEX idx_ael_created ON api_error_log(created_at DESC);
CREATE INDEX idx_ael_unresolved ON api_error_log(resolved) WHERE resolved = FALSE;
