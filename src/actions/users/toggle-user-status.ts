'use server';

import { rpcAdminDeactivateUser } from '@/lib/supabase/rpc';
import { ProfileStatus } from '@/types/database';

export interface ToggleUserStatusResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  sessionsClosedCount?: number;
  error?: string;
}

export async function toggleUserStatusAction(params: {
  userId: string;
  newStatus: ProfileStatus;
  closeActiveSessions?: boolean;
}): Promise<ToggleUserStatusResult> {
  try {
    const result = await rpcAdminDeactivateUser({
      p_user_id: params.userId,
      p_new_status: params.newStatus,
      p_close_active_sessions: params.closeActiveSessions ?? false,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al cambiar estado del usuario' };
    }

    return {
      success: true,
      previousStatus: result.previous_status,
      newStatus: result.new_status,
      sessionsClosedCount: result.sessions_closed,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error inesperado' };
  }
}
