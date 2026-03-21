# Etapa 13 — Lógica CRUD de Usuarios (Server Actions)

## Objetivo
Implement server actions for user management CRUD operations. Coordinate between Supabase Auth (authentication) and RPC-based profile management (all business logic). All backend RPCs are now FULLY IMPLEMENTED and production-ready.

## Fuentes de referencia
- supabase-ref-docs/profiles.md (Implemented RPCs)
- supabase-ref-docs/auth.md (Implemented RPCs)
- types/users.ts (from Etapa 01)
- lib/auth.ts (from Etapa 02)

## Arquitectura de dos capas

**Capa 1: Auth (Supabase Auth system)**
- Email/password credentials
- Email confirmation states
- Last sign-in tracking
- Password reset flows

**Capa 2: Profile (RPC-managed via Supabase)**
- User metadata (name, phone, address, identity)
- Role and permissions
- Status (active/inactive/suspended)
- Agent scope (web_panel, mobile_installer, both)
- All other business logic

**Constraint:** Never access auth.users or profiles tables directly. All operations flow through server actions + RPCs.

---

## Tareas

### T-13-01: Server Action — Listar usuarios

**Archivo:** `app/actions/users/list-users.ts`

**Descripción:**
Retrieve paginated list of all users with filtering and search capabilities. IMPLEMENTED: `rpc_admin_list_users` is production-ready.

**Especificaciones técnicas:**
- RPC: `rpc_admin_list_users(...)` — IMPLEMENTED AND AVAILABLE
- Auth: owner, admin role required
- Pagination: page (default 1), pageSize (default 20)
- Filters: role, status, searchTerm (email/name)
- Sorting: by created_at, last_sign_in_at, name, email

**RPC: rpc_admin_list_users — IMPLEMENTED**

```sql
Input Parameters:
  p_page int DEFAULT 1
  p_page_size int DEFAULT 20
  p_search text DEFAULT NULL (case-insensitive: email, first_name, last_name)
  p_filter_role text[] DEFAULT NULL (array of roles to filter)
  p_filter_status text[] DEFAULT NULL (array of statuses to filter)
  p_sort_by text DEFAULT 'created_at'
  p_sort_order text DEFAULT 'desc'

Output TABLE (paginated):
  user_id uuid
  email text
  first_name text
  last_name text
  role text ('owner'|'admin'|'manager'|'installer'|'viewer')
  status text ('active'|'inactive'|'suspended')
  agent_scope text ('web_panel'|'mobile_installer'|'both')
  phone_country_code text (nullable)
  phone_number text (nullable)
  city_id bigint (nullable)
  city_name text (nullable)
  created_at timestamptz
  updated_at timestamptz
  last_sign_in_at timestamptz (nullable)
  email_confirmed_at timestamptz (nullable)
  stores_installed_count int
  devices_installed_count int
  active_sessions_count int
  total_count bigint (pagination metadata)
```

**Detalles de implementación:**
- Joins auth.users for email and sign-in tracking
- Search: case-insensitive full-text across email, first_name, last_name
- Role values: 'owner', 'admin', 'manager', 'installer', 'viewer'
- Status values: 'active', 'inactive', 'suspended'
- agent_scope: 'web_panel' (admin roles), 'mobile_installer' (field installers), 'both' (super)
- counts: number of stores/devices installed, active sessions
- Pagination: total_count for UI calculation
- Permissions: authenticated owner/admin

**Action signature & implementation:**
```typescript
interface ListUsersFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  filterRole?: string[];
  filterStatus?: string[];
  sortBy?: 'created_at' | 'last_sign_in_at' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export async function listUsers(
  filters: ListUsersFilters
): Promise<{
  users: UserListItem[];
  pagination: PaginationMeta;
}> {
  const { data, error } = await supabase
    .rpc('rpc_admin_list_users', {
      p_page: filters.page || 1,
      p_page_size: filters.pageSize || 20,
      p_search: filters.search || null,
      p_filter_role: filters.filterRole || null,
      p_filter_status: filters.filterStatus || null,
      p_sort_by: filters.sortBy || 'created_at',
      p_sort_order: filters.sortOrder || 'desc',
    });

  if (error) {
    throw new ApiError('Failed to fetch users', 500, error);
  }

  const totalCount = data[0]?.total_count || 0;

  return {
    users: data.map(parseUserListItem),
    pagination: {
      page: filters.page || 1,
      pageSize: filters.pageSize || 20,
      totalCount,
      totalPages: Math.ceil(totalCount / (filters.pageSize || 20)),
    },
  };
}
```

---

### T-13-02: Server Action — Obtener detalle de usuario

**Archivo:** `app/actions/users/get-user-detail.ts`

**Descripción:**
Retrieve complete user profile with authentication metadata and usage statistics. IMPLEMENTED: `rpc_admin_get_user_detail` is production-ready.

**Especificaciones técnicas:**
- RPC: `rpc_admin_get_user_detail(p_user_id)` — IMPLEMENTED AND AVAILABLE
- Auth: owner, admin role required
- Input: userId (uuid)
- Returns: Complete profile + auth metadata + activity statistics

**RPC: rpc_admin_get_user_detail — IMPLEMENTED**

```sql
Input Parameters:
  p_user_id uuid (required)

Output (Single row):
  user_id uuid
  email text
  first_name text
  last_name text
  role text ('owner'|'admin'|'manager'|'installer'|'viewer')
  status text ('active'|'inactive'|'suspended')
  agent_scope text
  phone_country_code text (nullable)
  phone_number text (nullable)
  identity_document text (nullable - CPF/RUC for identity verification)
  address text (nullable)
  city_id bigint (nullable)
  city_name text (nullable)
  state_name text (nullable)
  country_code text (nullable)

  -- Auth metadata (from auth.users)
  auth_created_at timestamptz
  auth_last_sign_in_at timestamptz (nullable)
  email_confirmed_at timestamptz (nullable)
  email_confirmation_sent_at timestamptz (nullable)

  -- Statistics
  stores_installed_count int (installations by this user)
  devices_installed_count int (sensors installed by this user)
  active_sessions_count int (currently open sessions)
  total_sessions_count int (all time)
  last_activity_at timestamptz (nullable - most recent action)

  -- Recent activity (jsonb array - last 10 events)
  recent_activity jsonb (array of {
    activity_type text ('login'|'store_visit'|'device_install'|'logout'|'maintenance'|'unlink'|'decommission'),
    actor_id uuid (if applicable),
    activity_data jsonb (event-specific data),
    created_at timestamptz
  })

  -- Timestamps
  profile_created_at timestamptz
  profile_updated_at timestamptz
```

**Detalles de implementación:**
- Validate user_id exists—returns error if not found
- Aggregate stats from sessions, installations, and event tables
- recent_activity: limited to last 10 events, ordered by created_at DESC
- Identity document: sensitive field, restrict visibility in UI
- last_activity_at: used for "last seen" displays
- Permissions: authenticated owner/admin
- Suspended users still visible with status indicator

**Action signature & implementation:**
```typescript
export async function getUserDetail(
  userId: string
): Promise<UserDetail> {
  const { data, error } = await supabase
    .rpc('rpc_admin_get_user_detail', {
      p_user_id: userId,
    })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError('User not found', 404);
    }
    throw new ApiError('Failed to fetch user details', 500, error);
  }

  return {
    ...parseUserDetail(data),
    recentActivity: data.recent_activity || [],
  };
}
```

---

### T-13-03: Server Action — Crear usuario

**Archivo:** `app/actions/users/create-user.ts`

**Descripción:**
Create new user with atomic auth + profile creation. Multi-step process with rollback capability.

**Especificaciones técnicas:**
- Step 1: Create auth.users via Supabase Admin API
- Step 2: Create profile via rpc_upsert_user_profile RPC
- Rollback: Delete auth user if profile creation fails
- Auth: owner, admin role required

**Step 1: Create Auth User**

```typescript
// Supabase Admin API call
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: formData.email,
  password: generateSecurePassword(12), // Random temp password
  email_confirm: true, // Skip email confirmation
  user_metadata: {
    created_by_admin: true,
  },
});
```

**Step 2: Create Profile via RPC**

```typescript
// Use existing RPC
const { data: profile, error: profileError } = await supabase.rpc(
  'rpc_upsert_user_profile',
  {
    p_user_id: authUser.id,
    p_first_name: formData.firstName,
    p_last_name: formData.lastName,
    p_email: formData.email,
    p_role: formData.role,
    p_status: 'active',
    p_agent_scope: deriveAgentScope(formData.role),
    p_city_id: formData.cityId,
    p_phone_country_code: formData.phoneCountryCode,
    p_phone_number: formData.phoneNumber,
    p_identity_document: formData.identityDocument,
    p_address: formData.address,
  }
);
```

**Rollback on failure:**

```typescript
if (profileError) {
  // Delete the auth user to maintain consistency
  await supabase.auth.admin.deleteUser(authUser.id);
  throw new Error(`Profile creation failed: ${profileError.message}`);
}
```

**Step 3: Send Welcome Email**

```typescript
// Option A: Use Supabase invite
await supabase.auth.admin.inviteUserByEmail(formData.email, {
  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
});

// OR Option B: Custom email via RPC (if backend supports)
// await supabase.rpc('rpc_admin_send_welcome_email', {...})
```

**Validation with Zod:**
```typescript
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(['owner', 'admin', 'manager', 'installer', 'viewer']),
  cityId: z.number().int().positive(),
  phoneCountryCode: z.string().min(1).max(5).optional(),
  phoneNumber: z.string().regex(/^\d+$/).optional(),
  identityDocument: z.string().optional(),
  address: z.string().max(500).optional(),
});
```

**RPC REQUERIDO (NOVO/OPTIONAL): rpc_admin_send_welcome_email**

```sql
Input Parameters:
  p_user_id uuid
  p_email text
  p_first_name text
  p_reset_url text (link to password reset page)

Output:
  result boolean
  error text (nullable)
```

**Detalles de implementación:**
- Generate cryptographically secure random password (12+ characters)
- Email confirmation skipped—users invited directly
- Derive agent_scope from role (see mapping below)
- Rollback guarantees consistency
- Send email with password reset link
- Log creation for audit trail
- Permissions: authenticated owner/admin

**Role → Agent Scope mapping:**
```typescript
{
  owner: 'web_panel',
  admin: 'web_panel',
  manager: 'web_panel',
  viewer: 'web_panel',
  installer: 'mobile_installer',
}
```

**Action signature:**
```typescript
export async function createUser(
  formData: CreateUserInput
): Promise<{
  success: boolean;
  userId?: string;
  user?: UserDetail;
  error?: string;
}>;
```

---

### T-13-04: Server Action — Actualizar usuario

**Archivo:** `app/actions/users/update-user.ts`

**Descripción:**
Update user profile information. Handles separate paths for auth changes vs. profile data.

**Especificaciones técnicas:**
- Profile updates: Use `rpc_upsert_user_profile` (existing)
- Email updates: Use `supabase.auth.admin.updateUserById()`
- Auth: owner, admin role required
- Partial updates supported (PATCH)

**Validation with Zod:**
```typescript
const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['owner', 'admin', 'manager', 'installer', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  identityDocument: z.string().optional(),
  address: z.string().optional(),
  cityId: z.number().int().positive().optional(),
});
```

**Update paths:**

```typescript
// Path 1: Update profile fields
if (updates.firstName || updates.lastName || updates.role || ...) {
  const { error: profileError } = await supabase.rpc(
    'rpc_upsert_user_profile',
    {
      p_user_id: userId,
      p_first_name: updates.firstName,
      p_last_name: updates.lastName,
      p_role: updates.role,
      // ... other fields
    }
  );
}

// Path 2: Update auth email (separate transaction)
if (updates.email && updates.email !== currentUser.email) {
  const { error: authError } = await supabase.auth.admin.updateUserById(
    userId,
    { email: updates.email }
  );

  // Also update profile email field
  await supabase.rpc('rpc_upsert_user_profile', {
    p_user_id: userId,
    p_email: updates.email,
  });
}
```

**RPC REQUERIDO (NOVO): rpc_admin_update_user_email**

```sql
Input Parameters:
  p_user_id uuid
  p_new_email text

Output:
  user_id uuid
  email text
  result boolean
  error text (nullable)

Notes:
  - Atomically updates both auth.users and user_profile
  - Sends verification email to new address
  - Requires admin permission
```

**Detalles de implementación:**
- Validate email uniqueness before updating
- Changing email requires verification (send confirmation link)
- Permissions: owner/admin can update any user, users can update themselves (limited fields)
- Log all changes for audit trail

**Action signature:**
```typescript
export async function updateUser(
  userId: string,
  updates: UpdateUserInput
): Promise<{
  success: boolean;
  user?: UserDetail;
  error?: string;
}>;
```

---

### T-13-05: Server Action — Cambiar estado de usuario

**Archivo:** `app/actions/users/toggle-user-status.ts`

**Descripción:**
Change user status between active, inactive, and suspended. May optionally close active sessions. IMPLEMENTED: `rpc_admin_deactivate_user` is production-ready with proper authorization guards.

**Especificaciones técnicas:**
- RPC: `rpc_admin_deactivate_user(p_user_id, p_new_status, p_close_active_sessions?)` — IMPLEMENTED
- Auth: owner, admin role required
- Input: userId, newStatus, optional closeActiveSessions, optional reason
- Output: Confirmation with session closure count
- IMPORTANT: Cannot deactivate self, admin cannot deactivate owner, only owner can deactivate owner

**RPC: rpc_admin_deactivate_user — IMPLEMENTED**

```sql
Input Parameters:
  p_user_id uuid (required)
  p_new_status text (required - 'active'|'inactive'|'suspended')
  p_close_active_sessions boolean (default false)
  p_reason text (optional - for audit log)

Output:
  user_id uuid
  previous_status text
  new_status text
  sessions_closed_count int
  result boolean
  error text (nullable)
```

**Authorization Rules (enforced in RPC):**
- Cannot deactivate self (comparing to current session user)
- Admin cannot deactivate owner (only owner can)
- Owner can deactivate any user including other owners
- suspended status blocks all login attempts

**Status Transition Rules:**
```
active   → {inactive, suspended}
inactive → {active}
suspended → {inactive}  (requires authorization check)
```

**Detalles de implementación:**
- Validate status transition is allowed (see matrix above)
- If closeActiveSessions=true: terminate all open sessions immediately
- Log status change with reason and timestamp
- suspended status: enforced at auth layer (login blocked)
- Closed sessions: user notified (optional email)
- All changes audit logged with actor ID
- Permissions: authenticated owner/admin
- RPC enforces self-deactivation prevention

**Action signature & implementation:**
```typescript
interface ToggleUserStatusParams {
  userId: string;
  newStatus: 'active' | 'inactive' | 'suspended';
  reason?: string;
  closeActiveSessions?: boolean;
}

interface ToggleUserStatusResult {
  success: boolean;
  previousStatus?: string;
  newStatus?: string;
  closedSessionsCount?: number;
  error?: string;
}

export async function toggleUserStatus(
  params: ToggleUserStatusParams
): Promise<ToggleUserStatusResult> {
  // Get current user for validation
  const currentUser = await getCurrentUser();

  // RPC enforces self-deactivation prevention
  const { data, error } = await supabase
    .rpc('rpc_admin_deactivate_user', {
      p_user_id: params.userId,
      p_new_status: params.newStatus,
      p_close_active_sessions: params.closeActiveSessions || false,
      p_reason: params.reason || null,
    })
    .single();

  if (error) {
    if (error.message?.includes('cannot deactivate')) {
      return {
        success: false,
        error: 'You do not have permission to change this user\'s status'
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to update user status'
    };
  }

  if (!data.result) {
    return {
      success: false,
      error: data.error || 'Status update failed'
    };
  }

  return {
    success: true,
    previousStatus: data.previous_status,
    newStatus: data.new_status,
    closedSessionsCount: data.sessions_closed_count,
  };
}
```

**UI Status Indicators:**
- Active: Green badge
- Inactive: Gray badge
- Suspended: Red badge with lock icon
- Last sign-in date below name

**Usage in admin panel:**
```typescript
const toggleMutation = useToggleUserStatus();

const handleSuspendUser = async (userId: string) => {
  const result = await toggleMutation.mutateAsync({
    userId,
    newStatus: 'suspended',
    reason: 'Suspicious activity',
    closeActiveSessions: true,
  });

  if (result.success) {
    showToast(`User suspended. ${result.closedSessionsCount} sessions closed.`);
  }
};
```

---

### T-13-06: Server Action — Eliminar usuario (soft delete)

**Archivo:** `app/actions/users/delete-user.ts`

**Descripción:**
Soft-delete user account with cascade cleanup. Sets deleted_at timestamps, closes sessions, and prevents login. Requires email confirmation. IMPLEMENTED: `rpc_admin_delete_user` is production-ready with proper authorization.

**Especificaciones técnicas:**
- RPC: `rpc_admin_delete_user(p_user_id, p_reason?)` — IMPLEMENTED
- Auth: supabase.auth.admin.deleteUser() for auth layer
- Auth: owner, admin role required
- Safety: REQUIRES email confirmation (user must type email exactly)
- Workflow: Close sessions → Delete profile (RPC) → Delete auth user (API)

**IMPORTANT Authorization Rules:**
- Owner ONLY can delete users
- Admin CANNOT delete users
- Cannot delete self
- Cannot undo—soft delete only, requires DB intervention to restore

**Confirmation UI requirement:**
```typescript
// User must type the target user's email to confirm deletion
const ConfirmDeleteSchema = z.object({
  targetUserEmail: z.string().email(),
  confirmationEmail: z.string().email(),
}).refine(
  (data) => data.targetUserEmail === data.confirmationEmail,
  { message: "Email confirmation must match exactly" }
);
```

**RPC: rpc_admin_delete_user — IMPLEMENTED**

```sql
Input Parameters:
  p_user_id uuid (required)
  p_reason text (optional - for audit log)

Output:
  user_id uuid
  result boolean
  deleted_at timestamptz
  error text (nullable)

Notes:
  - Sets profile.deleted_at = now()
  - Sets profile.deleted_by = current_user_id
  - Frees all maintenance_assignments
  - Marks profile.is_active = false
  - Sessions cascade invalid
  - Does NOT delete: related stores, installations, events (audit trail)
```

**Deletion workflow (3-step atomic process):**

```typescript
// Step 1: Close all open sessions (prevent further access)
await supabase.rpc('rpc_admin_deactivate_user', {
  p_user_id: userId,
  p_new_status: 'inactive',
  p_close_active_sessions: true,
  p_reason: 'Account deletion in progress',
});

// Step 2: Soft-delete profile via RPC (marks deleted_at, freed assignments)
const { data: profileData, error: profileError } = await supabase
  .rpc('rpc_admin_delete_user', {
    p_user_id: userId,
    p_reason: reason || 'User requested deletion',
  })
  .single();

if (profileError || !profileData.result) {
  throw new ApiError('Profile deletion failed', 500);
}

// Step 3: Soft-delete auth user (prevents login)
const { error: authError } = await supabase.auth.admin.deleteUser(
  userId,
  true // shouldSoftDelete=true (retention per Supabase policy)
);

if (authError) {
  throw new ApiError('Auth deletion failed', 500);
}

// Step 4: Log deletion event
logAuditEvent({
  action: 'user_deleted',
  userId,
  deletedBy: currentUser.id,
  reason: reason,
  timestamp: now(),
});
```

**Detalles de implementación:**
- Soft-delete only—all user data retained for audit/compliance
- Cannot be undone without manual DB restoration + admin approval
- Confirmation prevents accidental deletion
- All active sessions invalidated immediately
- Maintenance assignments freed (can be reassigned)
- Related entities (stores, devices) keep references (for audit trail)
- Permissions: OWNER ONLY (admin cannot delete users)
- RPC enforces self-deletion prevention
- Email confirmation REQUIRED

**Action signature & implementation:**
```typescript
interface DeleteUserParams {
  userId: string;
  confirmationEmail: string;
  reason?: string;
}

interface DeleteUserResult {
  success: boolean;
  deletedAt?: string;
  sessionsClosedCount?: number;
  error?: string;
}

export async function deleteUser(
  params: DeleteUserParams
): Promise<DeleteUserResult> {
  // Verify current user is owner
  const currentUser = await getCurrentUser();
  if (currentUser.role !== 'owner') {
    return {
      success: false,
      error: 'Only account owner can delete users'
    };
  }

  // Get target user to verify email
  const targetUser = await getUserDetail(params.userId);

  // Verify confirmation email matches
  if (params.confirmationEmail !== targetUser.email) {
    return {
      success: false,
      error: 'Email confirmation does not match'
    };
  }

  // Step 1: Close all sessions
  const deactivateResult = await toggleUserStatus({
    userId: params.userId,
    newStatus: 'inactive',
    closeActiveSessions: true,
    reason: 'Account deletion in progress',
  });

  if (!deactivateResult.success) {
    return {
      success: false,
      error: 'Failed to close user sessions'
    };
  }

  // Step 2: Soft-delete profile
  const { data: profileData, error: profileError } = await supabase
    .rpc('rpc_admin_delete_user', {
      p_user_id: params.userId,
      p_reason: params.reason || 'User requested deletion',
    })
    .single();

  if (profileError || !profileData.result) {
    return {
      success: false,
      error: 'Failed to delete user profile'
    };
  }

  // Step 3: Soft-delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(
    params.userId,
    true
  );

  if (authError) {
    return {
      success: false,
      error: 'Failed to delete authentication record'
    };
  }

  // Log deletion
  logAuditEvent({
    action: 'user_deleted',
    userId: params.userId,
    deletedBy: currentUser.id,
    reason: params.reason,
    timestamp: new Date(),
  });

  return {
    success: true,
    deletedAt: profileData.deleted_at,
    sessionsClosedCount: deactivateResult.closedSessionsCount,
  };
}
```

**UI Pattern with DangerConfirmDialog:**
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const deleteMutation = useDeleteUser();

return (
  <>
    <Button
      variant="destructive"
      onClick={() => setDeleteDialogOpen(true)}
    >
      Delete User
    </Button>

    <DangerConfirmDialog
      isOpen={deleteDialogOpen}
      title="Permanently Delete User"
      description={`Permanently delete ${user.email}. This action cannot be undone without manual database restoration.`}
      confirmationText={user.email}
      actionLabel="Delete Permanently"
      onConfirm={async () => {
        await deleteMutation.mutateAsync({
          userId: user.id,
          confirmationEmail: user.email,
          reason: 'User requested deletion',
        });
      }}
      onCancel={() => setDeleteDialogOpen(false)}
    />
  </>
);
```

---

### T-13-07: Server Action — Resetear contraseña de usuario

**Archivo:** `app/actions/users/reset-user-password.ts`

**Descripción:**
Admin-initiated password reset. Generates recovery link and sends to user email.

**Especificaciones técnicas:**
- API: `supabase.auth.admin.generateLink()`
- Type: 'recovery' (password reset link)
- Auth: owner, admin role required
- Output: Confirmation that email was sent

**Implementation:**

```typescript
export async function resetUserPassword(params: {
  userId: string;
  email: string;
}): Promise<{
  success: boolean;
  resetLinkSent?: boolean;
  error?: string;
}> {
  // Validate user exists
  const user = await getUserDetail(userId); // May throw
  if (user.email !== email) {
    throw new Error('Email mismatch');
  }

  // Generate reset link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    },
  });

  if (error) {
    throw new Error(`Failed to generate reset link: ${error.message}`);
  }

  // Optionally: Use custom email or Supabase built-in
  // Supabase automatically sends email on generateLink()

  // Log action
  logAuditEvent({
    action: 'password_reset_requested',
    userId: userId,
    initiatedBy: currentUser.id,
    timestamp: now(),
  });

  return { success: true, resetLinkSent: true };
}
```

**Detalles de implementación:**
- Reset link valid for 24 hours (Supabase default)
- Email sent automatically by Supabase Auth
- Log all password reset requests
- User receives email with secure recovery link
- Permissions: owner/admin

**Action signature:**
```typescript
export async function resetUserPassword(params: {
  userId: string;
  email: string;
}): Promise<{
  success: boolean;
  resetLinkSent?: boolean;
  error?: string;
}>;
```

---

### T-13-08: Server Action — Verificar acceso de usuario

**Archivo:** `app/actions/users/check-user-access.ts`

**Descripción:**
Verify user's access permissions for a specific resource or scope. Useful for debugging access issues.

**Especificaciones técnicas:**
- RPC: `rpc_user_access_gate` (EXISTENTE)
- Auth: owner, admin role required
- Input: targetUserId, requiredScope
- Output: Access granted boolean + reason

**Implementation:**

```typescript
export async function checkUserAccess(params: {
  targetUserId: string;
  requiredScope: 'web_panel' | 'mobile_installer' | 'stores_manage' | 'users_manage';
}): Promise<{
  hasAccess: boolean;
  reason?: string;
  userRole?: string;
  userStatus?: string;
}> {
  const { data, error } = await supabase.rpc('rpc_user_access_gate', {
    p_required_scope: params.requiredScope,
    p_target_user_id: params.targetUserId,
  });

  if (error) {
    return {
      hasAccess: false,
      reason: error.message,
    };
  }

  // data contains: allowed boolean, reason text, role text
  return {
    hasAccess: data.allowed,
    reason: data.reason,
    userRole: data.role,
    userStatus: data.status,
  };
}
```

**Detalles de implementación:**
- Useful for admin dashboard to diagnose why user can't access feature
- Shows role, status, and specific reason for access denial
- Permissions: owner/admin can check any user

**Action signature:**
```typescript
export async function checkUserAccess(params: {
  targetUserId: string;
  requiredScope: string;
}): Promise<AccessCheckResult>;
```

---

### T-13-09: React Query hooks para users

**Archivo:** `app/hooks/use-users.ts`

**Descripción:**
Custom React Query hooks for user data fetching and mutations with proper caching.

**Implementación:**

```typescript
// Query hooks
export function useUsers(filters: ListUsersFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => listUsers(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useUser(userId: string | null) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => getUserDetail(userId!),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => createUser(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { userId: string; updates: UpdateUserInput }) =>
      updateUser(params.userId, params.updates),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['users', variables.userId],
        });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof toggleUserStatus>[0]) =>
      toggleUserStatus(params),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['users', variables.userId],
        });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof deleteUser>[0]) =>
      deleteUser(params),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.removeQueries({
          queryKey: ['users', variables.userId],
        });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (params: Parameters<typeof resetUserPassword>[0]) =>
      resetUserPassword(params),
  });
}
```

**Caché invalidation strategy:**
- Create/update: invalidate user detail + users list
- Delete: remove user detail query + invalidate list
- Status changes: invalidate detail query

---

### T-13-10: Componente de confirmación de acciones peligrosas

**Archivo:** `app/components/shared/DangerConfirmDialog.tsx`

**Descripción:**
Reusable confirmation dialog for dangerous actions (delete user, decommission device, etc.). Requires explicit text confirmation.

**Props:**
```typescript
interface DangerConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmationText: string; // Text user must type exactly
  actionLabel?: string; // "Delete", "Decommission", etc.
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}
```

**Component implementation:**

```typescript
export function DangerConfirmDialog({
  isOpen,
  title,
  description,
  confirmationText,
  actionLabel = 'Confirm',
  isLoading = false,
  onConfirm,
  onCancel,
}: DangerConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmed = inputValue === confirmationText;

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    await onConfirm();
    setInputValue('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="danger-dialog">
        {/* Warning icon */}
        <div className="warning-header">
          <AlertTriangleIcon className="text-red-600" size={24} />
          <DialogTitle className="text-red-600">{title}</DialogTitle>
        </div>

        {/* Description */}
        <div className="dialog-body">
          <p className="text-sm text-gray-600 mb-4">{description}</p>

          {/* Confirmation input */}
          <div className="confirmation-input">
            <label className="text-sm font-medium">
              Type "{confirmationText}" to confirm:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmationText}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Actions */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            isLoading={isLoading}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Styling:**
- Red accent color (#dc2626) for danger
- Warning icon prominently displayed
- Clear contrast between cancel/confirm buttons
- Input field clearly labeled
- Confirm button disabled until exact text matches

**Usage example:**
```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const deleteUserMutation = useDeleteUser();

const handleDeleteClick = () => {
  setDeleteDialogOpen(true);
};

const handleConfirmDelete = async () => {
  await deleteUserMutation.mutateAsync({
    userId: user.id,
    confirmationEmail: user.email,
  });
  setDeleteDialogOpen(false);
};

return (
  <>
    <Button onClick={handleDeleteClick} variant="destructive">
      Delete User
    </Button>

    <DangerConfirmDialog
      isOpen={deleteDialogOpen}
      title="Delete User"
      description={`You are about to permanently delete ${user.email}. This action cannot be undone.`}
      confirmationText={user.email}
      actionLabel="Delete"
      isLoading={deleteUserMutation.isPending}
      onConfirm={handleConfirmDelete}
      onCancel={() => setDeleteDialogOpen(false)}
    />
  </>
);
```

---

## Criterios de aceptación

- [x] User list displays with proper role and status mapping
- [x] User detail shows full profile + auth metadata + stats + recent activity
- [x] User creation flow creates auth user + profile atomically with rollback
- [x] Profile updates work through existing rpc_upsert_user_profile
- [x] Email changes handled separately via auth admin API
- [x] Status changes properly close sessions if requested
- [x] Delete action soft-deletes with email confirmation requirement
- [x] Delete OWNER ONLY—admin cannot delete users
- [x] Password reset sends secure recovery email
- [x] Access gate verification helps debug permission issues
- [x] React Query hooks properly invalidate cache
- [x] All backend RPCs IMPLEMENTED and production-ready (not pending)
- [x] DangerConfirmDialog blocks action until exact email matched
- [x] No direct auth.users or profiles table access
- [x] Proper error handling with meaningful messages
- [x] Audit logging for all sensitive actions (create, update, delete, status)
- [x] Authorization checks prevent self-deactivation
- [x] Authorization checks prevent admin from deleting users

## Dependencias

- **Etapa 01:** Type definitions (UserDetail, UserListItem, etc.)
- **Etapa 02:** Authentication helpers (getCurrentUser, requireAuth, etc.)
- **Etapa 07-08:** User pages UI components
- **Supabase Auth Admin API:** for user creation/updates
- **React Query:** useQuery, useMutation
- **Zod:** Validation schemas
- **Dialog/UI components:** shadcn/ui or custom

## Notas de implementación

1. **RPC Status:** ALL RPCs IMPLEMENTED AND PRODUCTION-READY. No pending backend features.
2. **Auth + Profile consistency:** Wrap user creation in 3-step atomic flow:
   - supabase.auth.admin.createUser() → rpc_upsert_user_profile() → logAuditEvent()
   - Rollback auth.users if profile creation fails
3. **Email updates:** Require verification—send confirmation link to new address via Supabase Auth
4. **Password management:** Never expose passwords in logs, responses, or emails (only reset links)
5. **Session management:** Track login/logout for activity auditing and last_sign_in_at
6. **Soft deletes:** Retained indefinitely for compliance—only delete with owner approval
7. **Permissions escalation:** RPC prevents users from granting themselves higher roles
8. **Audit trail:** All mutations logged with timestamp + actor_id + reason + result
9. **Rate limiting:** Implement on password reset and user creation endpoints
10. **Authorization hierarchy:**
    - Owner > Admin > Manager > Installer > Viewer
    - Only owner can delete users
    - Only owner can deactivate owner
    - Admin cannot deactivate or delete anyone
    - Self-deactivation prevented at RPC level
11. **Suspended status:** Enforced at auth layer—login blocked, all tokens invalid
12. **Activity tracking:** Recent activity jsonb updated with each significant action
13. **2FA consideration:** Plan for two-factor authentication in future phases
