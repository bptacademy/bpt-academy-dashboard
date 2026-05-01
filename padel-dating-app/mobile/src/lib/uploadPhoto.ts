/**
 * uploadPhoto — uploads a local image URI to Supabase Storage (photos bucket)
 * Returns the public URL of the uploaded file.
 *
 * Path structure: {auth_uid}/{timestamp}_{index}.jpg
 * This lets RLS policies restrict upload/delete to the owner.
 */

import { supabase } from './supabase';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';

export async function uploadPhoto(
  localUri: string,
  authUid: string,
  index: number,
): Promise<string> {
  // Fetch the local file as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  // Derive extension from URI or default to jpg
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const mimeType = validExt === 'png' ? 'image/png' : validExt === 'webp' ? 'image/webp' : 'image/jpeg';

  const fileName = `${authUid}/${Date.now()}_${index}.${validExt}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Return the public URL
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
}

/**
 * uploadPhotos — uploads multiple photos, skipping any that are already remote URLs.
 * Returns array of public URLs in the same order.
 */
export async function uploadPhotos(
  uris: string[],
  authUid: string,
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    // Already a remote URL — keep as-is
    if (uri.startsWith('http')) {
      results.push(uri);
    } else {
      const url = await uploadPhoto(uri, authUid, i);
      results.push(url);
    }
  }
  return results;
}
