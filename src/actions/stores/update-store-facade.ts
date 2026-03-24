'use server';

import { callRpc } from '@/lib/supabase/rpc';

export interface UpdateStoreFacadeResult {
  success: boolean;
  error?: string;
}

export async function updateStoreFacadeAction(
  storeId: string,
  facadePhotoUrl: string
): Promise<UpdateStoreFacadeResult> {
  try {
    if (!facadePhotoUrl.trim()) {
      return { success: false, error: 'La URL de la imagen es requerida' };
    }

    const raw = await callRpc<{
      store_id?: string;
      has_facade_photo?: boolean;
      install_enabled?: boolean;
      result?: boolean;
      error?: string | null;
    }>('rpc_store_set_facade_photo', {
      p_store_id: storeId,
      p_facade_photo_url: facadePhotoUrl.trim(),
    });

    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result?.result) {
      return { success: false, error: result?.error ?? 'Error al actualizar foto' };
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar foto';
    console.error('[updateStoreFacadeAction]', error);
    return { success: false, error: msg };
  }
}
