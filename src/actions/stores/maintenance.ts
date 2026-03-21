'use server';

import {
  rpcStoreMaintenanceOpen,
  rpcStoreMaintenanceAssign,
  rpcStoreMaintenanceUnassign,
  rpcStoreMaintenanceClose,
} from '@/lib/supabase/rpc';
import { MaintenanceRequestCause } from '@/types/database';

export interface MaintenanceResult {
  success: boolean;
  maintenanceRequestId?: string;
  error?: string;
}

export async function openMaintenanceAction(params: {
  storeId: string;
  cause: MaintenanceRequestCause;
  reason?: string;
  assignedInstallerProfileId?: string;
  force?: boolean;
  idempotencyKey?: string;
}): Promise<MaintenanceResult> {
  try {
    const result = await rpcStoreMaintenanceOpen({
      p_store_id: params.storeId,
      p_cause: params.cause,
      p_reason: params.reason ?? null,
      p_assigned_installer_profile_id: params.assignedInstallerProfileId ?? null,
      p_force: params.force ?? false,
      p_idempotency_key: params.idempotencyKey ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al abrir mantenimiento' };
    }

    return { success: true, maintenanceRequestId: result.request_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function assignMaintenanceAction(params: {
  storeId: string;
  installerProfileId: string;
  requestId?: string;
}): Promise<MaintenanceResult> {
  try {
    const result = await rpcStoreMaintenanceAssign({
      p_store_id: params.storeId,
      p_installer_profile_id: params.installerProfileId,
      p_request_id: params.requestId ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al asignar instalador' };
    }

    return { success: true, maintenanceRequestId: result.request_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function unassignMaintenanceAction(params: {
  storeId: string;
  requestId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await rpcStoreMaintenanceUnassign({
      p_store_id: params.storeId,
      p_request_id: params.requestId ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al desasignar instalador' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}

export async function closeMaintenanceAction(params: {
  storeId: string;
  requestId?: string;
  closeReason?: string;
  forceCloseOpenSession?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await rpcStoreMaintenanceClose({
      p_store_id: params.storeId,
      p_request_id: params.requestId ?? null,
      p_close_reason: params.closeReason ?? null,
      p_force_close_open_session: params.forceCloseOpenSession ?? false,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al cerrar mantenimiento' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
