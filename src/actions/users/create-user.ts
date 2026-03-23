'use server';

import { createClient } from '@supabase/supabase-js';
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

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const CreateUserSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido').max(50).trim(),
  last_name: z.string().min(1, 'Apellido requerido').max(50).trim(),
  email: z
    .string()
    .min(1, 'Correo requerido')
    .email('Formato de correo inválido')
    .refine((v) => EMAIL_REGEX.test(v), 'Ingrese un correo válido (ej: usuario@dominio.com)'),
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
  temp_password?: string;
  error?: string;
}

/**
 * Create a standalone anon client (no cookies) for auth.signUp
 * so it doesn't interfere with the current admin session.
 */
function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function createUserAction(input: unknown): Promise<CreateUserResult> {
  try {
    const data = CreateUserSchema.parse(input);

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // Step 1: Create auth user via signUp (anon client, no session side-effects)
    const anonClient = createAnonClient();
    const { data: authData, error: authError } = await anonClient.auth.signUp({
      email: data.email,
      password: tempPassword,
      options: {
        data: { first_name: data.first_name, last_name: data.last_name },
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Error al crear usuario en Auth';

      // Email delivery errors are non-blocking — the user was still created
      const isEmailError =
        msg.toLowerCase().includes('email') &&
        (msg.toLowerCase().includes('send') ||
          msg.toLowerCase().includes('deliver') ||
          msg.toLowerCase().includes('smtp'));

      if (
        !isEmailError &&
        (msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists'))
      ) {
        return { success: false, error: 'Este correo ya está registrado' };
      }

      // If it's an email error but we have the user, continue
      if (!isEmailError || !authData?.user) {
        return { success: false, error: msg };
      }
    }

    const authUserId = authData.user.id;

    // Step 2: Create profile via RPC (uses session-based anon client)
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
      return { success: false, error: result.error };
    }

    return { success: true, user_id: authUserId, email: data.email, temp_password: tempPassword };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const msg = error instanceof Error ? error.message : 'Error al crear usuario';
    console.error('[createUserAction]', error);
    return { success: false, error: msg };
  }
}
