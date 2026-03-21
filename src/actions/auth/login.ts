'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { callRpc } from '@/lib/supabase/rpc';
import { UserAccessGateResult } from '@/types/profiles';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  locale: z.enum(['es', 'en']).default('es'),
});

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: 'owner' | 'admin';
  };
  error?: string;
  accessCode?: string;
}

export async function loginAction(formData: unknown): Promise<LoginResponse> {
  try {
    const { email, password } = LoginSchema.parse(formData);
    const supabase = await createServerAuthClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const accessGateResult: UserAccessGateResult = await callRpc('rpc_user_access_gate', {
      p_required_scope: 'web_panel',
      p_target_user_id: authData.user.id,
    });

    if (!accessGateResult.can_access) {
      await supabase.auth.signOut();

      const errorMessage =
        accessGateResult.access_code === 'role_not_authorized'
          ? 'Your role does not have access to this dashboard'
          : accessGateResult.access_code === 'status_inactive'
            ? 'Your account is inactive'
            : 'Access denied';

      return { success: false, error: errorMessage, accessCode: accessGateResult.access_code };
    }

    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: (accessGateResult.role as 'owner' | 'admin') || 'admin',
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.issues[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred during login';

    console.error('[Login Error]', error);
    return { success: false, error: errorMessage };
  }
}
