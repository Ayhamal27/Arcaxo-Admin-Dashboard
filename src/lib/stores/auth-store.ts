import { create } from 'zustand';
import { Profile, ProfileRole, ProfileStatus } from '@/types/profiles';

interface AuthUser {
  id: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  profile?: Profile;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  refreshProfile: (profile) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            profile,
            status: profile.status,
          }
        : null,
    })),
}));
