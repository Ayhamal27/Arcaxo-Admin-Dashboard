'use server';

import { rpcAdminMapListStores, rpcAdminMapStoreClusters } from '@/lib/supabase/rpc';
import type {
  RpcAdminMapListStoresOutputItem,
  RpcAdminMapStoreClustersOutputItem,
} from '@/types/rpc-outputs';

export interface MapListStoresParams {
  centerLat: number;
  centerLng: number;
  radiusMeters?: number;
  statuses?: string[];
  limit?: number;
  offset?: number;
  countryCode?: string;
}

export async function mapListStoresAction(
  params: MapListStoresParams
): Promise<RpcAdminMapListStoresOutputItem[]> {
  return rpcAdminMapListStores({
    p_center_latitude: params.centerLat,
    p_center_longitude: params.centerLng,
    p_radius_meters: params.radiusMeters,
    p_statuses: params.statuses ?? null,
    p_limit: params.limit,
    p_offset: params.offset,
    p_country_code: params.countryCode ?? null,
  });
}

export interface MapStoreClustersParams {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  zoom?: number;
  statuses?: string[];
  limit?: number;
  offset?: number;
  countryCode?: string;
}

export async function mapStoreClustersAction(
  params: MapStoreClustersParams
): Promise<RpcAdminMapStoreClustersOutputItem[]> {
  return rpcAdminMapStoreClusters({
    p_min_latitude: params.minLat,
    p_min_longitude: params.minLng,
    p_max_latitude: params.maxLat,
    p_max_longitude: params.maxLng,
    p_zoom: params.zoom,
    p_statuses: params.statuses ?? null,
    p_limit: params.limit,
    p_offset: params.offset,
    p_country_code: params.countryCode ?? null,
  });
}
