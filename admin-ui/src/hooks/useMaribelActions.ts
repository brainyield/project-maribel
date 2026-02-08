import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { KnowledgeChunk } from '../types/maribel';

// --- Escalations ---

export function useResolveEscalation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ escalationId, notes }: { escalationId: number; notes: string }) => {
      const { error } = await supabase.rpc('resolve_escalation', {
        p_escalation_id: escalationId,
        p_resolved_by: 'ivan_admin_ui',
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'escalations'] });
      qc.invalidateQueries({ queryKey: ['maribel', 'dashboard'] });
    },
  });
}

// --- Knowledge CRUD ---

type NewChunk = Pick<KnowledgeChunk, 'source_file' | 'section_title' | 'content' | 'metadata' | 'is_active'>;

export function useCreateKnowledgeChunk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chunk: NewChunk) => {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .insert(chunk)
        .select()
        .single();
      if (error) throw error;

      // Log version
      await supabase.from('knowledge_versions').insert({
        chunk_id: data.id,
        action: 'create',
        new_content: data.content,
        changed_by: 'admin_ui',
      });

      // Trigger re-embed
      triggerReembed([data.id]);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'knowledge'] });
    },
  });
}

export function useUpdateKnowledgeChunk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
      oldContent,
    }: {
      id: number;
      updates: Partial<KnowledgeChunk>;
      oldContent?: string;
    }) => {
      const { data, error } = await supabase
        .from('knowledge_chunks')
        .update({ ...updates, version: undefined }) // let DB handle version
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (updates.content !== undefined) {
        await supabase.from('knowledge_versions').insert({
          chunk_id: id,
          action: 'update',
          old_content: oldContent ?? null,
          new_content: updates.content,
          changed_by: 'admin_ui',
        });
        triggerReembed([id]);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'knowledge'] });
    },
  });
}

export function useDeleteKnowledgeChunk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      await supabase.from('knowledge_versions').insert({
        chunk_id: id,
        action: 'delete',
        old_content: content,
        changed_by: 'admin_ui',
      });

      const { error } = await supabase.from('knowledge_chunks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'knowledge'] });
    },
  });
}

export function useReembedChunks() {
  return useMutation({
    mutationFn: async (chunkIds?: number[]) => {
      triggerReembed(chunkIds);
    },
  });
}

function triggerReembed(chunkIds?: number[]) {
  const baseUrl = import.meta.env.VITE_N8N_BASE_URL;
  if (!baseUrl) return;
  fetch(`${baseUrl}/webhook/reembed-knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunk_ids: chunkIds ?? [] }),
  }).catch(() => {
    // Fire-and-forget — re-embed failures are non-blocking
  });
}

// --- Config ---

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('agent_config')
        .update({ value, updated_by: 'admin_ui', updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'config'] });
    },
  });
}

// --- Kill Switch ---

export function useToggleKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('agent_config')
        .update({
          value: String(enabled),
          updated_by: 'admin_ui',
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'auto_reply_enabled');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maribel', 'config'] });
    },
  });
}
