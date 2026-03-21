# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run lint      # ESLint
npm run format    # Prettier formatting
```

No test runner is configured.

## Architecture Overview

Next.js 16 admin dashboard with Supabase backend, built around locale-based routing and RPC-only data access.

### Routing

All routes live under `src/app/[locale]/`:
- `(auth)/` — Public routes: login, reset-password, restore-account
- `(dashboard)/` — Protected routes: stores, users, devices, aerial, reports, settings

Default locale is `es` (prefix `as-needed`, so `/stores` = Spanish, `/en/stores` = English).

### Proxy vs Middleware

The project uses **`src/proxy.ts`** (not `middleware.ts`) for route-level logic. It handles Supabase session refresh, locale extraction, and redirect logic (unauthenticated → login, authenticated on /login → /stores).

### Data Layer: RPC-Only

All database operations go through typed Supabase RPCs — never direct table queries from the frontend.

```
Client component
  → useQuery({ queryFn: () => someAction() })       # React Query
  → src/actions/domain/action.ts (Server Action)    # 'use server'
  → src/lib/supabase/rpc.ts (callRpc wrapper)       # Typed RPC
  → Supabase rpc_function_name()                    # DB function
```

RPC input/output types live in `src/types/rpc-inputs.ts` and `src/types/rpc-outputs.ts`.

### Authentication & Permissions

- Supabase Auth with httpOnly cookies via `@supabase/ssr`
- Login calls `rpc_user_access_gate` to verify role; result stored in Zustand auth store
- Two server clients: **anon** (for auth context) and **service_role** (for RPC calls from server actions)
- Roles: `owner > admin > manager > viewer`, plus `store_owner` and `installer`
- Permission matrix: `src/lib/auth/permissions.ts` — use `hasPermission()` hooks

### State Management

- **Zustand** (`src/lib/stores/`): auth state, plus per-page filter/pagination state (stores, users, sensors)
- **React Query** (`src/components/providers/QueryProvider.tsx`): client-side fetching; staleTime 30s, retry 1

### Internationalization

next-intl v4. Translation files: `src/messages/es.json` and `en.json`.

```typescript
// Server components
const t = await getTranslations('namespace');

// Client components
const t = useTranslations('namespace');
```

Always add keys to both locale files when adding UI text.

### Forms & Validation

React Hook Form + Zod v4. Note: Zod v4 uses `.issues` (not `.errors`) on `ZodError`. Enum types must be exported explicitly when used outside the schema file.

### Key Tech Quirks

- **Zod v4**: error property is `.issues`, not `.errors`
- **Next.js 16**: use `proxy.ts` export, not `middleware.ts`
- **React Query v5**: `useQuery` options changed from v4 (no `onSuccess` callback; use `useEffect` on `data`)
- **Tailwind CSS v4**: config is inline in `src/app/globals.css`, not `tailwind.config.ts`

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          # server-only, never expose to browser
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_APP_VERSION
```

### UI Components

shadcn/ui with `base-nova` style. Add components via `npx shadcn@latest add <component>`. Icons from `lucide-react`.

### Code Style

Prettier: single quotes, 2-space indent, 100 char print width, trailing commas (es5), semicolons on.
