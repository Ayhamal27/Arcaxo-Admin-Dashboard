'use server';

import { createServerAuthClient } from '@/lib/supabase/server';

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export async function logoutAction(): Promise<LogoutResponse> {
  try {
    const supabase = await createServerAuthClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    console.error('[Logout Error]', error);
    return { success: false, error: errorMessage };
  }
}
