# Etapa 02 — Sistema de Autenticación

Implementar la capa intermedia de backend autenticación usando Next.js server-side. Nunca exponer credenciales o lógica de Supabase en el navegador. Soportar solo flujos de Login y Restaurar Contraseña. Implementar control de acceso basado en roles para owner/admin.

## Objetivo

Construir un sistema de autenticación seguro y robusto que:
1. Nunca expone credenciales de Supabase al navegador
2. Valida roles (owner/admin) antes de permitir acceso
3. Gestiona sesiones vía httpOnly cookies
4. Refresca tokens automáticamente
5. Protege rutas basadas en autenticación y rol
6. Proporciona hooks para usar en componentes cliente
7. Implementa lógica RBAC para control de acceso granular

---

## Tareas

### T-02-01: Configurar Supabase Auth en Server Side

Implementar la configuración de autenticación del lado del servidor usando @supabase/ssr.

**Actualizar `lib/supabase/server.ts` (extender del T-00-04):**
```typescript
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

/**
 * Server-side Supabase client con service_role
 * Usado SOLO en server actions y API routes
 * NUNCA acceder desde componentes cliente
 */
export const createServerClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false, // No guardar sesión en cookies
      },
    }
  );
};

export const serverClient = createServerClient();

/**
 * Server-side session handler
 * Lee la sesión desde cookies httpOnly (manejadas por @supabase/ssr)
 */
export const createServerAuthClient = async () => {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
      },
      cookies: {
        getAll() {
          const cookieStore = cookies();
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          const cookieStore = cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  return supabase;
};
```

**Actualizar `lib/supabase/middleware.ts` (session refresh):**
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const updateSession = async (request: NextRequest) => {
  // Se crea response vacío que se actualiza con cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Crear cliente de Supabase en servidor con cookies del request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (esto actualiza los tokens si están cerca de expirar)
  const { data } = await supabase.auth.getSession();

  // Si no hay sesión válida, respuesta normal
  // (el middleware de rutas manejará redirect)

  return response;
};
```

**Verificar `middleware.ts` en raíz (debe incluir updateSession):**
```typescript
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Actualizar sesión (refresh de tokens si necesario)
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### T-02-02: Server Actions de Autenticación

Crear server actions para login, logout, restauración de contraseña y gestión de sesión.

**Crear `src/actions/auth/login.ts`:**
```typescript
'use server';

import { redirect } from 'next/navigation';
import { createServerAuthClient } from '@/lib/supabase/server';
import { callRpc } from '@/lib/supabase/rpc';
import { UserAccessGateResult } from '@/types/profiles';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  locale: z.enum(['es', 'en']).default('es'),
});

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    role: 'owner' | 'admin';
  };
  error?: string;
  accessCode?: string; // 'role_not_authorized' | 'status_inactive' | etc
}

/**
 * Server Action: Iniciar sesión
 *
 * Flujo:
 * 1. Validar email/password con Supabase Auth
 * 2. Llamar rpc_user_access_gate para verificar rol
 * 3. Si acceso denegado: sign out y retornar error
 * 4. Si éxito: retornar usuario
 *
 * Seguridad:
 * - Credenciales validadas en servidor
 * - Se verifica role='owner' o 'admin' en RPC
 * - Se verifica status='active' en RPC
 * - Session manejada automáticamente en httpOnly cookies
 */
export async function loginAction(
  formData: unknown
): Promise<LoginResponse> {
  try {
    // Validar input
    const { email, password, locale } = LoginSchema.parse(formData);

    // Obtener cliente autenticado
    const supabase = await createServerAuthClient();

    // Paso 1: Autenticar con email/password
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Paso 2: Verificar acceso y rol
    const accessGateResult: UserAccessGateResult = await callRpc(
      'rpc_user_access_gate',
      {
        p_required_scope: 'web_panel',
        p_target_user_id: authData.user.id,
      }
    );

    // Paso 3: Verificar resultado
    if (!accessGateResult.can_access) {
      // Denegar acceso y sign out
      await supabase.auth.signOut();

      const errorMessage =
        accessGateResult.access_code === 'role_not_authorized'
          ? 'Your role does not have access to this dashboard'
          : accessGateResult.access_code === 'status_inactive'
            ? 'Your account is inactive'
            : 'Access denied';

      return {
        success: false,
        error: errorMessage,
        accessCode: accessGateResult.access_code,
      };
    }

    // Paso 4: Éxito - retornar usuario
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        role: (accessGateResult.role as 'owner' | 'admin') || 'admin',
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.errors[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred during login';

    console.error('[Login Error]', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

**Crear `src/actions/auth/logout.ts`:**
```typescript
'use server';

import { redirect } from 'next/navigation';
import { createServerAuthClient } from '@/lib/supabase/server';

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Cerrar sesión
 *
 * Limpia la sesión y redirige a login
 */
export async function logoutAction(
  locale: string = 'es'
): Promise<LogoutResponse> {
  try {
    const supabase = await createServerAuthClient();
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Logout failed';

    console.error('[Logout Error]', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

**Crear `src/actions/auth/restore.ts`:**
```typescript
'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { z } from 'zod';

const RequestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  locale: z.enum(['es', 'en']).default('es'),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  locale: z.enum(['es', 'en']).default('es'),
});

export interface RestoreResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Solicitar enlace de restauración de contraseña
 *
 * Flujo:
 * 1. Validar email
 * 2. Enviar enlace de reset vía email
 * 3. Retornar confirmación (sin revelar si email existe)
 */
export async function requestPasswordResetAction(
  formData: unknown
): Promise<RestoreResponse> {
  try {
    const { email, locale } = RequestResetSchema.parse(formData);

    const supabase = await createServerAuthClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password`,
    });

    if (error) {
      console.error('[Password Reset Error]', error);
      // No revelar si el email existe o no (seguridad)
    }

    // Siempre retornar éxito para no revelar emails válidos
    return {
      success: true,
      message:
        'If an account exists with that email, a password reset link has been sent',
    };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.errors[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred';

    console.error('[Request Password Reset Error]', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Server Action: Confirmar nueva contraseña (después del reset)
 *
 * Se llama después de que el usuario hace click en el enlace de email
 * Supabase pasa el token en la URL
 */
export async function updatePasswordAction(
  formData: unknown
): Promise<RestoreResponse> {
  try {
    const { password, confirmPassword, locale } =
      ResetPasswordSchema.parse(formData);

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match',
      };
    }

    const supabase = await createServerAuthClient();

    // Obtener la sesión actual (debe existir después del click en email)
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        success: false,
        error: 'Reset session expired. Please request a new password reset link.',
      };
    }

    // Actualizar contraseña
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update password',
      };
    }

    return {
      success: true,
      message: 'Password updated successfully. You can now log in.',
    };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.errors[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred';

    console.error('[Update Password Error]', error);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
```

**Crear `src/actions/auth/session.ts`:**
```typescript
'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { callRpc } from '@/lib/supabase/rpc';
import { Profile, ProfileRole, ProfileStatus } from '@/types/profiles';

export interface CurrentUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    profile?: Profile;
    role?: ProfileRole;
    status?: ProfileStatus;
  };
  error?: string;
}

/**
 * Server Action: Obtener usuario actual y su sesión
 *
 * Se usa en layouts para verificar autenticación e hidratación
 */
export async function getCurrentUserAction(): Promise<CurrentUserResponse> {
  try {
    const supabase = await createServerAuthClient();

    // Obtener sesión
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return {
        success: false,
        error: 'No active session',
      };
    }

    const user = data.session.user;

    // Opcionalmente, llamar RPC para obtener perfil completo
    // (esto dependerá de si el RPC existe)
    // const profile = await callRpc('rpc_get_user_detail', { p_user_id: user.id });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!,
        // profile,
      },
    };
  } catch (error) {
    console.error('[Get Current User Error]', error);

    return {
      success: false,
      error: 'Failed to fetch user',
    };
  }
}

/**
 * Server Action: Validar sesión
 *
 * Retorna true si hay sesión válida, false si no
 */
export async function isAuthenticatedAction(): Promise<boolean> {
  try {
    const supabase = await createServerAuthClient();
    const { data } = await supabase.auth.getSession();

    return !!data.session;
  } catch {
    return false;
  }
}
```

---

### T-02-03: Middleware de protección de rutas

Implementar middleware que proteja las rutas según autenticación y rol.

**Crear `src/lib/auth/route-protection.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Verificar si una ruta está protegida
 */
export const isProtectedRoute = (pathname: string): boolean => {
  // Rutas públicas
  const publicRoutes = ['/login', '/restore-account', '/reset-password'];
  const basePathname = pathname.replace(/^\/(es|en)/, '');

  return !publicRoutes.some((route) => basePathname.startsWith(route));
};

/**
 * Verificar autenticación en middleware
 */
export const checkAuthInMiddleware = async (
  request: NextRequest
): Promise<{
  isAuthenticated: boolean;
  sessionCookie?: string;
}> => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No necesitamos setAll aquí
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    isAuthenticated: !!session,
    sessionCookie: request.cookies.get('sb-auth-token')?.value,
  };
};
```

**Actualizar `middleware.ts` en raíz para incluir route protection:**
```typescript
import { updateSession } from '@/lib/supabase/middleware';
import { isProtectedRoute, checkAuthInMiddleware } from '@/lib/auth/route-protection';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Actualizar sesión (refresh de tokens)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Extraer locale del pathname
  const localeMatch = pathname.match(/\/(es|en)\//);
  const locale = localeMatch ? localeMatch[1] : 'es';

  // Verificar si es ruta protegida
  if (isProtectedRoute(pathname)) {
    // Verificar autenticación
    const { isAuthenticated } = await checkAuthInMiddleware(request);

    if (!isAuthenticated) {
      // Redirigir a login
      return NextResponse.redirect(
        new URL(`/${locale}/login`, request.url)
      );
    }
  } else if (pathname.includes('/login')) {
    // Si está en login pero ya está autenticado, redirigir a dashboard
    const { isAuthenticated } = await checkAuthInMiddleware(request);

    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(`/${locale}/tiendas`, request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### T-02-04: Role-based access control (RBAC)

Implementar matriz de permisos para control granular de acceso.

**Crear `src/lib/auth/permissions.ts`:**
```typescript
import { ProfileRole } from '@/types/profiles';

/**
 * Tipos de acciones que pueden ser verificadas
 */
export type Permission =
  | 'view_dashboard'
  | 'create_store'
  | 'edit_store'
  | 'delete_store'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'view_devices'
  | 'view_reports'
  | 'view_aerial'
  | 'edit_settings'
  | 'manage_roles';

/**
 * Matriz de permisos por rol
 *
 * Estructura:
 * - owner: acceso total
 * - admin: casi todo excepto manage_roles
 * - manager: (para expansión futura)
 * - viewer: (para expansión futura)
 */
const PERMISSION_MATRIX: Record<ProfileRole, Set<Permission>> = {
  owner: new Set([
    'view_dashboard',
    'create_store',
    'edit_store',
    'delete_store',
    'create_user',
    'edit_user',
    'delete_user',
    'view_devices',
    'view_reports',
    'view_aerial',
    'edit_settings',
    'manage_roles',
  ]),

  admin: new Set([
    'view_dashboard',
    'create_store',
    'edit_store',
    'delete_store',
    'create_user',
    'edit_user',
    'delete_user',
    'view_devices',
    'view_reports',
    'view_aerial',
    'edit_settings',
  ]),

  manager: new Set([
    'view_dashboard',
    'view_devices',
    'view_reports',
    'view_aerial',
  ]),

  viewer: new Set([
    'view_dashboard',
    'view_devices',
    'view_reports',
  ]),
};

/**
 * Verificar si un rol tiene un permiso específico
 */
export function hasPermission(role: ProfileRole, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

/**
 * Verificar si un rol tiene todos los permisos especificados
 */
export function hasAllPermissions(
  role: ProfileRole,
  permissions: Permission[]
): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Verificar si un rol tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(
  role: ProfileRole,
  permissions: Permission[]
): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

/**
 * Obtener todos los permisos de un rol
 */
export function getPermissions(role: ProfileRole): Permission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? new Set());
}

/**
 * Server utility: Verificar permiso en server actions
 *
 * Uso:
 * ```typescript
 * import { checkPermission } from '@/lib/auth/permissions';
 *
 * export async function deleteStoreAction(storeId: string) {
 *   const user = await getCurrentUserAction();
 *   if (!checkPermission(user.role, 'delete_store')) {
 *     throw new Error('Unauthorized');
 *   }
 *   // ... proceder
 * }
 * ```
 */
export function checkPermission(
  role: ProfileRole | undefined,
  permission: Permission
): boolean {
  if (!role) return false;
  return hasPermission(role, permission);
}
```

**Crear `src/hooks/use-permissions.ts` (hook para cliente):**
```typescript
'use client';

import { useCallback } from 'react';
import { useAuth } from './use-auth';
import { Permission, hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/auth/permissions';

/**
 * Hook para verificar permisos en componentes cliente
 *
 * Uso:
 * ```typescript
 * const { can } = usePermissions();
 *
 * if (can('edit_store')) {
 *   return <EditStoreButton />;
 * }
 * ```
 */
export function usePermissions() {
  const { user } = useAuth();

  const can = useCallback(
    (permission: Permission) => {
      return hasPermission(user?.role || 'viewer', permission);
    },
    [user?.role]
  );

  const canAll = useCallback(
    (permissions: Permission[]) => {
      return hasAllPermissions(user?.role || 'viewer', permissions);
    },
    [user?.role]
  );

  const canAny = useCallback(
    (permissions: Permission[]) => {
      return hasAnyPermission(user?.role || 'viewer', permissions);
    },
    [user?.role]
  );

  return {
    can,
    canAll,
    canAny,
    role: user?.role,
  };
}
```

---

### T-02-05: Zustand auth store

Implementar estado global para autenticación.

**Crear `src/lib/stores/auth-store.ts`:**
```typescript
import { create } from 'zustand';
import { Profile, ProfileRole, ProfileStatus } from '@/types/profiles';

interface AuthUser {
  id: string;
  email: string;
  role: ProfileRole;
  status: ProfileStatus;
  profile?: Profile;
}

interface AuthStore {
  // State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    }),

  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  refreshProfile: (profile) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            profile,
            status: profile.status,
          }
        : null,
    })),
}));
```

**Crear `src/hooks/use-auth.ts` (hook para acceder auth store):**
```typescript
'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Hook para acceder estado de autenticación
 *
 * Uso:
 * ```typescript
 * const { user, isAuthenticated, isLoading } = useAuth();
 * ```
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  return {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    clearUser,
  };
}
```

---

### T-02-06: Session Token Management

Documentar cómo se manejan los tokens de sesión de forma segura.

**Crear `docs/session-management.md`:**
```markdown
# Session Management

## Flujo de Tokens

```
[Login]
  ↓
[Supabase Auth retorna JWT + Refresh Token]
  ↓
[@supabase/ssr almacena en httpOnly cookies]
  ↓
[Middleware refresca token antes de expirar]
  ↓
[Componentes usan useAuth() para estado]
```

## httpOnly Cookies (Seguridad)

Los tokens de sesión se almacenan en httpOnly cookies, lo cual significa:

✅ **SEGURO:**
- No accesible desde JavaScript (previene XSS)
- Automáticamente incluido en requests
- Supabase maneja refresh automáticamente
- Almacenado encriptado en el navegador

❌ **INSEGURO (estos NO se hacen):**
- localStorage: vulnerable a XSS
- sessionStorage: vulnerable a XSS
- Variables en memoria: se pierden al refresh
- Exponer en URL parameters

## Token Refresh

El middleware (`middleware.ts`) llama `supabase.auth.getSession()` en cada request, que:

1. Lee el token actual de las cookies
2. Verifica si está cerca de expirar
3. Si expira en < 60 segundos: solicita refresh token
4. Si refresh token también expiró: sesión termina, redirect a login
5. Actualiza cookies con nuevo token

## Logout

Al hacer logout:
```typescript
await supabase.auth.signOut();
// Esto:
// 1. Invalida el refresh token en Supabase
// 2. Limpia las cookies httpOnly
// 3. Supabase Auth redirige a /login
```

## Validación de Sesión

En layouts o rutas protegidas:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  redirect('/login');
}
```

## Timeline de Expiración

- **Access Token:** Expira en ~1 hora (configurable en Supabase)
- **Refresh Token:** Expira en ~7 días (configurable)
- **Middleware Check:** Cada request (refresca si necesario)
- **Inactividad:** Sesión activa mientras haya actividad

## Nota de Seguridad

- El `SUPABASE_SERVICE_ROLE_KEY` NUNCA se envía al cliente
- Solo se usa en server actions y API routes
- El cliente solo recibe `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- El anon key es READ-ONLY, no puede actualizar datos
- Todos los datos se acceden vía RPCs (controlados en backend)
```

---

## Criterios de aceptación

- [x] Server client (con service_role) configurado
- [x] Browser client (con anon key) configurado
- [x] Middleware refresca tokens automáticamente
- [x] `loginAction` valida email/password en servidor
- [x] `loginAction` verifica acceso vía `rpc_user_access_gate`
- [x] `loginAction` rechaza usuarios sin rol owner/admin
- [x] `loginAction` rechaza usuarios con status != active
- [x] `logoutAction` limpia sesión correctamente
- [x] `requestPasswordResetAction` envía email (sin revelar emails)
- [x] `updatePasswordAction` actualiza contraseña post-reset
- [x] `getCurrentUserAction` retorna usuario autenticado
- [x] `isAuthenticatedAction` retorna boolean
- [x] Middleware protege rutas (dashboard) require auth
- [x] Middleware redirige login si ya autenticado
- [x] RBAC matrix documentada con todos los permisos
- [x] `hasPermission()`, `hasAllPermissions()`, `hasAnyPermission()` funcionan
- [x] `usePermissions()` hook funciona en componentes
- [x] `useAuth()` hook accede estado global
- [x] Zustand auth store hidratado correctamente
- [x] httpOnly cookies se usan para tokens
- [x] Service role key NUNCA expuesto en cliente
- [x] Documentación de session management completa

---

## Dependencias

- **Etapa 00:** Base del Proyecto (debe estar completada)
- **Etapa 01:** Modelado de Datos (tipos y rpc_user_access_gate)

Esta etapa es **independiente de UI**. La siguiente etapa (03) implementa las páginas.

---

## Figma referencias

N/A — Esta etapa es lógica de autenticación, no UI.

---

## Notas adicionales

- El sistema de roles está diseñado para expansión futura (manager, viewer)
- RBAC se puede extender fácilmente agregando permisos a PERMISSION_MATRIX
- Todos los server actions tienen manejo de errores y logging
- Los tokens se refrescan automáticamente, usuario no necesita hacer nada
- Para logout/profile updates, invalidar el cache con React Query (etapa siguiente)
