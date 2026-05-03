import { supabase } from './supabase';

// Hardcoded to avoid env var timing issues in Expo Go
const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Edge functions have a 150s wall limit — we give 140s before giving up on client side
const SYNC_TIMEOUT_MS = 140_000;
const AUTH_TIMEOUT_MS = 30_000;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not logged in');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Request timed out — please try again')),
      timeoutMs,
    );
    fetch(url, options)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

// Email + password flow (legacy / fallback)
export async function connectPlatform(
  platform: string,
  email: string,
  password: string,
): Promise<{ platform_user_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(
    `${FUNCTIONS_URL}/platform-auth`,
    { method: 'POST', headers, body: JSON.stringify({ platform, email, password }) },
    AUTH_TIMEOUT_MS,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Platform auth failed (${res.status})`);
  return data;
}

// WebView flow — user_id extracted from Playtomic redirect URL
export async function connectPlatformWithUserId(
  platform: string,
  platformUserId: string,
): Promise<{ platform_user_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(
    `${FUNCTIONS_URL}/platform-auth`,
    { method: 'POST', headers, body: JSON.stringify({ platform, platformUserId }) },
    AUTH_TIMEOUT_MS,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Platform auth failed (${res.status})`);
  return data;
}

export async function syncPlatform(): Promise<{
  matches_imported: number;
  wins: number;
  losses: number;
  level: number | null;
  volpair_scores_calculated: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetchWithTimeout(
    `${FUNCTIONS_URL}/platform-sync`,
    { method: 'POST', headers, body: JSON.stringify({}) },
    SYNC_TIMEOUT_MS,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status})`);
  return data;
}
