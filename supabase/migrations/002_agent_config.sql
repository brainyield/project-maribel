-- Migration 002: Central configuration table for all agent settings.
-- Stores system prompt, Graph API version, Calendly config, feature flags, etc.
-- This replaces ALL hardcoded values in n8n workflows.
CREATE TABLE agent_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT DEFAULT 'system'
);

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_agent_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agent_config_timestamp
    BEFORE UPDATE ON agent_config
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_config_timestamp();
