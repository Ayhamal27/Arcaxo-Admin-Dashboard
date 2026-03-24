'use server';

import { rpcAdminGetStoreDetail, rpcAdminToggleStoreActive } from '@/lib/supabase/rpc';
import { StoreToggleAction } from '@/types/database';

export interface ToggleStoreActiveInput {
  storeId: string;
  active: boolean;
  requiredDevicesCount?: number;
}

export interface ToggleStoreActiveResult {
  success: boolean;
  actionTaken?: StoreToggleAction;
  maintenanceRequestId?: string | null;
  sensorsPending?: number;
  error?: string;
}

export async function toggleStoreActiveAction(
  input: ToggleStoreActiveInput
): Promise<ToggleStoreActiveResult> {
  try {
    const storeDetailResult = await rpcAdminGetStoreDetail({
      p_store_id: input.storeId,
    });
    const store = Array.isArray(storeDetailResult) ? storeDetailResult[0] : storeDetailResult;

    if (store?.open_session_id) {
      const sessionType =
        store.open_session_type === 'install'
          ? 'instalación'
          : store.open_session_type === 'maintenance'
          ? 'mantenimiento'
          : 'activa';

      return {
        success: false,
        error: `No se puede cambiar el estado de la tienda mientras exista una sesión de ${sessionType} abierta. Cierra o cancela la sesión primero.`,
      };
    }

    const result = await rpcAdminToggleStoreActive({
      p_store_id: input.storeId,
      p_active: input.active,
      p_required_devices_count: input.requiredDevicesCount,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al cambiar estado de la tienda' };
    }

    return {
      success: true,
      actionTaken: result.action_taken,
      maintenanceRequestId: result.maintenance_request_id,
      sensorsPending: result.sensors_pending,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error inesperado';
    return { success: false, error: msg };
  }
}
