/**
 * uploadPhoto — uploads a local image URI to Supabase Storage (photos bucket)
 *
 * Uses expo-file-system to read the file as base64, then decodes to ArrayBuffer
 * for upload. Required on iOS — fetch(localUri) returns an empty blob.
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const SUPABASE_URL = 'https://qmdewocktouqoibbqurh.supabase.co';

export async function uploadPhoto(
  localUri: string,
  authUid: string,
  index: number,
): Promise<string> {
  // Derive mime type from extension
  const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  const mimeType = validExt === 'png' ? 'image/png'
    : validExt === 'webp' ? 'image/webp'
    : 'image/jpeg';

  const fileName = `${authUid}/${Date.now()}_${index}.${validExt}`;

  // Read file as base64 using expo-file-system (works correctly on iOS)
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Decode base64 → Uint8Array
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from('photos')
    .upload(fileName, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

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
