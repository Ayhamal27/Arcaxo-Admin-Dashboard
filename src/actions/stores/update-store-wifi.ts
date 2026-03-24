'use server';

import { rpcStoreInstallationContextUpdate } from '@/lib/supabase/rpc';
import { checkStoreContextCompleteAction } from './check-store-context-complete';

export interface UpdateStoreWifiResult {
  success: boolean;
  install_enabled?: boolean;
  error?: string;
}

export async function updateStoreWifiAction(
  storeId: string,
  wifiSsid: string,
  wifiPassword: string
): Promise<UpdateStoreWifiResult> {
  try {
    if (!wifiSsid.trim() || !wifiPassword.trim()) {
      return { success: false, error: 'SSID y contraseña son requeridos' };
    }

    const raw = await rpcStoreInstallationContextUpdate({
      p_store_id: storeId,
      p_wifi_ssid: wifiSsid.trim(),
      p_wifi_password: wifiPassword.trim(),
    });

    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result?.result) {
      return { success: false, error: result?.error ?? 'Error al actualizar WiFi' };
    }

    // Check if store context is now complete → mark is_complete + recalculate install_enabled
    const ctx = await checkStoreContextCompleteAction(storeId);

    return { success: true, install_enabled: ctx.install_enabled };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar WiFi';
    console.error('[updateStoreWifiAction]', error);
    return { success: false, error: msg };
  }
}
