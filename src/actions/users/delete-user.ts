'use server';

import { rpcAdminDeleteUser } from '@/lib/supabase/rpc';

export interface DeleteUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function deleteUserAction(params: {
  userId: string;
  reason?: string;
}): Promise<DeleteUserResult> {
  try {
    // Delete profile via RPC (cascades sessions and auth cleanup)
    const result = await rpcAdminDeleteUser({
      p_user_id: params.userId,
      p_reason: params.reason ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al eliminar usuario' };
    }

    return { success: true, userId: params.userId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
