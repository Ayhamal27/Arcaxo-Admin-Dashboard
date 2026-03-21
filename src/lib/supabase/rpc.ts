import { getServerClient } from './server';
import type {
  RpcAdminListStoresInput,
  RpcAdminGetStoreDetailInput,
  RpcAdminUpdateStoreInput,
  RpcAdminToggleStoreActiveInput,
  RpcCreateStoreInput,
  RpcAdminListUsersInput,
  RpcAdminGetUserDetailInput,
  RpcAdminDeactivateUserInput,
  RpcAdminDeleteUserInput,
  RpcUpsertUserProfileInput,
  RpcUserAccessGateInput,
  RpcGeoListRegionsInput,
  RpcGeoListSubregionsInput,
  RpcGeoListCountriesInput,
  RpcGeoListStatesInput,
  RpcGeoListCitiesInput,
  RpcAdminListSensorsInput,
  RpcAdminGetSensorDetailInput,
  RpcAdminDecommissionSensorInput,
  RpcAdminListStoreSessionsInput,
  RpcAdminListStoreSensorsInput,
  RpcStoreMaintenanceOpenInput,
  RpcStoreMaintenanceAssignInput,
  RpcStoreMaintenanceUnassignInput,
  RpcStoreMaintenanceCloseInput,
} from '@/types/rpc-inputs';
import type {
  RpcAdminListStoresOutputItem,
  RpcAdminGetStoreDetailOutput,
  RpcAdminUpdateStoreOutput,
  RpcAdminToggleStoreActiveOutput,
  RpcCreateStoreOutput,
  RpcAdminListUsersOutputItem,
  RpcAdminGetUserDetailOutput,
  RpcAdminDeactivateUserOutput,
  RpcAdminDeleteUserOutput,
  RpcUpsertUserProfileOutput,
  RpcUserAccessGateOutput,
  RpcGeoListRegionsOutputItem,
  RpcGeoListSubregionsOutputItem,
  RpcGeoListCountriesOutputItem,
  RpcGeoListStatesOutputItem,
  RpcGeoListCitiesOutputItem,
  RpcAdminListSensorsOutputItem,
  RpcAdminGetSensorDetailOutput,
  RpcAdminDecommissionSensorOutput,
  RpcAdminListStoreSessionsOutputItem,
  RpcAdminListStoreSensorsOutputItem,
  RpcStoreMaintenanceOpenOutput,
  RpcStoreMaintenanceAssignOutput,
  RpcStoreMaintenanceCloseOutput,
} from '@/types/rpc-outputs';

/**
 * Generic RPC caller — used as escape hatch for RPCs not yet typed
 *
 * For typed calls, prefer the domain-specific helpers below.
 */
export async function callRpc<T = unknown>(
  rpcName: string,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await client.rpc(rpcName as any, params as any);

  if (error) {
    console.error(`[RPC Error] ${rpcName}:`, error);
    throw new Error(error.message || `RPC ${rpcName} failed`);
  }

  return data as T;
}

// ─── STORES ──────────────────────────────────────────────────────────────────

export const rpcCreateStore = (p: RpcCreateStoreInput) =>
  callRpc<RpcCreateStoreOutput>('rpc_create_store', p as unknown as Record<string, unknown>);

export const rpcAdminListStores = (p: RpcAdminListStoresInput = {}) =>
  callRpc<RpcAdminListStoresOutputItem[]>(
    'rpc_admin_list_stores',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminGetStoreDetail = (p: RpcAdminGetStoreDetailInput) =>
  callRpc<RpcAdminGetStoreDetailOutput>(
    'rpc_admin_get_store_detail',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminUpdateStore = (p: RpcAdminUpdateStoreInput) =>
  callRpc<RpcAdminUpdateStoreOutput>(
    'rpc_admin_update_store',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminToggleStoreActive = (p: RpcAdminToggleStoreActiveInput) =>
  callRpc<RpcAdminToggleStoreActiveOutput>(
    'rpc_admin_toggle_store_active',
    p as unknown as Record<string, unknown>
  );

// ─── USERS ───────────────────────────────────────────────────────────────────

export const rpcAdminListUsers = (p: RpcAdminListUsersInput = {}) =>
  callRpc<RpcAdminListUsersOutputItem[]>(
    'rpc_admin_list_users',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminGetUserDetail = (p: RpcAdminGetUserDetailInput) =>
  callRpc<RpcAdminGetUserDetailOutput>(
    'rpc_admin_get_user_detail',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminDeactivateUser = (p: RpcAdminDeactivateUserInput) =>
  callRpc<RpcAdminDeactivateUserOutput>(
    'rpc_admin_deactivate_user',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminDeleteUser = (p: RpcAdminDeleteUserInput) =>
  callRpc<RpcAdminDeleteUserOutput>(
    'rpc_admin_delete_user',
    p as unknown as Record<string, unknown>
  );

export const rpcUpsertUserProfile = (p: RpcUpsertUserProfileInput) =>
  callRpc<RpcUpsertUserProfileOutput>(
    'rpc_upsert_user_profile',
    p as unknown as Record<string, unknown>
  );

export const rpcUserAccessGate = (p: RpcUserAccessGateInput = {}) =>
  callRpc<RpcUserAccessGateOutput>(
    'rpc_user_access_gate',
    p as unknown as Record<string, unknown>
  );

// ─── GEOGRAPHY ───────────────────────────────────────────────────────────────

export const rpcGeoListRegions = (_p: RpcGeoListRegionsInput = {}) =>
  callRpc<RpcGeoListRegionsOutputItem[]>('rpc_geo_list_regions');

export const rpcGeoListSubregions = (p: RpcGeoListSubregionsInput = {}) =>
  callRpc<RpcGeoListSubregionsOutputItem[]>(
    'rpc_geo_list_subregions',
    p as unknown as Record<string, unknown>
  );

export const rpcGeoListCountries = (p: RpcGeoListCountriesInput = {}) =>
  callRpc<RpcGeoListCountriesOutputItem[]>(
    'rpc_geo_list_countries',
    p as unknown as Record<string, unknown>
  );

export const rpcGeoListStates = (p: RpcGeoListStatesInput) =>
  callRpc<RpcGeoListStatesOutputItem[]>(
    'rpc_geo_list_states',
    p as unknown as Record<string, unknown>
  );

export const rpcGeoListCities = (p: RpcGeoListCitiesInput) =>
  callRpc<RpcGeoListCitiesOutputItem[]>(
    'rpc_geo_list_cities',
    p as unknown as Record<string, unknown>
  );

// ─── SENSORS ─────────────────────────────────────────────────────────────────

export const rpcAdminListSensors = (p: RpcAdminListSensorsInput = {}) =>
  callRpc<RpcAdminListSensorsOutputItem[]>(
    'rpc_admin_list_sensors',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminGetSensorDetail = (p: RpcAdminGetSensorDetailInput) =>
  callRpc<RpcAdminGetSensorDetailOutput>(
    'rpc_admin_get_sensor_detail',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminDecommissionSensor = (p: RpcAdminDecommissionSensorInput) =>
  callRpc<RpcAdminDecommissionSensorOutput>(
    'rpc_admin_decommission_sensor',
    p as unknown as Record<string, unknown>
  );

// ─── STORE SESSIONS & SENSORS ─────────────────────────────────────────────────

export const rpcAdminListStoreSessions = (p: RpcAdminListStoreSessionsInput) =>
  callRpc<RpcAdminListStoreSessionsOutputItem[]>(
    'rpc_admin_list_store_sessions',
    p as unknown as Record<string, unknown>
  );

export const rpcAdminListStoreSensors = (p: RpcAdminListStoreSensorsInput) =>
  callRpc<RpcAdminListStoreSensorsOutputItem[]>(
    'rpc_admin_list_store_sensors',
    p as unknown as Record<string, unknown>
  );

// ─── MAINTENANCE ─────────────────────────────────────────────────────────────

export const rpcStoreMaintenanceOpen = (p: RpcStoreMaintenanceOpenInput) =>
  callRpc<RpcStoreMaintenanceOpenOutput>(
    'rpc_store_maintenance_open',
    p as unknown as Record<string, unknown>
  );

export const rpcStoreMaintenanceAssign = (p: RpcStoreMaintenanceAssignInput) =>
  callRpc<RpcStoreMaintenanceAssignOutput>(
    'rpc_store_maintenance_assign',
    p as unknown as Record<string, unknown>
  );

export const rpcStoreMaintenanceUnassign = (p: RpcStoreMaintenanceUnassignInput) =>
  callRpc<{ result?: boolean; error?: string | null }>(
    'rpc_store_maintenance_unassign',
    p as unknown as Record<string, unknown>
  );

export const rpcStoreMaintenanceClose = (p: RpcStoreMaintenanceCloseInput) =>
  callRpc<RpcStoreMaintenanceCloseOutput>(
    'rpc_store_maintenance_close',
    p as unknown as Record<string, unknown>
  );
