import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  History,
  X,
  Check,
} from 'lucide-react';
import { useKnowledgeChunks, useKnowledgeVersions } from '../hooks/useMaribelData';
import {
  useCreateKnowledgeChunk,
  useUpdateKnowledgeChunk,
  useDeleteKnowledgeChunk,
  useReembedChunks,
} from '../hooks/useMaribelActions';
import type { KnowledgeChunk } from '../types/maribel';

export function KnowledgeEditor() {
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const { data: chunks, isLoading } = useKnowledgeChunks(sourceFilter || undefined);
  const reembed = useReembedChunks();

  const [showModal, setShowModal] = useState(false);
  const [editChunk, setEditChunk] = useState<KnowledgeChunk | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [versionChunkId, setVersionChunkId] = useState<number | null>(null);
  const [confirmReembedAll, setConfirmReembedAll] = useState(false);

  // Unique source files for filter
  const sourceFiles = [...new Set((chunks ?? []).map((c) => c.source_file))].sort();

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => reembed.mutate([...selectedIds])}
              className="flex items-center gap-2 rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent hover:bg-accent/25"
            >
              <RefreshCw className="h-4 w-4" />
              Re-embed Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setConfirmReembedAll(true)}
            className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Re-embed All
          </button>
          <button
            onClick={() => { setEditChunk(null); setShowModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Chunk
          </button>
        </div>
      </div>

      {/* Re-embed all confirmation */}
      {confirmReembedAll && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
          <p className="mb-3 text-sm text-warning">
            This will re-embed all knowledge chunks. This may take a while and use API credits.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { reembed.mutate(undefined); setConfirmReembedAll(false); }}
              className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-black"
            >
              Yes, Re-embed All
            </button>
            <button
              onClick={() => setConfirmReembedAll(false)}
              className="rounded-lg bg-surface-3 px-4 py-2 text-sm text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="">All Sources</option>
          {sourceFiles.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <span className="text-sm text-text-muted">{(chunks ?? []).length} chunks</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-text-muted">Loading...</p>
      ) : (chunks ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-12 text-text-muted">
          <BookOpen className="mb-2 h-8 w-8" />
          <p>No knowledge chunks</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-left text-text-secondary">
                <th className="px-3 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === (chunks ?? []).length && (chunks ?? []).length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set((chunks ?? []).map((c) => c.id)));
                      else setSelectedIds(new Set());
                    }}
                    className="accent-accent"
                  />
                </th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Section</th>
                <th className="px-3 py-3 font-medium">Content</th>
                <th className="px-3 py-3 font-medium">Active</th>
                <th className="px-3 py-3 font-medium">Ver</th>
                <th className="px-3 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(chunks ?? []).map((chunk) => (
                <ChunkRow
                  key={chunk.id}
                  chunk={chunk}
                  selected={selectedIds.has(chunk.id)}
                  onToggle={() => toggleSelect(chunk.id)}
                  onEdit={() => { setEditChunk(chunk); setShowModal(true); }}
                  onViewHistory={() => setVersionChunkId(chunk.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chunk modal */}
      {showModal && (
        <ChunkModal
          chunk={editChunk}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Version history panel */}
      {versionChunkId !== null && (
        <VersionHistoryPanel
          chunkId={versionChunkId}
          onClose={() => setVersionChunkId(null)}
        />
      )}
    </div>
  );
}

function ChunkRow({
  chunk,
  selected,
  onToggle,
  onEdit,
  onViewHistory,
}: {
  chunk: KnowledgeChunk;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onViewHistory: () => void;
}) {
  const deleteChunk = useDeleteKnowledgeChunk();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <tr className="border-b border-border bg-surface-0 transition-colors hover:bg-surface-1">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="accent-accent"
        />
      </td>
      <td className="px-3 py-3 text-text-secondary">{chunk.source_file}</td>
      <td className="px-3 py-3 font-medium">{chunk.section_title}</td>
      <td className="max-w-md px-3 py-3 text-text-secondary">
        <p className="line-clamp-2">{chunk.content}</p>
      </td>
      <td className="px-3 py-3">
        <span className={`text-xs font-medium ${chunk.is_active ? 'text-success' : 'text-text-muted'}`}>
          {chunk.is_active ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="px-3 py-3 text-text-muted">v{chunk.version}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onViewHistory} className="rounded p-1.5 text-text-muted hover:bg-surface-2 hover:text-text-primary">
            <History className="h-3.5 w-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { deleteChunk.mutate({ id: chunk.id, content: chunk.content }); setConfirmDelete(false); }}
                className="rounded p-1.5 text-danger hover:bg-danger/15"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded p-1.5 text-text-muted hover:bg-surface-2">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="rounded p-1.5 text-text-muted hover:bg-danger/15 hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ChunkModal({
  chunk,
  onClose,
}: {
  chunk: KnowledgeChunk | null;
  onClose: () => void;
}) {
  const isEdit = chunk !== null;
  const createChunk = useCreateKnowledgeChunk();
  const updateChunk = useUpdateKnowledgeChunk();

  const [sourceFile, setSourceFile] = useState(chunk?.source_file ?? '');
  const [sectionTitle, setSectionTitle] = useState(chunk?.section_title ?? '');
  const [content, setContent] = useState(chunk?.content ?? '');
  const [metadataStr, setMetadataStr] = useState(JSON.stringify(chunk?.metadata ?? {}, null, 2));
  const [isActive, setIsActive] = useState(chunk?.is_active ?? true);

  const handleSave = () => {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      // Keep empty
    }

    if (isEdit) {
      updateChunk.mutate(
        {
          id: chunk!.id,
          updates: { source_file: sourceFile, section_title: sectionTitle, content, metadata, is_active: isActive },
          oldContent: chunk!.content,
        },
        { onSuccess: onClose },
      );
    } else {
      createChunk.mutate(
        { source_file: sourceFile, section_title: sectionTitle, content, metadata, is_active: isActive },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Chunk' : 'New Chunk'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Source File</label>
              <input
                value={sourceFile}
                onChange={(e) => setSourceFile(e.target.value)}
                placeholder="programs.md"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Section Title</label>
              <input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="Learning Pods - Overview"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-text-muted">Metadata (JSON)</label>
            <textarea
              value={metadataStr}
              onChange={(e) => setMetadataStr(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-text-secondary">Active</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-surface-3 px-4 py-2 text-sm text-text-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!sourceFile || !sectionTitle || !content}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {isEdit ? 'Save Changes' : 'Create Chunk'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionHistoryPanel({ chunkId, onClose }: { chunkId: number; onClose: () => void }) {
  const { data: versions, isLoading } = useKnowledgeVersions(chunkId);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-border bg-surface-1 p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Version History</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (versions ?? []).length === 0 ? (
        <p className="text-sm text-text-muted">No history</p>
      ) : (
        <div className="space-y-3 overflow-y-auto">
          {(versions ?? []).map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  v.action === 'create' ? 'bg-success/20 text-success' :
                  v.action === 'delete' ? 'bg-danger/20 text-danger' :
                  v.action === 'reembed' ? 'bg-info/20 text-info' :
                  'bg-warning/20 text-warning'
                }`}>
                  {v.action}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-text-muted">by {v.changed_by}</p>
              {v.diff_summary && <p className="mt-1 text-xs text-text-secondary">{v.diff_summary}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
