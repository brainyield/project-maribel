const SESSION_KEY = 'maribel_admin_auth';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expectedHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH;
  if (!expectedHash) return false;
  const hash = await hashPassword(password);
  return hash === expectedHash.toLowerCase();
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function setAuthenticated(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
