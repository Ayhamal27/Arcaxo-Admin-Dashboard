'use server';

import { rpcAdminListStoreSessions } from '@/lib/supabase/rpc';
import { RpcAdminListStoreSessionsOutputItem } from '@/types/rpc-outputs';

export interface ListStoreSessionsResult {
  sessions: RpcAdminListStoreSessionsOutputItem[];
  total: number;
  page: number;
}

export async function listStoreSessionsAction(params: {
  storeId: string;
  page?: number;
  pageSize?: number;
  sessionType?: string;
}): Promise<ListStoreSessionsResult> {
  const { storeId, page = 1, pageSize = 20, sessionType } = params;

  const rows = await rpcAdminListStoreSessions({
    p_store_id: storeId,
    p_page: page,
    p_page_size: pageSize,
    p_session_type: sessionType ?? null,
  });

  const total = rows[0]?.total_count ?? 0;
  return { sessions: rows, total, page };
}
