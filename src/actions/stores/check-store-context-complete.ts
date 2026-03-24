'use server';

import { rpcAdminGetStoreDetail, rpcStoreInstallationContextUpdate } from '@/lib/supabase/rpc';

/**
 * Checks whether a store has all required context fields populated.
 * If all conditions are met, marks `is_complete = true` via RPC,
 * which triggers the DB to set `context_complete` and recalculate `install_enabled`.
 *
 * Required conditions for completeness:
 *  - WiFi configured (wifi_ssid present)
 *  - Facade photo uploaded (has_facade_photo = true)
 *  - authorized_devices_count > 0
 *  - Responsible contact assigned
 *  - preload_payload is not empty
 */
export async function checkStoreContextCompleteAction(
  storeId: string
): Promise<{ complete: boolean; install_enabled: boolean }> {
  try {
    const raw = await rpcAdminGetStoreDetail({ p_store_id: storeId });
    const store = Array.isArray(raw) ? raw[0] : raw;

    if (!store) {
      return { complete: false, install_enabled: false };
    }

    // Already marked complete — nothing to do
    if (store.is_complete) {
      return { complete: true, install_enabled: store.install_enabled };
    }

    const hasWifi = !!store.wifi_ssid;
    const hasFacade = !!store.has_facade_photo;
    const hasDevices = (store.authorized_devices_count ?? 0) > 0;
    const hasResponsible = !!(store.responsible as Record<string, string> | null)?.first_name;
    const hasPreload =
      !!store.preload_payload && Object.keys(store.preload_payload).length > 0;

    const allComplete = hasWifi && hasFacade && hasDevices && hasResponsible;

    if (!allComplete) {
      return { complete: false, install_enabled: store.install_enabled };
    }

    // Mark store context as complete — inject preload_payload if missing
    const updateRaw = await rpcStoreInstallationContextUpdate({
      p_store_id: storeId,
      p_context_is_complete: true,
      ...(hasPreload ? {} : { p_preload_payload: { setup: true } }),
    });

    const result = Array.isArray(updateRaw) ? updateRaw[0] : updateRaw;

    return {
      complete: true,
      install_enabled: result?.install_enabled ?? false,
    };
  } catch (error) {
    console.error('[checkStoreContextComplete]', error);
    return { complete: false, install_enabled: false };
  }
}
