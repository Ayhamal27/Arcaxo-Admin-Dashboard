'use server';

import { rpcAdminDecommissionSensor } from '@/lib/supabase/rpc';
import { DecommissionReason } from '@/types/database';

export interface DecommissionSensorResult {
  success: boolean;
  sensorId?: string;
  error?: string;
}

export async function decommissionSensorAction(params: {
  sensorId: string;
  reason: DecommissionReason;
  note?: string;
}): Promise<DecommissionSensorResult> {
  try {
    const result = await rpcAdminDecommissionSensor({
      p_sensor_id: params.sensorId,
      p_reason: params.reason,
      p_note: params.note ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al decomisionar sensor' };
    }

    return { success: true, sensorId: result.sensor_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
