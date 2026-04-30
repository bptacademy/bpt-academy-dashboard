import { supabase } from './supabase';

// Hardcoded to avoid env var timing issues in Expo Go
const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not logged in');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export async function connectPlatform(
  platform: string,
  email: string,
  password: string,
): Promise<{ platform_user_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/platform-auth`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ platform, email, password }),
  });

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
  const res = await fetch(`${FUNCTIONS_URL}/platform-sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Sync failed (${res.status})`);
  return data;
}
