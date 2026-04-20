import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerAuthClient, createServerClient } from '@/lib/supabase/server';
import { Database, ProfileRole, ProfileStatus } from '@/types/database';
import { UserAccessGateResult } from '@/types/profiles';

type ApiErrorCode =
  | 'unauthenticated'
  | 'forbidden_role'
  | 'email_already_exists'
  | 'validation_error'
  | 'user_create_failed';

const CreateAdminUserSchema = z
  .object({
    email: z.string().trim().min(1, 'email is required').email('email is invalid'),
    password: z.string().min(1, 'password is required').optional(),
    send_invite: z.boolean().default(false),
    first_name: z.string().trim().min(1, 'first_name is required').max(50),
    last_name: z.string().trim().min(1, 'last_name is required').max(50),
    role: z.enum(['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer'], {
      error: 'role is invalid',
    }),
    status: z.enum(['active', 'inactive', 'suspended', 'pending'], {
      error: 'status is invalid',
    }),
    city_id: z.number().int().refine((value) => value > 0, 'city_id is invalid'),
    agent_scope: z.string().trim().min(1).optional(),
    phone_country_code: z.string().trim().optional().nullable(),
    phone_number: z.string().trim().optional().nullable(),
    identity_document: z.string().trim().optional().nullable(),
    address: z.string().trim().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.send_invite && !value.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'password is required when send_invite is false',
      });
    }
  });

function errorResponse(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status }
  );
}

function extractBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
}

async function createRequesterClient(request: NextRequest) {
  const token = extractBearerToken(request);
  if (token) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );
  }

  return createServerAuthClient();
}

function resolveAgentScope(role: ProfileRole, agentScope?: string) {
  if (agentScope && agentScope.trim().length > 0) return agentScope.trim();
  return role === ProfileRole.INSTALLER ? 'mobile_installer' : 'web_panel';
}

function isEmailAlreadyExistsError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('duplicate')
  );
}

function isValidationProfileError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('city') ||
    normalized.includes('role') ||
    normalized.includes('status') ||
    normalized.includes('invalid') ||
    normalized.includes('validation')
  );
}

async function rollbackAuthUser(userId: string) {
  try {
    const adminClient = createServerClient();
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      console.error('[POST /api/admin/users] rollback deleteUser error:', error);
    }
  } catch (error) {
    console.error('[POST /api/admin/users] rollback exception:', error);
  }
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    // Validate caller identity — getUser() makes a network call to verify the JWT.
    // We use a dedicated client solely for this; RPC calls below go through the
    // service-role adminClient to avoid supabase-js global-header/auth-state
    // conflicts that can cause PostgREST to reject the user's JWT in API routes.
    const requesterClient = await createRequesterClient(request);
    const {
      data: { user: requesterUser },
      error: requesterAuthError,
    } = await requesterClient.auth.getUser();

    if (requesterAuthError || !requesterUser) {
      return errorResponse(401, 'unauthenticated', 'Authentication required');
    }

    // Use service-role client for all RPC + Auth admin operations.
    const adminClient = createServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: accessGateData, error: accessGateError } = await (adminClient as any).rpc(
      'rpc_user_access_gate',
      {
        p_required_scope: 'web_panel',
        p_target_user_id: requesterUser.id,
      }
    );

    if (accessGateError) {
      console.error('[POST /api/admin/users] rpc_user_access_gate error:', accessGateError);
      return errorResponse(500, 'user_create_failed', 'Failed to verify caller permissions');
    }

    const accessGate = (Array.isArray(accessGateData) ? accessGateData[0] : accessGateData) as
      | UserAccessGateResult
      | null;

    const isAllowedCaller =
      accessGate?.has_profile === true &&
      accessGate.status === ProfileStatus.ACTIVE &&
      (accessGate.role === ProfileRole.OWNER || accessGate.role === ProfileRole.ADMIN);

    if (!isAllowedCaller) {
      return errorResponse(403, 'forbidden_role', 'Only active owner/admin can create users');
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return errorResponse(422, 'validation_error', 'Invalid JSON payload');
    }

    const payload = CreateAdminUserSchema.parse(rawBody);
    const agentScope = resolveAgentScope(payload.role as ProfileRole, payload.agent_scope);

    let createdUserId: string;
    let createdEmail = payload.email;

    if (payload.send_invite) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        payload.email,
        {
          data: { first_name: payload.first_name, last_name: payload.last_name },
        }
      );

      if (inviteError || !inviteData.user) {
        const message = inviteError?.message ?? 'Unable to invite user';
        if (isEmailAlreadyExistsError(message)) {
          return errorResponse(409, 'email_already_exists', 'Email already exists');
        }
        return errorResponse(500, 'user_create_failed', message);
      }

      createdUserId = inviteData.user.id;
      createdEmail = inviteData.user.email ?? payload.email;
    } else {
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password!,
        email_confirm: true,
        user_metadata: { first_name: payload.first_name, last_name: payload.last_name },
      });

      if (createError || !createData.user) {
        const message = createError?.message ?? 'Unable to create user';
        if (isEmailAlreadyExistsError(message)) {
          return errorResponse(409, 'email_already_exists', 'Email already exists');
        }
        return errorResponse(500, 'user_create_failed', message);
      }

      createdUserId = createData.user.id;
      createdEmail = createData.user.email ?? payload.email;
    }

    createdAuthUserId = createdUserId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profileData, error: profileError } = await (adminClient as any).rpc(
      'rpc_upsert_user_profile',
      {
        p_user_id: createdUserId,
        p_first_name: payload.first_name,
        p_last_name: payload.last_name,
        p_role: payload.role,
        p_status: payload.status,
        p_city_id: payload.city_id,
        p_agent_scope: agentScope,
        p_phone_country_code: payload.phone_country_code ?? null,
        p_phone_number: payload.phone_number ?? null,
        p_identity_document: payload.identity_document ?? null,
        p_address: payload.address ?? null,
      }
    );

    const profileResult = Array.isArray(profileData) ? profileData[0] : profileData;
    const profileMessage =
      profileError?.message ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profileResult as any)?.error ??
      'Profile creation failed';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileOk = !profileError && (profileResult as any)?.result !== false;

    if (!profileOk) {
      await rollbackAuthUser(createdUserId);
      createdAuthUserId = null;

      if (isValidationProfileError(profileMessage)) {
        return errorResponse(422, 'validation_error', profileMessage);
      }

      return errorResponse(500, 'user_create_failed', profileMessage);
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          user_id: createdUserId,
          email: createdEmail,
          profile: {
            role: payload.role,
            status: payload.status,
            city_id: payload.city_id,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdAuthUserId) {
      await rollbackAuthUser(createdAuthUserId);
    }

    if (error instanceof z.ZodError) {
      return errorResponse(422, 'validation_error', error.issues[0]?.message ?? 'Validation error');
    }

    console.error('[POST /api/admin/users] unexpected error:', error);
    return errorResponse(500, 'user_create_failed', 'Unexpected error creating user');
  }
}
