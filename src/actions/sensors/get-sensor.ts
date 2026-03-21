'use server';

import { rpcAdminGetSensorDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetSensorDetailOutput } from '@/types/rpc-outputs';

export async function getSensorDetailAction(sensorId: string): Promise<RpcAdminGetSensorDetailOutput> {
  const result = await rpcAdminGetSensorDetail({ p_sensor_id: sensorId });
  return Array.isArray(result) ? result[0] : result;
}
