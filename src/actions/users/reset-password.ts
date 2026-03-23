'use server';

import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface ResetPasswordResult {
  success: boolean;
  temp_password?: string;
  error?: string;
}

export async function resetPasswordAction(userId: string): Promise<ResetPasswordResult> {
  try {
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, temp_password: tempPassword };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error al restablecer contraseña';
    console.error('[resetPasswordAction]', error);
    return { success: false, error: msg };
  }
}
