'use server';

import { rpcAdminUpdateStore } from '@/lib/supabase/rpc';

export interface UpdateStoreDevicesResult {
  success: boolean;
  error?: string;
}

export async function updateStoreDevicesAction(
  storeId: string,
  authorizedDevicesCount: number
): Promise<UpdateStoreDevicesResult> {
  try {
    if (authorizedDevicesCount < 0) {
      return { success: false, error: 'La cantidad no puede ser negativa' };
    }

    const raw = await rpcAdminUpdateStore({
      p_store_id: storeId,
      p_authorized_devices_count: authorizedDevicesCount,
    });

    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result?.result) {
      return { success: false, error: result?.error ?? 'Error al actualizar dispositivos' };
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar dispositivos';
    console.error('[updateStoreDevicesAction]', error);
    return { success: false, error: msg };
  }
}
