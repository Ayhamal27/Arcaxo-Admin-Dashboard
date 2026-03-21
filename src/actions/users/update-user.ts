'use server';

import { callRpc } from '@/lib/supabase/rpc';
import { ProfileRole, ProfileStatus } from '@/types/database';
import { z } from 'zod';
import { RpcUpsertUserProfileOutput } from '@/types/rpc-outputs';

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  role: z.enum(['owner', 'admin', 'manager', 'installer', 'viewer', 'store_owner']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  phone_country_code: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  identity_document: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city_id: z.number().int().positive().optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export interface UpdateUserResult {
  success: boolean;
  user_id?: string;
  error?: string;
}

const AGENT_SCOPE_BY_ROLE: Record<ProfileRole, string> = {
  [ProfileRole.OWNER]: 'company',
  [ProfileRole.ADMIN]: 'company',
  [ProfileRole.MANAGER]: 'assigned_stores',
  [ProfileRole.INSTALLER]: 'assigned_stores',
  [ProfileRole.STORE_OWNER]: 'assigned_stores',
  [ProfileRole.VIEWER]: 'assigned_stores',
};

export async function updateUserAction(input: unknown): Promise<UpdateUserResult> {
  try {
    const data = UpdateUserSchema.parse(input);

    // Build only the fields that are provided
    const params: Record<string, unknown> = {
      p_user_id: data.user_id,
    };

    if (data.first_name !== undefined) params.p_first_name = data.first_name;
    if (data.last_name !== undefined) params.p_last_name = data.last_name;
    if (data.role !== undefined) {
      params.p_role = data.role;
      params.p_agent_scope = AGENT_SCOPE_BY_ROLE[data.role as ProfileRole] ?? 'assigned_stores';
    }
    if (data.status !== undefined) params.p_status = data.status;
    if (data.city_id !== undefined) params.p_city_id = data.city_id;
    if (data.phone_country_code !== undefined) params.p_phone_country_code = data.phone_country_code;
    if (data.phone_number !== undefined) params.p_phone_number = data.phone_number;
    if (data.identity_document !== undefined) params.p_identity_document = data.identity_document;
    if (data.address !== undefined) params.p_address = data.address;

    const result = await callRpc<RpcUpsertUserProfileOutput>('rpc_upsert_user_profile', params);

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al actualizar usuario' };
    }

    return { success: true, user_id: result.user_id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const msg = error instanceof Error ? error.message : 'Error al actualizar usuario';
    return { success: false, error: msg };
  }
}
