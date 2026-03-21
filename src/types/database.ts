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

/**
 * Database type placeholder — will be extended with generated types from Supabase
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
    };
  };
};
