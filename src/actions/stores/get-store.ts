'use server';

import { rpcAdminGetStoreDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetStoreDetailOutput } from '@/types/rpc-outputs';

export async function getStoreDetailAction(
  storeId: string
): Promise<RpcAdminGetStoreDetailOutput> {
  return rpcAdminGetStoreDetail({ p_store_id: storeId });
}
