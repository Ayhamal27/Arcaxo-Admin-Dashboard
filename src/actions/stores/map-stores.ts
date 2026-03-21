'use server';

import { rpcAdminMapListStores, rpcAdminMapStoreClusters } from '@/lib/supabase/rpc';
import type {
  RpcAdminMapListStoresOutputItem,
  RpcAdminMapStoreClustersOutputItem,
} from '@/types/rpc-outputs';

// ─── Individual stores (paginated — loops until has_more = false) ────────────

export interface MapListStoresParams {
  centerLat: number;
  centerLng: number;
  radiusMeters?: number;
  statuses?: string[];
  countryCode?: string;
}

export async function mapListStoresAction(
  params: MapListStoresParams
): Promise<RpcAdminMapListStoresOutputItem[]> {
  const limit = 1000;
  let offset = 0;
  const all: RpcAdminMapListStoresOutputItem[] = [];

  while (true) {
    const page = await rpcAdminMapListStores({
      p_center_latitude: params.centerLat,
      p_center_longitude: params.centerLng,
      p_radius_meters: params.radiusMeters,
      p_statuses: params.statuses ?? null,
      p_limit: limit,
      p_offset: offset,
      p_country_code: params.countryCode ?? null,
    });

    if (!page?.length) break;
    all.push(...page);
    if (!page[0].has_more) break;
    offset += limit;
  }

  return all;
}

// ─── Server-side clusters (paginated) ────────────────────────────────────────

export interface MapStoreClustersParams {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom?: number;
  statuses?: string[];
  countryCode?: string;
}

export async function mapStoreClustersAction(
  params: MapStoreClustersParams
): Promise<RpcAdminMapStoreClustersOutputItem[]> {
  const limit = 2000;
  let offset = 0;
  const all: RpcAdminMapStoreClustersOutputItem[] = [];

  while (true) {
    const page = await rpcAdminMapStoreClusters({
      p_min_latitude: params.minLat,
      p_min_longitude: params.minLng,
      p_max_latitude: params.maxLat,
      p_max_longitude: params.maxLng,
      p_zoom: params.zoom,
      p_statuses: params.statuses ?? null,
      p_limit: limit,
      p_offset: offset,
      p_country_code: params.countryCode ?? null,
    });

    if (!page?.length) break;
    all.push(...page);
    if (!page[0].has_more) break;
    offset += limit;
  }

  return all;
}
