'use server';

import { rpcAdminListStores } from '@/lib/supabase/rpc';
import { RpcAdminListStoresOutputItem } from '@/types/rpc-outputs';

export interface ListStoresParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterStatus?: string[];
  filterCountryCode?: string;
  filterActive?: boolean | null;
}

export interface ListStoresResult {
  stores: RpcAdminListStoresOutputItem[];
  total: number;
  page: number;
}

export async function listStoresAction(
  params: ListStoresParams = {}
): Promise<ListStoresResult> {
  const {
    page = 1,
    pageSize = 10,
    search,
    sortBy = 'name',
    sortOrder = 'asc',
    filterStatus,
    filterCountryCode,
    filterActive,
  } = params;

  const rows = await rpcAdminListStores({
    p_page: page,
    p_page_size: pageSize,
    p_search: search ?? null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
    p_filter_status: filterStatus ?? null,
    p_filter_country_code: filterCountryCode ?? null,
    p_filter_active: filterActive ?? null,
  });

  const total = rows[0]?.total_count ?? 0;

  return { stores: rows, total, page };
}
