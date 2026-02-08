import { Bot, User, MessageSquare } from 'lucide-react';
import type { Conversation, ConversationMessage } from '../types/maribel';

type Message = Conversation | ConversationMessage;

function getRole(m: Message): string {
  return m.role;
}

function getContent(m: Message): string {
  return m.content;
}

function getSource(m: Message): string {
  return m.source ?? 'ai';
}

function getTimestamp(m: Message): string {
  return m.created_at;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ConversationViewer({
  messages,
  summary,
}: {
  messages: Message[];
  summary?: string | null;
}) {
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-text-muted">
        <MessageSquare className="mb-2 h-8 w-8" />
        <p>No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {summary && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <p className="mb-1 font-medium text-text-secondary">Conversation Summary</p>
          <p className="text-text-primary">{summary}</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const role = getRole(msg);
        const isUser = role === 'user';
        const source = getSource(msg);

        return (
          <div
            key={i}
            className={`flex gap-2 ${isUser ? 'justify-start' : 'justify-end'}`}
          >
            {isUser && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3">
                <User className="h-3.5 w-3.5 text-text-secondary" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                isUser
                  ? 'bg-surface-2 text-text-primary'
                  : 'bg-accent/15 text-text-primary'
              }`}
            >
              <p className="whitespace-pre-wrap">{getContent(msg)}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                <span>{formatTime(getTimestamp(msg))}</span>
                {!isUser && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                      source === 'manual'
                        ? 'bg-warning/20 text-warning'
                        : 'bg-accent/20 text-accent'
                    }`}
                  >
                    {source === 'manual' ? 'Manual' : 'AI'}
                  </span>
                )}
              </div>
            </div>

            {!isUser && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
