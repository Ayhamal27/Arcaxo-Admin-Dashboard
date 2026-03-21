# Arcaxo Admin Dashboard — RPC Reference

All data access MUST go through RPCs. Never use direct table access.

## Stores RPCs

| RPC | Input Type | Output Type | Permission |
|-----|-----------|-------------|------------|
| `rpc_create_store` | `RpcCreateStoreInput` | `RpcCreateStoreOutput` | owner, admin |
| `rpc_admin_list_stores` | `RpcAdminListStoresInput` | `RpcAdminListStoresOutputItem[]` | owner, admin |
| `rpc_admin_get_store_detail` | `RpcAdminGetStoreDetailInput` | `RpcAdminGetStoreDetailOutput` | owner, admin |
| `rpc_admin_update_store` | `RpcAdminUpdateStoreInput` | `RpcAdminUpdateStoreOutput` | owner, admin |
| `rpc_admin_toggle_store_active` | `RpcAdminToggleStoreActiveInput` | `RpcAdminToggleStoreActiveOutput` | owner, admin |
| `rpc_store_installation_context_get` | `{ p_store_id }` | `RpcStoreInstallationContextGetOutput` | owner, admin, installer |
| `rpc_store_installation_context_update` | `RpcStoreInstallationContextUpdateInput` | `RpcStoreInstallationContextUpdateOutput` | owner, admin, installer |
| `rpc_store_pre_install` | `{ p_store_id }` | `RpcStorePreInstallOutput` | installer |
| `rpc_store_wifi_credentials_get` | `{ p_store_id }` | `RpcStoreWifiCredentialsGetOutput` | owner, admin, installer |
| `rpc_store_set_facade_photo` | `{ p_store_id, p_facade_photo_url }` | `RpcStoreSetFacadePhotoOutput` | installer |
| `rpc_store_installation_session_open` | `{ p_store_id }` | `RpcStoreSessionOutput` | installer |
| `rpc_store_installation_session_close` | `RpcStoreInstallationSessionCloseInput` | `RpcStoreSessionOutput` | installer |
| `rpc_get_nearby_installer_stores` | `RpcGetNearbyInstallerStoresInput` | `RpcGetNearbyInstallerStoresOutputItem[]` | owner, admin, installer |

## Users RPCs

| RPC | Input Type | Output Type | Permission |
|-----|-----------|-------------|------------|
| `rpc_upsert_user_profile` | `RpcUpsertUserProfileInput` | `RpcUpsertUserProfileOutput` | owner, admin |
| `rpc_user_access_gate` | `RpcUserAccessGateInput` | `RpcUserAccessGateOutput` | authenticated |
| `rpc_user_active_session` | `{ p_target_user_id? }` | `RpcUserActiveSessionOutput` | authenticated |
| `rpc_admin_list_users` | `RpcAdminListUsersInput` | `RpcAdminListUsersOutputItem[]` | owner, admin |
| `rpc_admin_get_user_detail` | `RpcAdminGetUserDetailInput` | `RpcAdminGetUserDetailOutput` | owner, admin |
| `rpc_admin_deactivate_user` | `RpcAdminDeactivateUserInput` | `RpcAdminDeactivateUserOutput` | owner, admin |
| `rpc_admin_delete_user` | `RpcAdminDeleteUserInput` | `RpcAdminDeleteUserOutput` | owner only |

## Geography RPCs (read-only)

| RPC | Input Type | Output Type |
|-----|-----------|-------------|
| `rpc_geo_list_regions` | — | `RpcGeoListRegionsOutputItem[]` |
| `rpc_geo_list_subregions` | `{ p_region_id? }` | `RpcGeoListSubregionsOutputItem[]` |
| `rpc_geo_list_countries` | `{ p_region_id?, p_subregion_id? }` | `RpcGeoListCountriesOutputItem[]` |
| `rpc_geo_list_states` | `{ p_country_id }` | `RpcGeoListStatesOutputItem[]` |
| `rpc_geo_list_cities` | `{ p_country_id, p_state_id }` | `RpcGeoListCitiesOutputItem[]` |

**Key rule:** Only `city_id` is needed for location input. `country_code`, `state_id`, etc. are derived automatically via triggers.

## Sensors RPCs

| RPC | Input Type | Output Type | Permission |
|-----|-----------|-------------|------------|
| `rpc_sensor_upsert_stage` | `RpcSensorUpsertStageInput` | `RpcSensorUpsertStageOutput` | installer |
| `rpc_sensor_unlink` | `RpcSensorUnlinkInput` | `RpcSensorUnlinkOutput` | owner, admin, installer |
| `rpc_admin_list_sensors` | `RpcAdminListSensorsInput` | `RpcAdminListSensorsOutputItem[]` | owner, admin |
| `rpc_admin_get_sensor_detail` | `RpcAdminGetSensorDetailInput` | `RpcAdminGetSensorDetailOutput` | owner, admin |
| `rpc_admin_decommission_sensor` | `RpcAdminDecommissionSensorInput` | `RpcAdminDecommissionSensorOutput` | owner, admin |

## Maintenance RPCs

| RPC | Input Type | Output Type | Permission |
|-----|-----------|-------------|------------|
| `rpc_store_maintenance_open` | `RpcStoreMaintenanceOpenInput` | `RpcStoreMaintenanceOpenOutput` | owner, admin |
| `rpc_store_maintenance_assign` | `RpcStoreMaintenanceAssignInput` | `RpcStoreMaintenanceAssignOutput` | owner, admin |
| `rpc_store_maintenance_unassign` | `RpcStoreMaintenanceUnassignInput` | — | owner, admin |
| `rpc_store_maintenance_close` | `RpcStoreMaintenanceCloseInput` | `RpcStoreMaintenanceCloseOutput` | owner, admin |
| `rpc_store_maintenance_session_open` | `{ p_store_id, p_request_id? }` | `RpcStoreSessionOutput` | installer |
| `rpc_store_maintenance_session_close` | `{ p_store_id, p_session_id? }` | `RpcStoreSessionOutput` | installer |

## Usage Pattern

```typescript
// In a server action:
import { rpcAdminListStores } from '@/lib/supabase/rpc';

export async function getStores() {
  const stores = await rpcAdminListStores({ p_page: 1, p_page_size: 20 });
  return stores;
}

// Generic fallback:
import { callRpc } from '@/lib/supabase/rpc';
const result = await callRpc('rpc_custom', { p_param: 'value' });
```

## Access Code Reference (rpc_user_access_gate)

| Code | Meaning |
|------|---------|
| `ok` | Access granted |
| `auth_required` | No authenticated user |
| `profile_not_found` | No profile in profiles table |
| `profile_inactive` | Profile status != active |
| `role_not_allowed` | Role not authorized for scope |
| `scope_not_allowed` | agent_scope doesn't match |
