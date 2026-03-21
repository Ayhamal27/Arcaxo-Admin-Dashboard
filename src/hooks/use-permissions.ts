'use client';

import { useCallback } from 'react';
import { useAuth } from './use-auth';
import {
  Permission,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from '@/lib/auth/permissions';
import { ProfileRole } from '@/types/profiles';

export function usePermissions() {
  const { user } = useAuth();

  const can = useCallback(
    (permission: Permission) => {
      return hasPermission(user?.role ?? ProfileRole.VIEWER, permission);
    },
    [user?.role]
  );

  const canAll = useCallback(
    (permissions: Permission[]) => {
      return hasAllPermissions(user?.role ?? ProfileRole.VIEWER, permissions);
    },
    [user?.role]
  );

  const canAny = useCallback(
    (permissions: Permission[]) => {
      return hasAnyPermission(user?.role ?? ProfileRole.VIEWER, permissions);
    },
    [user?.role]
  );

  return { can, canAll, canAny, role: user?.role };
}
