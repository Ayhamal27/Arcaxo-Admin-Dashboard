import { Profile, Store, StoreContext, City, State, Country, Region, Subregion } from './entities';
import { StoreToggleAction } from './database';

/**
 * STORES domain RPC outputs
 */

export interface RpcCreateStoreOutput {
  store_id?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcAdminListStoresOutputItem {
  store_id: string;
  name: string;
  facade_photo_url?: string | null;
  status: string;
  active: boolean;
  install_enabled: boolean;
  authorized_devices_count: number;
  installed_devices_count: number;
  city_name?: string;
  state_name?: string;
  country_code: string;
  google_maps_url?: string;
  phone_country_code?: string;
  phone_number?: string;
  last_visit_date?: string;
  total_count: number;
}

export interface RpcAdminGetStoreDetailOutput extends Store {
  phone_country_code?: string | null;
  phone_number?: string | null;
  facade_photo_url?: string | null;
  wifi_ssid?: string | null;
  responsible?: Record<string, unknown> | null;
  preload_payload?: Record<string, unknown> | null;
  is_complete?: boolean;
  internal_id?: number | null;
  metadata?: Record<string, unknown> | null;
  installed_devices_count?: number;
  total_sessions_count?: number;
  open_session_id?: string | null;
  open_session_type?: string | null;
  open_session_installer_name?: string | null;
  city_name?: string;
  state_name?: string;
}

export interface RpcAdminUpdateStoreOutput {
  store_id?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcAdminToggleStoreActiveOutput {
  store_id: string;
  action_taken: StoreToggleAction;
  maintenance_request_id?: string | null;
  sensors_pending: number;
  result?: boolean;
  error?: string | null;
}

export interface RpcAdminListStoreSessionsOutputItem {
  session_id: string;
  session_type: string;
  status: string;
  installer_name?: string | null;
  installer_profile_id?: string | null;
  opened_at: string;
  closed_at?: string | null;
  required_devices_count: number;
  installed_devices_at_open: number;
  total_count: number;
}

export interface RpcAdminListStoreSensorsOutputItem {
  sensor_id: string;
  serial: string;
  mac_normalized: string;
  current_status: string;
  is_active: boolean;
  installed_at?: string | null;
  installer_name?: string | null;
  total_count: number;
}

export interface RpcStoreInstallationContextGetOutput extends StoreContext {}

export interface RpcStoreInstallationContextUpdateOutput {
  store_id?: string;
  context_complete?: boolean;
  has_facade_photo?: boolean;
  install_enabled?: boolean;
  result?: boolean;
  error?: string | null;
}

export interface RpcStoreWifiCredentialsGetOutput {
  store_id: string;
  wifi_ssid: string;
  wifi_password_plain: string;
}

export interface RpcStoreSetFacadePhotoOutput {
  store_id?: string;
  has_facade_photo?: boolean;
  install_enabled?: boolean;
  result?: boolean;
  error?: string | null;
}

export interface RpcStorePreInstallOutput {
  found: boolean;
  city_id?: number;
  address?: string;
  store_status?: string;
  active?: boolean;
  context_complete?: boolean;
  install_enabled?: boolean;
  can_open_session: boolean;
  blocking_reason?: string | null;
}

export interface RpcGetNearbyInstallerStoresOutputItem {
  store_id: string;
  name: string;
  address: string;
  google_maps_url?: string;
  authorized_devices_count: number;
  status: string;
  install_enabled: boolean;
  distance_meters: number;
  latitude?: number;
  longitude?: number;
}

export interface RpcStoreSessionOutput {
  session_id?: string;
  status?: string;
  required_devices_count?: number;
  current_installed_devices_count?: number;
  remaining_devices_count?: number;
  result?: boolean;
  error?: string | null;
}

/**
 * PROFILES domain RPC outputs
 */

export interface RpcUpsertUserProfileOutput {
  user_id?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcUserAccessGateOutput {
  user_id: string;
  email: string;
  country_code?: string;
  role: string;
  status: string;
  agent_scope: string;
  has_profile: boolean;
  can_access: boolean;
  access_code: string;
  access_message: string;
}

export interface RpcUserActiveSessionOutput {
  store_id?: string | null;
  session_type?: string | null;
}

export interface RpcAdminListUsersOutputItem {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  agent_scope?: string;
  phone_country_code?: string | null;
  phone_number?: string | null;
  city_name?: string | null;
  state_name?: string | null;
  country_code?: string | null;
  devices_installed_count: number;
  stores_installed_count: number;
  last_sign_in_at?: string | null;
  total_count: number;
}

export interface RpcAdminGetUserDetailOutput extends Profile {
  auth_email?: string;
  auth_created_at?: string;
  auth_last_sign_in_at?: string;
  auth_email_confirmed_at?: string;
  devices_installed_count?: number;
  stores_installed_count?: number;
  active_session_store_id?: string | null;
  active_session_type?: string | null;
}

export interface RpcAdminDeactivateUserOutput {
  user_id: string;
  previous_status: string;
  new_status: string;
  sessions_closed: number;
  result?: boolean;
  error?: string | null;
}

export interface RpcAdminDeleteUserOutput {
  user_id?: string;
  result?: boolean;
  error?: string | null;
}

/**
 * GEOGRAPHY domain RPC outputs
 */

export interface RpcGeoListRegionsOutputItem {
  region_id: number;
  region_name: string;
}

export interface RpcGeoListSubregionsOutputItem {
  subregion_id: number;
  region_id: number;
  subregion_name: string;
}

export interface RpcGeoListCountriesOutputItem {
  country_id: number;
  country_code: string;
  country_name: string;
  region_id: number;
  region_name?: string;
  subregion_id?: number;
  subregion_name?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
}

export interface RpcGeoListStatesOutputItem {
  state_id: number;
  state_code: string;
  state_name: string;
  country_id: number;
  country_code: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
}

export interface RpcGeoListCitiesOutputItem {
  city_id: number;
  city_code: string; // = city_id::TEXT
  city_name: string;
  state_id: number;
  country_id: number;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
}

/**
 * SENSORS domain RPC outputs
 */

export interface RpcSensorUpsertStageOutput {
  sensor_id?: string;
  installation_id?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcSensorUnlinkOutput {
  sensor_id?: string;
  previous_store_id?: string | null;
  result?: boolean;
  error?: string | null;
}

export interface RpcAdminListSensorsOutputItem {
  sensor_id: string;
  serial: string;
  mac_normalized: string;
  current_store_id?: string | null;
  current_status: string;
  is_active: boolean;
  store_name?: string | null;
  city_name?: string | null;
  country_code?: string | null;
  installed_at?: string | null;
  decommissioned_at?: string | null;
  total_count: number;
}

export interface RpcAdminGetSensorDetailOutput {
  sensor_id: string;
  serial: string;
  mac_normalized: string;
  current_store_id?: string | null;
  current_status: string;
  is_active: boolean;
  installed_at?: string | null;
  uninstalled_at?: string | null;
  decommissioned_at?: string | null;
  decommission_reason?: string | null;
  decommission_note?: string | null;
  store_name?: string | null;
  store_address?: string | null;
  city_name?: string | null;
  country_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RpcAdminDecommissionSensorOutput {
  sensor_id?: string;
  result?: boolean;
  error?: string | null;
}

/**
 * MAINTENANCE domain RPC outputs
 */

export interface RpcStoreMaintenanceOpenOutput {
  request_id?: string;
  store_id?: string;
  status?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcStoreMaintenanceAssignOutput {
  request_id?: string;
  store_id?: string;
  installer_profile_id?: string;
  result?: boolean;
  error?: string | null;
}

export interface RpcStoreMaintenanceCloseOutput {
  request_id?: string;
  store_id?: string;
  status?: string;
  result?: boolean;
  error?: string | null;
}
