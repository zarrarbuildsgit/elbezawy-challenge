const WHOP_CLIENT_ID = (import.meta as any).env?.VITE_WHOP_CLIENT_ID || '';
const WHOP_REDIRECT_URI = (import.meta as any).env?.VITE_WHOP_REDIRECT_URI || '';

// Must match ADMIN_EMAILS in supabase.ts exactly
const ADMIN_EMAILS = [
  'muhummadzarrar09@gmail.com',
  'muhummadzarrar99@gmail.com',
  'sinz.lumi@icloud.com'
];

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' }[c]!));
}

function randomString(len: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

async function sha256(str: string): Promise<string> {
  return base64url(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)))
  );
}

export async function startWhopLogin(): Promise<void> {
  const codeVerifier = randomString(32);
  const state = randomString(16);
  const nonce = randomString(16);
  const codeChallenge = await sha256(codeVerifier);

  // SameSite=Lax required — OAuth redirect is cross-site, Strict blocks it
  document.cookie = `whop_pkce_verifier=${encodeURIComponent(codeVerifier)}; path=/; max-age=600; samesite=lax; secure`;
  sessionStorage.setItem('whop_oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: WHOP_CLIENT_ID,
    redirect_uri: WHOP_REDIRECT_URI,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `https://api.whop.com/oauth/authorize?${params}`;
}

export interface WhopUser {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  access_token: string;
  refresh_token: string;
  obtained_at: number;
}

export function getWhopUser(): WhopUser | null {
  const match = document.cookie.match(/(?:^|;\s*)whop_user=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function clearWhopUser(): void {
  document.cookie = 'whop_user=; path=/; max-age=0; samesite=lax';
}

export function isTokenExpired(): boolean {
  const user = getWhopUser();
  if (!user) return true;
  const ageSeconds = (Date.now() - user.obtained_at) / 1000;
  return ageSeconds > 3300;
}

export async function refreshWhopToken(): Promise<boolean> {
  const user = getWhopUser();
  if (!user?.refresh_token) return false;

  try {
    const res = await fetch('https://api.whop.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: user.refresh_token,
        client_id: WHOP_CLIENT_ID,
      }),
    });

    if (!res.ok) {
      clearWhopUser();
      return false;
    }

    const tokens = await res.json();
    const updated: WhopUser = {
      ...user,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || user.refresh_token,
      obtained_at: Date.now(),
    };

    document.cookie = `whop_user=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax; secure`;
    return true;
  } catch {
    return false;
  }
}

// Admin bypass — calls server-side endpoint, password never touches the browser
export async function adminBypassLogin(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
