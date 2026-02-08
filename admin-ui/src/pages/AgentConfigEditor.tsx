import { useState } from 'react';
import { Save, AlertTriangle } from 'lucide-react';
import { useAgentConfig } from '../hooks/useMaribelData';
import { useUpdateConfig } from '../hooks/useMaribelActions';
import type { AgentConfig } from '../types/maribel';

const CONFIG_GROUPS: Record<string, string[]> = {
  'API & Integration': [
    'graph_api_version',
    'calendly_event_type_uri',
    'calendly_user_uri',
    'instagram_page_sender_id',
  ],
  'Feature Flags': [
    'auto_reply_enabled',
    'rag_enabled',
    'memory_enabled',
    'proactive_booking_enabled',
  ],
  'Response Config': [
    'message_split_delay_ms',
    'max_retry_attempts',
    'conversation_history_limit',
  ],
  'RAG Config': [
    'rag_match_threshold',
    'rag_match_count',
  ],
  'Memory Config': [
    'memory_session_gap_hours',
  ],
  'Escalation Config': [
    'metadata_failure_escalation_threshold',
  ],
};

const CRITICAL_KEYS = new Set(['auto_reply_enabled', 'system_prompt']);

function isToggle(key: string): boolean {
  return ['auto_reply_enabled', 'rag_enabled', 'memory_enabled', 'proactive_booking_enabled'].includes(key);
}

export function AgentConfigEditor() {
  const { data: configs, isLoading } = useAgentConfig();

  if (isLoading) return <p className="py-8 text-center text-text-muted">Loading...</p>;

  const configMap = new Map((configs ?? []).map((c) => [c.key, c]));

  // System prompt gets its own section
  const systemPrompt = configMap.get('system_prompt');

  // Group remaining configs
  const grouped: [string, AgentConfig[]][] = Object.entries(CONFIG_GROUPS).map(([group, keys]) => [
    group,
    keys.map((k) => configMap.get(k)).filter(Boolean) as AgentConfig[],
  ]);

  // Ungrouped keys
  const allGroupedKeys = new Set(Object.values(CONFIG_GROUPS).flat());
  allGroupedKeys.add('system_prompt');
  const ungrouped = (configs ?? []).filter((c) => !allGroupedKeys.has(c.key));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agent Config</h1>

      {/* Grouped settings */}
      {grouped.map(([group, items]) => (
        items.length > 0 && (
          <div key={group} className="rounded-xl border border-border bg-surface-1 p-4">
            <h3 className="mb-4 text-sm font-medium text-text-secondary">{group}</h3>
            <div className="space-y-3">
              {items.map((cfg) => (
                <ConfigRow key={cfg.key} config={cfg} />
              ))}
            </div>
          </div>
        )
      ))}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Other</h3>
          <div className="space-y-3">
            {ungrouped.map((cfg) => (
              <ConfigRow key={cfg.key} config={cfg} />
            ))}
          </div>
        </div>
      )}

      {/* System Prompt */}
      {systemPrompt && <SystemPromptEditor config={systemPrompt} />}
    </div>
  );
}

function ConfigRow({ config }: { config: AgentConfig }) {
  const update = useUpdateConfig();
  const [value, setValue] = useState(config.value);
  const [confirmSave, setConfirmSave] = useState(false);
  const isCritical = CRITICAL_KEYS.has(config.key);
  const changed = value !== config.value;

  const handleSave = () => {
    if (isCritical && !confirmSave) {
      setConfirmSave(true);
      return;
    }
    update.mutate({ key: config.key, value }, {
      onSuccess: () => setConfirmSave(false),
    });
  };

  return (
    <div className="flex items-start gap-4 rounded-lg bg-surface-2 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="text-sm font-medium text-text-primary">{config.key}</code>
          {isCritical && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
        </div>
        {config.description && (
          <p className="mt-0.5 text-xs text-text-muted">{config.description}</p>
        )}
        <p className="mt-0.5 text-xs text-text-muted">
          Updated: {new Date(config.updated_at).toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isToggle(config.key) ? (
          <button
            onClick={() => {
              const newVal = value === 'true' ? 'false' : 'true';
              setValue(newVal);
              if (isCritical) {
                setConfirmSave(true);
              } else {
                update.mutate({ key: config.key, value: newVal });
              }
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              value === 'true' ? 'bg-success' : 'bg-surface-3'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                value === 'true' ? 'left-5.5' : 'left-0.5'
              }`}
            />
          </button>
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-48 rounded-lg border border-border bg-surface-0 px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          />
        )}

        {changed && !isToggle(config.key) && (
          <button
            onClick={handleSave}
            disabled={update.isPending}
            className="rounded-lg bg-accent p-1.5 text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Confirm dialog for critical settings */}
      {confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-6">
            <div className="mb-3 flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Confirm Change</h3>
            </div>
            <p className="mb-4 text-sm text-text-secondary">
              You're changing <code className="text-text-primary">{config.key}</code> to <code className="text-text-primary">{value}</code>. This is a critical setting.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setConfirmSave(false); setValue(config.value); }}
                className="rounded-lg bg-surface-3 px-4 py-2 text-sm text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  update.mutate({ key: config.key, value }, { onSuccess: () => setConfirmSave(false) });
                }}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-black"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemPromptEditor({ config }: { config: AgentConfig }) {
  const update = useUpdateConfig();
  const [value, setValue] = useState(config.value);
  const [confirmSave, setConfirmSave] = useState(false);
  const changed = value !== config.value;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">System Prompt</h3>
        {changed && (
          <button
            onClick={() => setConfirmSave(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        )}
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={20}
        className="w-full rounded-lg border border-border bg-surface-0 p-4 font-mono text-sm leading-relaxed text-text-primary outline-none focus:border-accent"
      />

      <p className="mt-2 text-xs text-text-muted">
        {value.length} characters | Updated: {new Date(config.updated_at).toLocaleString()}
      </p>

      {confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-6">
            <div className="mb-3 flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">Update System Prompt?</h3>
            </div>
            <p className="mb-4 text-sm text-text-secondary">
              This will immediately change how Maribel responds to all future messages.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmSave(false)}
                className="rounded-lg bg-surface-3 px-4 py-2 text-sm text-text-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  update.mutate({ key: config.key, value }, { onSuccess: () => setConfirmSave(false) });
                }}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-medium text-black"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
