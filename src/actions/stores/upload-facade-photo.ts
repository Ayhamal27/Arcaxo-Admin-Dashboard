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
  storeId: string,
  fileBase64: string,
  fileName: string
): Promise<UploadFacadePhotoResult> {
  try {
    // Decode base64 to buffer
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine content type from original filename
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

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
