'use server';

import { createServerAuthClient } from '@/lib/supabase/server';

const SIGNED_URL_TTL = 12 * 60 * 60; // 12 hours in seconds

// In-memory cache: path → { url, expiresAt }
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getFacadeSignedUrlAction(
  facadePhotoUrl: string | null
): Promise<string | null> {
  if (!facadePhotoUrl) return null;

  // If it's already a full URL (legacy external URL), return as-is
  if (facadePhotoUrl.startsWith('http://') || facadePhotoUrl.startsWith('https://')) {
    return facadePhotoUrl;
  }

  // Check cache
  const cached = urlCache.get(facadePhotoUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    // Parse bucket and path: "store-facades/storeId/timestamp.ext"
    const [bucket, ...pathParts] = facadePhotoUrl.split('/');
    const filePath = pathParts.join('/');

    if (!bucket || !filePath) return null;

    const client = await createServerAuthClient();

    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(filePath, SIGNED_URL_TTL);

    if (error || !data?.signedUrl) {
      console.error('[getFacadeSignedUrl]', error);
      return null;
    }

    // Cache with 11h TTL (1h safety margin before actual expiry)
    urlCache.set(facadePhotoUrl, {
      url: data.signedUrl,
      expiresAt: Date.now() + 11 * 60 * 60 * 1000,
    });

    return data.signedUrl;
  } catch (error) {
    console.error('[getFacadeSignedUrl]', error);
    return null;
  }
}
