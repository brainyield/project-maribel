import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  AgentConfig,
  AnalyticsSummaryRow,
  Conversation,
  EscalationQueueItem,
  Escalation,
  KnowledgeChunk,
  KnowledgeVersion,
  LeadPipelineItem,
  LeadFilters,
  Lead,
} from '../types/maribel';

// --- Analytics ---

export function useAnalyticsSummary(period: 'day' | 'week' | 'month' = 'week') {
  return useQuery<AnalyticsSummaryRow[]>({
    queryKey: ['maribel', 'analytics', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_analytics_summary', { p_period: period });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAnalyticsChart(days: number = 30) {
  return useQuery({
    queryKey: ['maribel', 'analytics', 'chart', days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from('ig_analytics_daily')
        .select('*')
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// --- Dashboard counts ---

export function useDashboardCounts() {
  return useQuery({
    queryKey: ['maribel', 'dashboard', 'counts'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [conversations, newLeads, openEscalations, bookings] = await Promise.all([
        supabase
          .from('ig_conversations')
          .select('ig_sender_id', { count: 'exact', head: true })
          .gte('created_at', today),
        supabase
          .from('ig_leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo),
        supabase
          .from('ig_escalations')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', false),
        supabase
          .from('ig_leads')
          .select('*', { count: 'exact', head: true })
          .eq('calendly_booked', true)
          .gte('updated_at', weekAgo),
      ]);

      return {
        todayConversations: conversations.count ?? 0,
        newLeadsWeek: newLeads.count ?? 0,
        openEscalations: openEscalations.count ?? 0,
        bookingsWeek: bookings.count ?? 0,
      };
    },
  });
}

// --- Escalations ---

export function useEscalationQueue() {
  return useQuery<EscalationQueueItem[]>({
    queryKey: ['maribel', 'escalations', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_escalation_queue');
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15_000,
  });
}

export function useAllEscalations(filter: 'open' | 'resolved' | 'all' = 'all') {
  return useQuery<Escalation[]>({
    queryKey: ['maribel', 'escalations', filter],
    queryFn: async () => {
      let query = supabase
        .from('ig_escalations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'open') query = query.eq('resolved', false);
      if (filter === 'resolved') query = query.eq('resolved', true);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// --- Leads ---

export function useLeadPipeline(filters: LeadFilters, page: number = 0) {
  return useQuery<{ leads: LeadPipelineItem[]; totalCount: number }>({
    queryKey: ['maribel', 'leads', filters, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lead_pipeline', {
        p_score_filter: filters.score || null,
        p_status_filter: filters.status || null,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_limit: 50,
        p_offset: page * 50,
      });
      if (error) throw error;
      const leads = (data ?? []) as LeadPipelineItem[];
      const totalCount = leads.length > 0 ? leads[0].total_count : 0;
      return { leads, totalCount };
    },
  });
}

export function useLead(senderId: string) {
  return useQuery<Lead | null>({
    queryKey: ['maribel', 'lead', senderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ig_leads')
        .select('*')
        .eq('ig_sender_id', senderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!senderId,
  });
}

// --- Conversations ---

export function useConversations(senderId: string, limit: number = 50) {
  return useQuery<Conversation[]>({
    queryKey: ['maribel', 'conversations', senderId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ig_conversations')
        .select('*')
        .eq('ig_sender_id', senderId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!senderId,
  });
}

// --- Knowledge ---

export function useKnowledgeChunks(sourceFilter?: string) {
  return useQuery<KnowledgeChunk[]>({
    queryKey: ['maribel', 'knowledge', sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from('knowledge_chunks')
        .select('*')
        .order('source_file')
        .order('section_title');

      if (sourceFilter) {
        query = query.eq('source_file', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useKnowledgeVersions(chunkId: number | null) {
  return useQuery<KnowledgeVersion[]>({
    queryKey: ['maribel', 'knowledge', 'versions', chunkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_versions')
        .select('*')
        .eq('chunk_id', chunkId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: chunkId !== null,
  });
}

// --- Config ---

export function useAgentConfig() {
  return useQuery<AgentConfig[]>({
    queryKey: ['maribel', 'config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_config')
        .select('*')
        .order('key');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useConfigValue(key: string) {
  return useQuery<AgentConfig | null>({
    queryKey: ['maribel', 'config', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_config')
        .select('*')
        .eq('key', key)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
