'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { Profile, ProfileRole, ProfileStatus } from '@/types/profiles';

export interface CurrentUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    profile?: Profile;
    role?: ProfileRole;
    status?: ProfileStatus;
  };
  error?: string;
}

export async function getCurrentUserAction(): Promise<CurrentUserResponse> {
  try {
    const supabase = await createServerAuthClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return { success: false, error: 'No active session' };
    }

    const user = data.user;

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
      },
    };
  } catch (error) {
    console.error('[Get Current User Error]', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

export async function isAuthenticatedAction(): Promise<boolean> {
  try {
    const supabase = await createServerAuthClient();
    const { data, error } = await supabase.auth.getUser();
    return !error && !!data.user;
  } catch {
    return false;
  }
}
