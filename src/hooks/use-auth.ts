'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  return {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    clearUser,
  };
}
