/**
 * ENUMS from Supabase
 * These match EXACTLY the ENUM types and constraint values in the backend
 */

// Profile roles
export enum ProfileRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  VIEWER = 'viewer',
  STORE_OWNER = 'store_owner',
  INSTALLER = 'installer',
}

// Profile status
export enum ProfileStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

// Store status
export enum StoreStatus {
  NEW_STORE = 'new_store',
  MAINTENANCE = 'maintenance',
  OPERATIONAL = 'operational',
  INACTIVE = 'inactive',
}

// Sensor installation status
export enum SensorInstallStatus {
  DETECTED = 'detected',
  CONNECTING = 'connecting',
  CONFIG_SENDING = 'config_sending',
  CONFIG_SENT = 'config_sent',
  CONFIRMING = 'confirming',
  INSTALLED = 'installed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  UNINSTALLED = 'uninstalled',
}

// Store installation session status
export enum StoreInstallationSessionStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// User active session type
export enum UserActiveSessionType {
  INSTALL = 'install',
  MAINTENANCE = 'maintenance',
}

// Maintenance request status
export enum MaintenanceRequestStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// Maintenance request cause
export enum MaintenanceRequestCause {
  ADMIN_MANUAL = 'admin_manual',
  ADMIN_FORCED = 'admin_forced',
  DAEMON_ALERT = 'daemon_alert',
}

// Sensor maintenance action types
export enum SensorMaintenanceActionType {
  MAINTENANCE_CANCEL_REPORT = 'maintenance_cancel_report',
  REPLACEMENT = 'replacement',
  FIRMWARE_UPDATE = 'firmware_update',
  CALIBRATION = 'calibration',
  REBOOT = 'reboot',
  DIAGNOSTIC = 'diagnostic',
  CLEANING = 'cleaning',
  BATTERY_REPLACEMENT = 'battery_replacement',
  REPOSITION = 'reposition',
  OTHER = 'other',
}

// Replacement reason
export enum ReplacementReason {
  DAMAGED = 'damaged',
  MALFUNCTION = 'malfunction',
  UPGRADE = 'upgrade',
  OTHER = 'other',
}

// Decommission reason
export enum DecommissionReason {
  STOLEN = 'stolen',
  LOST = 'lost',
  DAMAGED_PERMANENT = 'damaged_permanent',
}

// Store toggle action types
export enum StoreToggleAction {
  ACTIVATED_NEW = 'activated_new',
  ACTIVATED_WITH_MAINTENANCE_REQUEST = 'activated_with_maintenance_request',
  MAINTENANCE_ALREADY_OPEN = 'maintenance_already_open',
  MAINTENANCE_REQUEST_CREATED = 'maintenance_request_created',
  CLOSED = 'closed',
}

// Location source
export enum LocationSource {
  GPS = 'gps',
  NETWORK = 'network',
  FUSED = 'fused',
  MANUAL = 'manual',
}

/**
 * Base response types for RPC returns
 */
export interface RpcBaseResponse {
  result?: boolean | null;
  error?: string | null;
}

/**
 * Database type placeholder — will be replaced with generated types from Supabase CLI
 */
export type Database = {
  public: {
    Tables: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: {
      profile_role: ProfileRole;
      profile_status: ProfileStatus;
      store_status: StoreStatus;
      sensor_install_status: SensorInstallStatus;
      store_install_session_status: StoreInstallationSessionStatus;
    };
  };
};
