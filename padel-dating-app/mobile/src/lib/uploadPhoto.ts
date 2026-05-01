/**
 * uploadPhoto — uploads a local image URI to Supabase Storage (photos bucket)
 *
 * Uses FormData + direct fetch to Supabase Storage REST API.
 * This is the proven approach that works on iOS (same as BPT Academy).
 */

import { supabase } from './supabase';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KwkQawb1Kv2jOk1Wud0xUg_mPQxPqmL';

export async function uploadPhoto(
  localUri: string,
  authUid: string,
  index: number,
): Promise<string> {
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const mimeType = validExt === 'png' ? 'image/png'
    : validExt === 'webp' ? 'image/webp'
    : 'image/jpeg';

  const fileName = `${authUid}/${Date.now()}_${index}.${validExt}`;

  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not logged in');

  // Build FormData — works reliably on iOS
  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: mimeType,
  } as any);

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/photos/${fileName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'x-upsert': 'true',
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
}

/**
 * uploadPhotos — uploads multiple photos, skipping any already remote URLs.
 */
export async function uploadPhotos(
  uris: string[],
  authUid: string,
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (uri.startsWith('http')) {
      results.push(uri);
    } else {
      const url = await uploadPhoto(uri, authUid, i);
      results.push(url);
    }
  }
  return results;
}
