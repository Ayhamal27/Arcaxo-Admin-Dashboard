# Arcaxo Admin Dashboard — Progress Tracker

## Estado actual: Etapa 00 ✅ COMPLETADA

**Fecha:** 2026-03-21
**Commit:** `feat: initialize Arcaxo Admin Dashboard — Etapa 00 base project`

---

## Etapas completadas

### ✅ Etapa 00 — Base del Proyecto (COMPLETA)

**Stack instalado:**
- Next.js 16.2.1 (Turbopack, App Router) — usa `proxy.ts` en lugar de `middleware.ts`
- React 19.2.4
- TypeScript 5 (strict mode)
- Tailwind CSS v4 + shadcn/ui 4.1.0
- Zod v4 (usa `.issues` en lugar de `.errors`)
- @supabase/supabase-js + @supabase/ssr
- Zustand v5 + @tanstack/react-query v5
- next-intl v4 (usa `defineRouting` + `getRequestConfig`)
- react-hook-form + @hookform/resolvers
- lucide-react + clsx + tailwind-merge + class-variance-authority
- date-fns v4

**Archivos clave creados:**
- `src/proxy.ts` — Route protection (Next.js 16: proxy, no middleware)
- `src/lib/supabase/server.ts` — Server client (service_role, lazy singleton)
- `src/lib/supabase/client.ts` — Browser client (anon key)
- `src/lib/supabase/middleware.ts` — Session refresh helper
- `src/lib/supabase/rpc.ts` — Generic RPC caller
- `src/lib/stores/auth-store.ts` — Zustand auth state
- `src/lib/auth/permissions.ts` — RBAC matrix (owner/admin/manager/viewer)
- `src/hooks/use-auth.ts` + `use-permissions.ts`
- `src/actions/auth/{login,logout,restore,session}.ts` — Server actions
- `src/types/database.ts` + `src/types/profiles.ts` — TypeScript types
- `src/messages/{es,en}.json` — i18n translations
- `src/i18n/routing.ts` + `src/i18n/request.ts` — next-intl config
- `src/app/[locale]/layout.tsx` — Locale-aware root layout
- `src/app/[locale]/(auth)/layout.tsx` + login/page.tsx — Auth group placeholder
- `src/app/[locale]/(dashboard)/layout.tsx` + tiendas/page.tsx — Dashboard group placeholder
- `src/constants.ts` — App constants
- `.env.example`, `Dockerfile`, `.dockerignore`, `.prettierrc.json`, `.gitignore`

**Notas técnicas importantes:**
- Next.js 16 usa `proxy.ts` (exporta función `proxy`, no `middleware`)
- Zod v4: `.issues[0]?.message` (no `.errors`)
- Enums TypeScript exportados como valor (no `export type`)
- RPC helper usa `client.rpc(name as any, params as any)` para evitar conflicto de tipos con Database placeholder
- next-intl v4: usa `defineRouting()` y `getRequestConfig()`, no `createMiddleware`
- Tailwind v4: `@theme inline` con nombres literales (no referencias a CSS vars)
- Poppins font en lugar de Geist (diseño Figma)

---

## Próxima etapa: Etapa 01 — Modelado de Datos y RPCs

**Lo que falta hacer:**
1. Leer los archivos en `/supabase-ref-docs/` para entender la estructura exacta de tablas y RPCs
2. Crear `src/types/database.ts` completo con tipos generados de Supabase (reemplazar el placeholder actual)
3. Crear tipos completos en:
   - `src/types/stores.ts`
   - `src/types/sensors.ts`
   - `src/types/geography.ts`
   - `src/types/sessions.ts`
4. Documentar todas las RPCs disponibles en el backend
5. Extender el helper `callRpc` con tipos seguros por RPC

**Archivos de referencia clave:**
- `/supabase-ref-docs/stores.md`
- `/supabase-ref-docs/profiles.md`
- `/supabase-ref-docs/geography.md`
- `/supabase-ref-docs/sensors.md`
- `/supabase-ref-docs/sessions.md`
- `/supabase-ref-docs/maintenance.md`
- `/supabase-ref-docs/installer_locations.md`

---

## Etapas pendientes (en orden)

- [ ] **01** — Modelado de Datos y RPCs de Supabase
- [ ] **02** — Sistema de Autenticación (parcialmente completo en Etapa 00)
- [ ] **03** — Páginas de Autenticación (Login, Restore, Reset)
- [ ] **04** — Skeleton de Páginas (Sidebar, Navbar, Breadcrumb, DataTable)
- [ ] **05** — Tiendas (listado con tabla)
- [ ] **06** — Nueva Tienda (formulario)
- [ ] **07** — Usuarios (listado)
- [ ] **08** — Nuevo Usuario (formulario)
- [ ] **09** — Dispositivos (listado)
- [ ] **10** — Vista Aérea (mapa Google Maps)
- [ ] **11** — Lógica de páginas de Tiendas
- [ ] **12** — Lógica de páginas de Dispositivos
- [ ] **13** — Lógica de páginas de Usuarios
