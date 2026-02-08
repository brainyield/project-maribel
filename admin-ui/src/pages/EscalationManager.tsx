import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { useAllEscalations, useConversations } from '../hooks/useMaribelData';
import { useResolveEscalation } from '../hooks/useMaribelActions';
import { ConversationViewer } from '../components/ConversationViewer';
import type { Escalation } from '../types/maribel';

const SCORE_STYLES: Record<string, string> = {
  new: 'bg-gray-500/20 text-gray-400',
  cold: 'bg-info/20 text-info',
  warm: 'bg-warning/20 text-warning',
  hot: 'bg-danger/20 text-danger',
  existing_client: 'bg-success/20 text-success',
  enrolled: 'bg-purple-500/20 text-purple-400',
};

type FilterTab = 'open' | 'resolved' | 'all';

export function EscalationManager() {
  const [filter, setFilter] = useState<FilterTab>('open');
  const { data: escalations, isLoading } = useAllEscalations(filter);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Escalations</h1>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                filter === key
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-text-muted">Loading...</p>
      ) : (escalations ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-12 text-text-muted">
          <AlertTriangle className="mb-2 h-8 w-8" />
          <p>No {filter === 'all' ? '' : filter} escalations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(escalations ?? []).map((esc) => (
            <EscalationCard key={esc.id} escalation={esc} />
          ))}
        </div>
      )}
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const resolve = useResolveEscalation();
  const { data: messages } = useConversations(
    expanded ? escalation.ig_sender_id : '',
  );

  return (
    <div className="rounded-xl border border-border bg-surface-1">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${escalation.resolved ? 'bg-success' : 'bg-warning'}`} />
          <div>
            <p className="font-medium">
              {escalation.ig_username ?? escalation.ig_sender_id}
            </p>
            <p className="text-sm text-text-secondary">{escalation.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {escalation.resolved && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              Resolved
            </span>
          )}
          <span className="text-xs text-text-muted">
            {new Date(escalation.created_at).toLocaleDateString()}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-5 py-4">
          {escalation.conversation_summary && (
            <div className="mb-4 rounded-lg bg-surface-2 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-text-muted">Summary</p>
              <p className="text-text-secondary">{escalation.conversation_summary}</p>
            </div>
          )}

          {/* Conversation */}
          <div className="mb-4 max-h-96 overflow-y-auto rounded-lg border border-border bg-surface-0 p-4">
            <ConversationViewer messages={messages ?? []} />
          </div>

          {/* Resolve form */}
          {!escalation.resolved && (
            <div className="flex gap-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Resolution notes (optional)"
                className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent"
              />
              <button
                onClick={() => resolve.mutate({ escalationId: escalation.id, notes })}
                disabled={resolve.isPending}
                className="rounded-lg bg-success/15 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-50"
              >
                Resolve
              </button>
            </div>
          )}

          {escalation.resolved && escalation.resolved_notes && (
            <div className="rounded-lg bg-success/10 p-3 text-sm">
              <p className="text-xs font-medium text-success">Resolution Notes</p>
              <p className="text-text-secondary">{escalation.resolved_notes}</p>
              <p className="mt-1 text-xs text-text-muted">
                by {escalation.resolved_by} on {new Date(escalation.resolved_at!).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
