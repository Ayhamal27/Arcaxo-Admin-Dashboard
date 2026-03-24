'use server';

import { rpcAdminResetUserPassword } from '@/lib/supabase/rpc';

export interface ResetPasswordResult {
  success: boolean;
  temp_password?: string;
  error?: string;
}

export async function resetPasswordAction(userId: string): Promise<ResetPasswordResult> {
  try {
    const raw = await rpcAdminResetUserPassword({ p_target_user_id: userId });

    // Handle both single object and array responses
    const result = Array.isArray(raw) ? raw[0] : raw;

    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error_message ?? 'Error al restablecer contraseña',
      };
    }

    return { success: true, temp_password: result.temp_password };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al restablecer contraseña';
    console.error('[resetPasswordAction] error:', error);
    return { success: false, error: msg };
  }
}
