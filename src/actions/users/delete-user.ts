'use server';

import { rpcAdminDeleteUser } from '@/lib/supabase/rpc';
import { getServerClient } from '@/lib/supabase/server';

export interface DeleteUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function deleteUserAction(params: {
  userId: string;
  reason?: string;
}): Promise<DeleteUserResult> {
  const client = getServerClient();

  try {
    // Step 1: Delete profile via RPC (cascades sessions)
    const result = await rpcAdminDeleteUser({
      p_user_id: params.userId,
      p_reason: params.reason ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al eliminar usuario' };
    }

    // Step 2: Delete from auth
    const { error: authError } = await client.auth.admin.deleteUser(params.userId);
    if (authError) {
      // Profile was deleted but auth remains — log but don't fail
      console.error('[deleteUserAction] Failed to delete auth user:', authError);
    }

    return { success: true, userId: params.userId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
