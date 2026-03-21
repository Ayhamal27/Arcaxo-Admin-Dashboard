import {
  ProfileRole,
  ProfileStatus,
  StoreStatus,
  SensorInstallStatus,
  StoreInstallationSessionStatus,
  MaintenanceRequestStatus,
  MaintenanceRequestCause,
  SensorMaintenanceActionType,
  ReplacementReason,
  DecommissionReason,
  LocationSource,
} from './database';

/**
 * STORES domain entities
 */
export interface Store {
  id: string;
  name: string;
  address: string;
  city_id: number;
  country_code: string; // char(2), derived from city_id
  state_id: number; // derived from city_id
  location?: unknown; // PostGIS POINT
  google_maps_url?: string | null;
  authorized_devices_count: number;
  status: StoreStatus;
  active: boolean;
  context_complete: boolean;
  has_facade_photo: boolean;
  install_enabled: boolean;
  client_group: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreContext {
  store_id: string;
  phone_country_code?: string | null;
  phone_number?: string | null;
  facade_photo_url?: string | null;
  wifi_ssid?: string | null;
  wifi_password_encrypted?: string | null; // always encrypted
  responsible?: StoreResponsible | null;
  preload_payload?: Record<string, unknown> | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreResponsible {
  first_name: string;
  last_name: string;
  email: string;
  phone_country_code?: string;
  phone_number?: string;
}

export interface StoreMetadataCurrent {
  store_id: string;
  internal_id?: number | null;
  metadata?: Record<string, unknown> | null;
  updated_at: string;
}

/**
 * PROFILES domain entities
 */
export interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_country_code?: string | null;
  phone_number?: string | null;
  identity_document?: string | null;
  address?: string | null;
  country_id?: number | null;
  country_code?: string | null;
  state_id?: number | null;
  state_code?: string | null;
  state_name?: string | null;
  city_id?: number | null;
  city_code?: string | null;
  city_name?: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  agent_scope?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GEOGRAPHY domain entities
 */
export interface Region {
  id: number;
  name: string;
  translations?: Record<string, unknown> | null;
  flag?: number;
  wikiDataId?: string | null;
  updated_at?: string;
}

export interface Subregion {
  id: number;
  name: string;
  region_id: number;
  translations?: Record<string, unknown> | null;
  flag?: number;
  wikiDataId?: string | null;
  updated_at?: string;
}

export interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  region_id: number;
  subregion_id?: number | null;
  phonecode?: string | null;
  capital?: string | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  flag?: number;
  updated_at?: string;
}

export interface State {
  id: number;
  name: string;
  country_id: number;
  country_code: string;
  iso2?: string | null;
  iso3166_2?: string | null;
  type?: string | null;
  level?: number | null;
  parent_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  google_maps_url?: string | null;
  flag?: number;
  updated_at?: string;
}

export interface City {
  id: number;
  name: string;
  state_id: number;
  state_code?: string | null;
  country_id: number;
  country_code: string;
  type?: string | null;
  level?: number | null;
  parent_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  google_maps_url?: string | null;
  flag?: number;
  updated_at?: string;
}

/**
 * SENSORS domain entities
 */
export interface Sensor {
  id: string;
  mac_normalized: string;
  serial: string; // GENERATED STORED: ARXaabbccddeeff
  current_store_id?: string | null;
  current_status: SensorInstallStatus;
  is_active: boolean;
  installed_at?: string | null;
  uninstalled_at?: string | null;
  decommissioned_at?: string | null;
  decommission_reason?: DecommissionReason | null;
  decommission_note?: string | null;
  decommissioned_by_profile_id?: string | null;
  created_by_profile_id?: string | null;
  updated_by_profile_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorInstallation {
  id: string;
  sensor_id: string;
  store_id: string;
  installer_profile_id?: string | null;
  status: SensorInstallStatus;
  started_at: string;
  completed_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  uninstalled_at?: string | null;
  closed_reason?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorInstallationEvent {
  id: number;
  installation_id: string;
  sensor_id: string;
  store_id: string;
  stage: SensorInstallStatus;
  actor_profile_id?: string | null;
  idempotency_key?: string | null;
  evidence_photo_url?: string | null;
  ble_rssi?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
}

/**
 * SESSIONS domain entities
 */
export interface StoreInstallationSession {
  id: string;
  store_id: string;
  installer_profile_id?: string | null;
  status: StoreInstallationSessionStatus;
  required_devices_count: number;
  installed_devices_count_at_open: number;
  opened_at: string;
  last_seen_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  closed_at?: string | null;
  cancel_reason?: string | null;
  cancel_report?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreMaintenanceSession {
  id: string;
  request_id: string;
  store_id: string;
  installer_profile_id?: string | null;
  status: StoreInstallationSessionStatus;
  required_devices_count: number;
  installed_devices_count_at_open: number;
  opened_at: string;
  last_seen_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  closed_at?: string | null;
  cancel_reason?: string | null;
  cancel_report?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * MAINTENANCE domain entities
 */
export interface StoreMaintenanceRequest {
  id: string;
  store_id: string;
  status: MaintenanceRequestStatus;
  cause: MaintenanceRequestCause;
  assigned_installer_profile_id?: string | null;
  opened_by_profile_id?: string | null;
  closed_by_profile_id?: string | null;
  force_open: boolean;
  reason?: string | null;
  idempotency_key?: string | null;
  opened_at: string;
  closed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensorMaintenanceAction {
  id: string;
  sensor_id?: string | null;
  store_id: string;
  installer_profile_id: string;
  action_type: SensorMaintenanceActionType;
  action_detail?: string | null;
  evidence_photo_url?: string | null;
  replacement_sensor_id?: string | null;
  replacement_reason?: ReplacementReason | null;
  idempotency_key: string;
  created_at: string;
}

/**
 * INSTALLER LOCATIONS domain entities
 */
export interface InstallerLocation {
  id: number;
  installer_profile_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  source: LocationSource;
  country_code: string;
  recorded_at: string;
  created_at: string;
}
