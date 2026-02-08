import { useState } from 'react';
import { Lock } from 'lucide-react';
import { verifyPassword, setAuthenticated } from '../lib/auth';

export function AuthGate({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const valid = await verifyPassword(password);
    if (valid) {
      setAuthenticated();
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-border bg-surface-1 p-8"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Maribel Admin</h1>
          <p className="text-sm text-text-secondary">Enter password to continue</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-text-primary placeholder-text-muted outline-none focus:border-accent"
        />

        {error && (
          <p className="mb-4 text-sm text-danger">Invalid password.</p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
