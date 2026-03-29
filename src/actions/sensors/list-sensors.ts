'use server';

import { rpcAdminListSensors } from '@/lib/supabase/rpc';
import { RpcAdminListSensorsOutputItem } from '@/types/rpc-outputs';

export interface ListSensorsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  filterStatus?: string[];
  filterStoreId?: string;
  filterIsActive?: boolean;
  filterFirmwareVersion?: string;
  filterHardwareVersion?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListSensorsResult {
  sensors: RpcAdminListSensorsOutputItem[];
  total: number;
  page: number;
}

export async function listSensorsAction(params: ListSensorsParams = {}): Promise<ListSensorsResult> {
  const {
    page = 1,
    pageSize = 10,
    search,
    filterStatus,
    filterStoreId,
    filterIsActive,
    filterFirmwareVersion,
    filterHardwareVersion,
    sortBy = 'serial',
    sortOrder = 'asc',
  } = params;

  const rows = await rpcAdminListSensors({
    p_page: page,
    p_page_size: pageSize,
    p_search: search ?? null,
    p_filter_status: filterStatus ?? null,
    p_filter_store_id: filterStoreId ?? null,
    p_filter_is_active: filterIsActive ?? null,
    p_filter_firmware_version: filterFirmwareVersion ?? null,
    p_filter_hardware_version: filterHardwareVersion ?? null,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });

  const total = rows[0]?.total_count ?? 0;
  return { sensors: rows, total, page };
}
