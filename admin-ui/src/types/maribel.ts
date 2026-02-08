export interface AgentConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string;
}

export interface Conversation {
  id: number;
  ig_sender_id: string;
  ig_username: string | null;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  message_mid: string | null;
  source: 'ai' | 'manual' | 'system' | 'comment_trigger';
  created_at: string;
}

export interface Lead {
  id: number;
  ig_sender_id: string;
  ig_username: string | null;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  child_grade: string | null;
  child_name: string | null;
  location: string | null;
  interests: string[];
  lead_score: 'new' | 'cold' | 'warm' | 'hot' | 'existing_client' | 'enrolled';
  status: 'active' | 'escalated' | 'paused' | 'converted' | 'inactive' | 'do_not_contact';
  language: 'en' | 'es';
  referral_source: string | null;
  calendly_booked: boolean;
  calendly_event_uri: string | null;
  conversation_summary: string | null;
  summary_updated_at: string | null;
  first_contact_at: string;
  last_contact_at: string;
  total_messages: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: number;
  ig_sender_id: string;
  ig_username: string | null;
  reason: string;
  conversation_summary: string | null;
  telegram_message_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_notes: string | null;
  created_at: string;
}

export interface KnowledgeChunk {
  id: number;
  source_file: string;
  section_title: string;
  content: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersion {
  id: number;
  chunk_id: number | null;
  action: 'create' | 'update' | 'delete' | 'reembed';
  old_content: string | null;
  new_content: string | null;
  changed_by: string;
  diff_summary: string | null;
  created_at: string;
}

export interface AnalyticsDaily {
  id: number;
  date: string;
  total_conversations: number;
  new_leads: number;
  returning_leads: number;
  messages_received: number;
  messages_sent: number;
  escalations: number;
  escalations_resolved: number;
  calendly_bookings: number;
  avg_response_time_seconds: number | null;
  top_interests: string[];
  language_breakdown: Record<string, number>;
  created_at: string;
}

// RPC return types

export interface EscalationQueueItem {
  escalation_id: number;
  ig_sender_id: string;
  ig_username: string | null;
  reason: string;
  conversation_summary: string | null;
  created_at: string;
  lead_score: string | null;
  parent_name: string | null;
  total_messages: number | null;
  recent_messages: ConversationMessage[] | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  source: string;
  created_at: string;
}

export interface LeadPipelineItem {
  lead_id: number;
  ig_sender_id: string;
  ig_username: string | null;
  parent_name: string | null;
  child_name: string | null;
  child_grade: string | null;
  location: string | null;
  interests: string[];
  lead_score: string;
  status: string;
  language: string;
  calendly_booked: boolean;
  total_messages: number;
  first_contact_at: string;
  last_contact_at: string;
  conversation_summary: string | null;
  total_count: number;
}

export interface AnalyticsSummaryRow {
  period_date: string;
  total_conversations: number;
  new_leads: number;
  returning_leads: number;
  messages_received: number;
  messages_sent: number;
  escalations: number;
  escalations_resolved: number;
  calendly_bookings: number;
  avg_response_time_seconds: number | null;
  language_breakdown: Record<string, number>;
  top_interests: string[];
}

export interface LeadFilters {
  score: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
}
