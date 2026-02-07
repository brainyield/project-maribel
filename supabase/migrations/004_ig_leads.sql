-- Migration 004: CRM-lite — tracks every person who has DM'd us
-- Includes A5 fix: booking_state, booking_selected_slot, booking_email columns
CREATE TABLE ig_leads (
    id BIGSERIAL PRIMARY KEY,
    ig_sender_id TEXT UNIQUE NOT NULL,
    ig_username TEXT,
    parent_name TEXT,
    email TEXT,
    phone TEXT,
    child_grade TEXT,
    child_name TEXT,
    location TEXT,
    interests TEXT[] DEFAULT '{}',
    lead_score TEXT DEFAULT 'new'
        CHECK (lead_score IN ('new', 'cold', 'warm', 'hot', 'existing_client', 'enrolled')),
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'escalated', 'paused', 'converted', 'inactive', 'do_not_contact')),
    language TEXT DEFAULT 'en'
        CHECK (language IN ('en', 'es')),
    referral_source TEXT,
    calendly_booked BOOLEAN DEFAULT FALSE,
    calendly_event_uri TEXT,
    -- A5: Durable booking state machine
    booking_state TEXT DEFAULT NULL
        CHECK (booking_state IS NULL OR booking_state IN ('slots_offered', 'slot_selected', 'email_requested', 'booking_confirmed', 'booking_failed')),
    booking_selected_slot TIMESTAMPTZ,
    booking_email TEXT,
    conversation_summary TEXT,
    summary_updated_at TIMESTAMPTZ,
    first_contact_at TIMESTAMPTZ DEFAULT NOW(),
    last_contact_at TIMESTAMPTZ DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_score ON ig_leads(lead_score);
CREATE INDEX idx_leads_status ON ig_leads(status);
CREATE INDEX idx_leads_last_contact ON ig_leads(last_contact_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leads_timestamp
    BEFORE UPDATE ON ig_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_timestamp();
