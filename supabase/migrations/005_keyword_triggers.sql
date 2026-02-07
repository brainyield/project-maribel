-- Migration 005: Maps comment keywords to DM templates
CREATE TABLE keyword_triggers (
    id SERIAL PRIMARY KEY,
    keyword TEXT NOT NULL UNIQUE,
    dm_template_en TEXT NOT NULL,
    dm_template_es TEXT,
    program_slug TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
