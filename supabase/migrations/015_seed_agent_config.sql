-- Migration 015: Seed all configuration values
-- Includes A14 fix: conversation_history_limit row
INSERT INTO agent_config (key, value, description) VALUES

-- Graph API version
('graph_api_version', 'v21.0', 'Meta Graph API version — update here when upgrading, all workflows reference this dynamically'),

-- System prompt (placeholder — will be replaced at build time)
('system_prompt', '[FULL AGENTS.MD CONTENT INSERTED AT BUILD TIME]', 'Maribel system prompt — edit here to change behavior without redeploying workflows'),

-- Feature flags
('auto_reply_enabled', 'true', 'Kill switch — set to false to disable all AI replies'),
('rag_enabled', 'true', 'Enable/disable RAG knowledge retrieval'),
('memory_enabled', 'true', 'Enable/disable conversation memory injection'),
('proactive_booking_enabled', 'true', 'Enable/disable proactive Calendly slot booking (falls back to link sharing)'),

-- Calendly configuration
('calendly_booking_link', 'https://calendly.com/eatonacademic/15min', 'Fallback Calendly link for direct sharing'),
('calendly_event_type_uri', '', 'Calendly event type URI for API slot lookups — get from Calendly API'),
('calendly_user_uri', '', 'Calendly user URI — get from Calendly API /users/me endpoint'),
('calendly_slot_days_ahead', '5', 'How many days ahead to look for available slots'),
('calendly_slots_to_offer', '4', 'Number of slot options to present to the parent'),

-- Response configuration
('message_split_delay_ms', '1500', 'Delay in ms between split messages (1-2 seconds recommended for IG ordering)'),
('max_retry_attempts', '3', 'Maximum retry attempts for external API calls'),

-- RAG configuration
('rag_match_threshold', '0.3', 'Minimum cosine similarity threshold for RAG chunk retrieval'),
('rag_match_count', '5', 'Number of knowledge chunks to retrieve per query'),

-- Conversation memory
('memory_session_gap_hours', '2', 'Hours of inactivity before a conversation session is considered ended'),

-- Metadata parse failure escalation threshold
('metadata_failure_escalation_threshold', '3', 'Auto-escalate after N consecutive metadata parse failures for the same conversation'),

-- Instagram page account ID
('instagram_page_sender_id', '', 'The sender ID that represents our Instagram page account — used to detect echo/manual replies'),

-- A14: Conversation history limit (configurable instead of hardcoded)
('conversation_history_limit', '15', 'Number of recent messages to include in Claude context window');
