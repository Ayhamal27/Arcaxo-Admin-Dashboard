'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { callRpc } from '@/lib/supabase/rpc';
import { checkStoreContextCompleteAction } from './check-store-context-complete';

const BUCKET = 'store-facades';

export interface UploadFacadePhotoResult {
  success: boolean;
  path?: string;
  install_enabled?: boolean;
  error?: string;
}

export async function uploadFacadePhotoAction(
  formData: FormData
): Promise<UploadFacadePhotoResult> {
  try {
    const file = formData.get('file') as File | null;
    const storeId = formData.get('storeId') as string;
    const fileName = formData.get('fileName') as string;

    if (!file || !storeId) {
      return { success: false, error: 'Missing file or storeId' };
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type from original filename
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = ext === 'heic' || ext === 'heif' ? 'image/heic' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    // Build storage path: facade-photos/{storeId}/{timestamp}.{ext}
    const storagePath = `${storeId}/${Date.now()}.${ext}`;

    const client = await createServerAuthClient();

    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploadFacadePhoto] upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Save the bucket path in the database via RPC
    const fullPath = `${BUCKET}/${storagePath}`;
    const raw = await callRpc<{
      store_id?: string;
      has_facade_photo?: boolean;
      install_enabled?: boolean;
      result?: boolean;
      error?: string | null;
    }>('rpc_store_set_facade_photo', {
      p_store_id: storeId,
      p_facade_photo_url: fullPath,
    });

    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result?.result) {
      return { success: false, error: result?.error ?? 'Error al guardar referencia' };
    }

    // Check if store context is now complete → mark is_complete + recalculate install_enabled
    const ctx = await checkStoreContextCompleteAction(storeId);

    return { success: true, path: fullPath, install_enabled: ctx.install_enabled };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al subir imagen';
    console.error('[uploadFacadePhotoAction]', error);
    return { success: false, error: msg };
  }
}
