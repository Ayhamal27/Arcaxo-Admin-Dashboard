'use server';

import { getServerClient } from '@/lib/supabase/server';
import { rpcUpsertUserProfile } from '@/lib/supabase/rpc';
import { ProfileRole, ProfileStatus } from '@/types/database';
import { z } from 'zod';

const AGENT_SCOPE_BY_ROLE: Record<ProfileRole, string> = {
  [ProfileRole.OWNER]: 'company',
  [ProfileRole.ADMIN]: 'company',
  [ProfileRole.MANAGER]: 'assigned_stores',
  [ProfileRole.INSTALLER]: 'assigned_stores',
  [ProfileRole.STORE_OWNER]: 'assigned_stores',
  [ProfileRole.VIEWER]: 'assigned_stores',
};

const CreateUserSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido').max(50).trim(),
  last_name: z.string().min(1, 'Apellido requerido').max(50).trim(),
  email: z.string().email('Email inválido'),
  phone_country_code: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  identity_document: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer']),
  city_id: z.number().min(1, 'Ciudad requerida'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export interface CreateUserResult {
  success: boolean;
  user_id?: string;
  email?: string;
  error?: string;
}

export async function createUserAction(input: unknown): Promise<CreateUserResult> {
  const client = getServerClient();
  let authUserId: string | undefined;

  try {
    const data = CreateUserSchema.parse(input);

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // Step 1: Create auth user
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name },
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Error al crear usuario en Auth';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        return { success: false, error: 'Este correo ya está registrado' };
      }
      return { success: false, error: msg };
    }

    authUserId = authData.user.id;

    // Step 2: Create profile via RPC
    const role = data.role as ProfileRole;
    const result = await rpcUpsertUserProfile({
      p_user_id: authUserId,
      p_first_name: data.first_name,
      p_last_name: data.last_name,
      p_role: role,
      p_status: ProfileStatus.ACTIVE,
      p_city_id: data.city_id,
      p_agent_scope: AGENT_SCOPE_BY_ROLE[role] ?? 'assigned_stores',
      p_phone_country_code: data.phone_country_code ?? null,
      p_phone_number: data.phone_number ?? null,
      p_identity_document: data.identity_document ?? null,
      p_address: data.address ?? null,
    });

    if (result.error) {
      // Rollback auth user
      await client.auth.admin.deleteUser(authUserId).catch(() => {});
      return { success: false, error: result.error };
    }

    return { success: true, user_id: authUserId, email: data.email };
  } catch (error) {
    // Rollback if auth user was created but profile failed
    if (authUserId) {
      await client.auth.admin.deleteUser(authUserId).catch(() => {});
    }

    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const msg = error instanceof Error ? error.message : 'Error al crear usuario';
    console.error('[createUserAction]', error);
    return { success: false, error: msg };
  }
}
