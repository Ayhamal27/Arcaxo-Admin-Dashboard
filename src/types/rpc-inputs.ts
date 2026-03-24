import {
  StoreStatus,
  SensorInstallStatus,
  MaintenanceRequestCause,
  ProfileRole,
  ProfileStatus,
  DecommissionReason,
} from './database';

/**
 * STORES domain RPC inputs
 */

export interface RpcCreateStoreInput {
  p_name: string;
  p_city_id: number;
  p_address: string;
  p_latitude: number;
  p_longitude: number;
  p_responsible_first_name: string;
  p_responsible_last_name: string;
  p_responsible_email: string;
  p_phone_country_code?: string | null;
  p_phone_number?: string | null;
  p_responsible_phone_country_code?: string | null;
  p_responsible_phone_number?: string | null;
  p_authorized_devices_count?: number;
  p_preload_payload?: Record<string, unknown> | null;
  p_context_is_complete?: boolean;
  p_metadata?: Record<string, unknown> | null;
  p_created_by?: string | null;
  p_client_group?: string;
  p_internal_id?: number | null;
  p_facade_photo_url?: string | null;
}

export interface RpcAdminListStoresInput {
  p_page?: number;
  p_page_size?: number;
  p_search?: string | null;
  p_sort_by?: string;
  p_sort_order?: string;
  p_filter_status?: string[] | null;
  p_filter_country_code?: string | null;
  p_filter_active?: boolean | null;
}

export interface RpcAdminGetStoreDetailInput {
  p_store_id: string;
}

export interface RpcAdminUpdateStoreInput {
  p_store_id: string;
  p_name?: string | null;
  p_address?: string | null;
  p_city_id?: number | null;
  p_latitude?: number | null;
  p_longitude?: number | null;
  p_authorized_devices_count?: number | null;
  p_status?: StoreStatus | null;
  p_client_group?: string | null;
}

export interface RpcAdminToggleStoreActiveInput {
  p_store_id: string;
  p_active: boolean;
  p_required_devices_count?: number;
}

export interface RpcAdminListStoreSessionsInput {
  p_store_id: string;
  p_page?: number;
  p_page_size?: number;
  p_session_type?: string | null;
}

export interface RpcAdminListStoreSensorsInput {
  p_store_id: string;
  p_page?: number;
  p_page_size?: number;
  p_include_historical?: boolean;
}

export interface RpcStoreInstallationContextUpdateInput {
  p_store_id: string;
  p_name?: string | null;
  p_address?: string | null;
  p_city_id?: number | null;
  p_latitude?: number | null;
  p_longitude?: number | null;
  p_phone_country_code?: string | null;
  p_phone_number?: string | null;
  p_responsible_first_name?: string | null;
  p_responsible_last_name?: string | null;
  p_responsible_email?: string | null;
  p_wifi_ssid?: string | null;
  p_wifi_password?: string | null;
  p_preload_payload?: Record<string, unknown> | null;
  p_context_is_complete?: boolean | null;
}

export interface RpcStorePreInstallInput {
  p_store_id: string;
}

export interface RpcAdminMapListStoresInput {
  p_center_latitude: number;
  p_center_longitude: number;
  p_radius_meters?: number;
  p_statuses?: string[] | null;
  p_limit?: number;
  p_offset?: number;
  p_country_code?: string | null;
}

export interface RpcAdminMapStoreClustersInput {
  p_min_latitude: number;
  p_min_longitude: number;
  p_max_latitude: number;
  p_max_longitude: number;
  p_zoom?: number;
  p_statuses?: string[] | null;
  p_limit?: number;
  p_offset?: number;
  p_country_code?: string | null;
}

export interface RpcGetNearbyInstallerStoresInput {
  p_installer_latitude: number;
  p_installer_longitude: number;
  p_country_code: string;
  p_radius_meters?: number;
  p_limit?: number;
  p_statuses?: string[];
  p_offset?: number;
}

export interface RpcStoreInstallationSessionOpenInput {
  p_store_id: string;
}

export interface RpcStoreInstallationSessionCloseInput {
  p_store_id: string;
  p_session_id?: string | null;
}

export interface RpcStoreMaintenanceSessionOpenInput {
  p_store_id: string;
  p_request_id?: string | null;
}

export interface RpcStoreMaintenanceSessionCloseInput {
  p_store_id: string;
  p_session_id?: string | null;
}

/**
 * PROFILES domain RPC inputs
 */

export interface RpcUpsertUserProfileInput {
  p_user_id: string;
  p_first_name: string;
  p_last_name: string;
  p_role: ProfileRole;
  p_status: ProfileStatus;
  p_city_id: number;
  p_agent_scope?: string | null;
  p_phone_country_code?: string | null;
  p_phone_number?: string | null;
  p_identity_document?: string | null;
  p_address?: string | null;
}

export interface RpcUserAccessGateInput {
  p_required_scope?: string | null;
  p_target_user_id?: string | null;
}

export interface RpcUserActiveSessionInput {
  p_target_user_id?: string | null;
}

export interface RpcAdminListUsersInput {
  p_page?: number;
  p_page_size?: number;
  p_search?: string | null;
  p_filter_role?: string | null;
  p_filter_status?: string | null;
  p_sort_by?: string;
  p_sort_order?: string;
}

export interface RpcAdminGetUserDetailInput {
  p_user_id: string;
}

export interface RpcAdminDeactivateUserInput {
  p_user_id: string;
  p_new_status: ProfileStatus;
  p_close_active_sessions?: boolean;
}

export interface RpcAdminDeleteUserInput {
  p_user_id: string;
  p_reason?: string | null;
}

export interface RpcAdminResetUserPasswordInput {
  p_target_user_id: string;
}

/**
 * GEOGRAPHY domain RPC inputs
 */

export interface RpcGeoListRegionsInput {
  // No parameters
}

export interface RpcGeoListSubregionsInput {
  p_region_id?: number | null;
}

export interface RpcGeoListCountriesInput {
  p_region_id?: number | null;
  p_subregion_id?: number | null;
}

export interface RpcGeoListStatesInput {
  p_country_id: number;
}

export interface RpcGeoListCitiesInput {
  p_country_id: number;
  p_state_id: number;
}

/**
 * SENSORS domain RPC inputs
 */

export interface RpcSensorUpsertStageInput {
  p_idempotency_key: string;
  p_store_id: string;
  p_mac_address: string;
  p_stage: SensorInstallStatus;
  p_wifi_ssid?: string | null;
  p_wifi_password?: string | null;
  p_error_code?: string | null;
  p_error_message?: string | null;
  p_evidence_photo_url?: string | null;
  p_ble_rssi?: number | null;
}

export interface RpcSensorUnlinkInput {
  p_sensor_id?: string | null;
  p_mac_address?: string | null;
  p_store_id?: string | null;
  p_reason?: string | null;
  p_evidence_photo_url?: string | null;
  p_idempotency_key?: string | null;
}

export interface RpcAdminListSensorsInput {
  p_page?: number;
  p_page_size?: number;
  p_search?: string | null;
  p_filter_status?: string[] | null;
  p_filter_store_id?: string | null;
  p_filter_is_active?: boolean | null;
  p_sort_by?: string;
  p_sort_order?: string;
}

export interface RpcAdminGetSensorDetailInput {
  p_sensor_id?: string | null;
  p_mac_address?: string | null;
  p_serial?: string | null;
}

export interface RpcAdminDecommissionSensorInput {
  p_sensor_id: string;
  p_reason: DecommissionReason;
  p_note?: string | null;
}

export interface RpcAdminListSensorInstallationsInput {
  p_sensor_id: string;
  p_page?: number;
  p_page_size?: number;
}

export interface RpcAdminListSensorEventsInput {
  p_sensor_id: string;
  p_installation_id?: string | null;
  p_page?: number;
  p_page_size?: number;
}

export interface RpcGetNearbyInstallersInput {
  p_center_latitude: number;
  p_center_longitude: number;
  p_country_code: string;
  p_radius_meters?: number;
  p_limit?: number;
  p_offset?: number;
  p_filter_status?: string | null;
  p_max_age_minutes?: number;
}

/**
 * MAINTENANCE domain RPC inputs
 */

export interface RpcStoreMaintenanceOpenInput {
  p_store_id: string;
  p_cause: MaintenanceRequestCause;
  p_reason?: string | null;
  p_assigned_installer_profile_id?: string | null;
  p_force?: boolean;
  p_idempotency_key?: string | null;
}

export interface RpcStoreMaintenanceAssignInput {
  p_store_id: string;
  p_installer_profile_id: string;
  p_request_id?: string | null;
}

export interface RpcStoreMaintenanceUnassignInput {
  p_store_id: string;
  p_request_id?: string | null;
}

export interface RpcStoreMaintenanceCloseInput {
  p_store_id: string;
  p_request_id?: string | null;
  p_close_reason?: string | null;
  p_force_close_open_session?: boolean;
}
