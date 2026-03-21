'use server';

import { rpcAdminListStoreSensors } from '@/lib/supabase/rpc';
import { RpcAdminListStoreSensorsOutputItem } from '@/types/rpc-outputs';

export interface ListStoreDevicesResult {
  devices: RpcAdminListStoreSensorsOutputItem[];
  total: number;
  page: number;
}

export async function listStoreDevicesAction(params: {
  storeId: string;
  page?: number;
  pageSize?: number;
  includeHistorical?: boolean;
}): Promise<ListStoreDevicesResult> {
  const { storeId, page = 1, pageSize = 20, includeHistorical = false } = params;

  const rows = await rpcAdminListStoreSensors({
    p_store_id: storeId,
    p_page: page,
    p_page_size: pageSize,
    p_include_historical: includeHistorical,
  });

  const total = rows[0]?.total_count ?? 0;
  return { devices: rows, total, page };
}
