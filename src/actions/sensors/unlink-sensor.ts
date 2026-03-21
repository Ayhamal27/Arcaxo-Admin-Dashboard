'use server';

import { rpcSensorUnlink } from '@/lib/supabase/rpc';

export interface UnlinkSensorResult {
  success: boolean;
  previousStoreId?: string | null;
  error?: string;
}

export async function unlinkSensorAction(params: {
  sensorId?: string;
  macAddress?: string;
  reason: string;
  evidencePhotoUrl?: string;
  idempotencyKey?: string;
}): Promise<UnlinkSensorResult> {
  if (!params.sensorId && !params.macAddress) {
    return { success: false, error: 'Se requiere sensorId o macAddress' };
  }

  try {
    const result = await rpcSensorUnlink({
      p_sensor_id: params.sensorId ?? null,
      p_mac_address: params.macAddress ?? null,
      p_reason: params.reason,
      p_evidence_photo_url: params.evidencePhotoUrl ?? null,
      p_idempotency_key: params.idempotencyKey ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al desvincular sensor' };
    }

    return { success: true, previousStoreId: result.previous_store_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
