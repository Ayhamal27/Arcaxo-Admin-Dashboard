'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { UserAccessGateResult } from '@/types/profiles';
import { z } from 'zod';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .refine((v) => EMAIL_REGEX.test(v), 'Enter a valid email (e.g. user@domain.com)'),
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
      console.error('[Login Auth Error]', authError?.message, authError?.status, authError);
      return { success: false, error: authError?.message || 'Invalid email or password' };
    }

    // Use the authenticated client (not service_role) because this RPC
    // requires auth.uid() context from the signed-in user.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accessGateData, error: accessGateError } = await (supabase as any).rpc(
      'rpc_user_access_gate',
      {
        p_required_scope: 'web_panel',
        p_target_user_id: authData.user.id,
      }
    );

    if (accessGateError) {
      console.error('[Login Access Gate Error]', accessGateError);
      await supabase.auth.signOut();
      return { success: false, error: 'Failed to verify access permissions' };
    }

    const rawGate = Array.isArray(accessGateData) ? accessGateData[0] : accessGateData;
    const accessGateResult = rawGate as unknown as UserAccessGateResult;

    // The RPC is mobile-app-centric (can_access requires installer role).
    // For the web panel we check access ourselves using the returned profile data.
    const WEB_PANEL_ROLES = ['owner', 'admin'];

    if (!accessGateResult.has_profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'No profile found for this account' };
    }

    if (accessGateResult.status !== 'active') {
      await supabase.auth.signOut();
      return { success: false, error: 'Your account is inactive' };
    }

    if (!WEB_PANEL_ROLES.includes(accessGateResult.role ?? '')) {
      await supabase.auth.signOut();
      return { success: false, error: 'Your role does not have access to this dashboard', accessCode: accessGateResult.access_code };
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
