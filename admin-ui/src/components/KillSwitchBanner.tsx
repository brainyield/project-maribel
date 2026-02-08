import { AlertTriangle } from 'lucide-react';
import { useConfigValue } from '../hooks/useMaribelData';

export function KillSwitchBanner() {
  const { data: autoReply } = useConfigValue('auto_reply_enabled');
  const isDisabled = autoReply?.value === 'false';

  if (!isDisabled) return null;

  return (
    <div className="flex items-center gap-2 bg-danger/15 px-4 py-2 text-sm text-danger">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Auto-reply is currently <strong>DISABLED</strong>. Incoming DMs will not receive automated responses.</span>
    </div>
  );
}
