'use server';

import { rpcAdminListUsers } from '@/lib/supabase/rpc';
import { RpcAdminListUsersOutputItem } from '@/types/rpc-outputs';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filterRole?: string;
  filterStatus?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListUsersResult {
  users: RpcAdminListUsersOutputItem[];
  total: number;
  page: number;
}

export async function listUsersAction(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const {
    page = 1,
    pageSize = 10,
    search,
    filterRole,
    filterStatus,
    sortBy = 'first_name',
    sortOrder = 'asc',
  } = params;

  const rows = await rpcAdminListUsers({
    p_page: page,
    p_page_size: pageSize,
    p_search: search ?? null,
    p_filter_role: filterRole ?? null,
    p_filter_status: filterStatus ?? null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });

  const total = rows[0]?.total_count ?? 0;
  return { users: rows, total, page };
}
