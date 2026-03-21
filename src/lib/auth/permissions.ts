import { ProfileRole } from '@/types/profiles';

export type Permission =
  | 'view_dashboard'
  | 'create_store'
  | 'edit_store'
  | 'delete_store'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'view_devices'
  | 'view_reports'
  | 'view_aerial'
  | 'edit_settings'
  | 'manage_roles';

const PERMISSION_MATRIX: Record<ProfileRole, Set<Permission>> = {
  [ProfileRole.OWNER]: new Set([
    'view_dashboard', 'create_store', 'edit_store', 'delete_store',
    'create_user', 'edit_user', 'delete_user', 'view_devices',
    'view_reports', 'view_aerial', 'edit_settings', 'manage_roles',
  ]),
  [ProfileRole.ADMIN]: new Set([
    'view_dashboard', 'create_store', 'edit_store', 'delete_store',
    'create_user', 'edit_user', 'delete_user', 'view_devices',
    'view_reports', 'view_aerial', 'edit_settings',
  ]),
  [ProfileRole.MANAGER]: new Set([
    'view_dashboard', 'view_devices', 'view_reports', 'view_aerial',
  ]),
  [ProfileRole.VIEWER]: new Set([
    'view_dashboard', 'view_devices', 'view_reports',
  ]),
  [ProfileRole.STORE_OWNER]: new Set(['view_dashboard']),
  [ProfileRole.INSTALLER]: new Set(['view_dashboard']),
};

export function hasPermission(role: ProfileRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

export function hasAllPermissions(role: ProfileRole, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

export function hasAnyPermission(role: ProfileRole, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

export function getPermissions(role: ProfileRole): Permission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? new Set());
}

export function checkPermission(role: ProfileRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return hasPermission(role, permission);
}
