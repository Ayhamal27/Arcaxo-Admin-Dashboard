'use server';

import { rpcAdminGetUserDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetUserDetailOutput } from '@/types/rpc-outputs';

export async function getUserDetailAction(userId: string): Promise<RpcAdminGetUserDetailOutput> {
  const result = await rpcAdminGetUserDetail({ p_user_id: userId });
  return Array.isArray(result) ? result[0] : result;
}
