'use server';

import { rpcAdminGetUserDetail } from '@/lib/supabase/rpc';
import { RpcAdminGetUserDetailOutput } from '@/types/rpc-outputs';

export async function getUserDetailAction(userId: string): Promise<RpcAdminGetUserDetailOutput> {
  return rpcAdminGetUserDetail({ p_user_id: userId });
}
