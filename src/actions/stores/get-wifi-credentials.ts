'use server';

import { rpcStoreWifiCredentialsGet } from '@/lib/supabase/rpc';

export interface WifiCredentialsResult {
  success: boolean;
  ssid?: string;
  password?: string;
  error?: string;
}

export async function getWifiCredentialsAction(
  storeId: string
): Promise<WifiCredentialsResult> {
  try {
    const raw = await rpcStoreWifiCredentialsGet({ p_store_id: storeId });
    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result?.wifi_ssid) {
      return { success: true, ssid: undefined, password: undefined };
    }

    return {
      success: true,
      ssid: result.wifi_ssid,
      password: result.wifi_password_plain,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al obtener credenciales';
    console.error('[getWifiCredentialsAction]', error);
    return { success: false, error: msg };
  }
}
