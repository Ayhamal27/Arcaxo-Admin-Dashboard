'use server';

import { rpcAdminGetSensorDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetSensorDetailOutput } from '@/types/rpc-outputs';

export async function getSensorDetailAction(sensorId: string): Promise<RpcAdminGetSensorDetailOutput> {
  return rpcAdminGetSensorDetail({ p_sensor_id: sensorId });
}
