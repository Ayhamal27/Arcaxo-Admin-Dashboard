'use server';

import { rpcAdminGetStoreDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetStoreDetailOutput } from '@/types/rpc-outputs';

export async function getStoreDetailAction(
  storeId: string
): Promise<RpcAdminGetStoreDetailOutput> {
  const result = await rpcAdminGetStoreDetail({ p_store_id: storeId });
  return Array.isArray(result) ? result[0] : result;
}
