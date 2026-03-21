# Arcaxo Admin Dashboard — Progress Tracker

## Estado actual: Etapa 03 ✅ COMPLETADA

**Fecha:** 2026-03-21

---

## Etapas completadas

### ✅ Etapa 00 — Base del Proyecto
**Commit:** `feat: initialize Arcaxo Admin Dashboard — Etapa 00 base project`

Stack instalado: Next.js 16.2.1, React 19.2.4, TypeScript 5, Tailwind v4, shadcn/ui, Zod v4, Supabase, Zustand v5, React Query v5, next-intl v4, react-hook-form, Poppins font.

---

### ✅ Etapa 01 — Modelado de Datos y RPCs
**Commit:** `feat: Etapa 01 — data modeling, entity types, and typed RPC helpers`

**Archivos creados:**
- `src/types/entities.ts` — todas las entidades del dominio (Store, Profile, Sensor, Geography, Sessions, Maintenance)
- `src/types/rpc-inputs.ts` — inputs para todos los RPCs (50+ RPCs, 5 dominios)
- `src/types/rpc-outputs.ts` — outputs para todos los RPCs
- `src/types/database.ts` — todos los enums del backend (ProfileRole, StoreStatus, SensorInstallStatus, etc.)
- `src/lib/supabase/rpc.ts` — helpers tipados por dominio
- `docs/rpc-reference.md` — documentación completa de RPCs

---

### ✅ Etapa 02 — Sistema de Autenticación
**Commit:** `feat: Etapa 02 — auth system route protection, session management, i18n keys`

**Archivos creados/actualizados:**
- `src/lib/auth/route-protection.ts` — helpers `isProtectedRoute()` y `checkAuthInProxy()`
- `src/proxy.ts` — usa route-protection module (Next.js 16: proxy, no middleware)
- `docs/session-management.md` — documentación de tokens y seguridad
- `src/messages/{es,en}.json` — claves i18n completas para auth pages

**Nota:** La mayoría de la lógica de autenticación (server actions, Zustand store, RBAC, proxy route protection) fue implementada en Etapa 00.

---

### ✅ Etapa 03 — Páginas de Autenticación
**Commit:** `feat: Etapa 03 — auth pages UI (login, restore-account, reset-password)`

**Archivos creados:**
- `src/components/auth/login-card.tsx` — card container (380px, shadow, rounded-12)
- `src/components/auth/form-input.tsx` — input con estado error/focus
- `src/components/auth/password-input.tsx` — input password con toggle show/hide
- `src/components/auth/primary-button.tsx` — botón primario #0000FF
- `src/components/auth/secondary-button.tsx` — botón secundario border
- `src/components/auth/error-message.tsx` — mensaje error #FF4163
- `src/components/auth/success-message.tsx` — mensaje éxito #228D70
- `src/app/[locale]/(auth)/layout.tsx` — layout auth (redirige si ya autenticado)
- `src/app/[locale]/(auth)/login/page.tsx` — página login
- `src/app/[locale]/(auth)/restore-account/page.tsx` — solicitar reset de contraseña
- `src/app/[locale]/(auth)/reset-password/page.tsx` — establecer nueva contraseña
- `docs/auth-flow.md` — documentación del flujo de autenticación

**Diseño Figma aplicado:**
- Poppins SemiBold 25px títulos, Regular labels, Medium botones
- Card: 380px, p-10, rounded-12, shadow 0px 2px 8px rgba(0,0,0,0.1)
- Inputs: h-50px, border-2 #D0D5DD, focus border #0000FF, error border #FF4163
- Botón primary: h-50px, bg #0000FF, hover #0000CC
- Background: #FBFBFF

---

## Próxima etapa: Etapa 04 — Skeleton de Páginas

**Figma:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2429

**Componentes a crear:**
1. `src/app/[locale]/(dashboard)/layout.tsx` — layout con Navbar + Sidebar + main area
2. `src/components/layout/Navbar.tsx` — fixed top h-80px, logo, hamburger, bell, avatar
3. `src/components/layout/Sidebar.tsx` — fixed left w-317px, nav items con active state
4. `src/components/layout/Breadcrumb.tsx` — logo mini + sección actual
5. `src/components/layout/PageActionBar.tsx` — barra de acciones (botón primario, búsqueda, filtros, reset)
6. `src/components/shared/DataTable.tsx` — tabla genérica con columnas configurables
7. `src/components/shared/Pagination.tsx` — paginación con números de página
8. `src/components/shared/EmptyState.tsx` — estado vacío reutilizable
9. `src/components/shared/TableSkeleton.tsx` — skeleton de loading

**Especificaciones clave:**
- Navbar: h-[80px], bg-white, border-b #E2DFDF
- Sidebar: w-[317px], bg-white, border-r #E2DFDF, item activo border-left 7px #0000FF
- Main content: padding-left 317px, padding-top 80px
- Avatar: 35x35px bg-[#53009C] con inicial del usuario
- Active nav item: color #0000FF, font SemiBold
- Inactive nav item: icon #82A2C2, text black

---

## Etapas pendientes (en orden)

- [x] **00** — Base del Proyecto
- [x] **01** — Modelado de Datos y RPCs
- [x] **02** — Sistema de Autenticación
- [x] **03** — Páginas de Autenticación
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

---

## Notas técnicas acumuladas

- Next.js 16: `proxy.ts` (no `middleware.ts`), `params` es async → `use(params)` en client components, `await params` en server components
- Zod v4: `.issues[0]?.message` (no `.errors`)
- TypeScript enums: exportar como valor, no `export type`
- Tailwind v4: `@theme inline` con nombres literales de fuente
- Poppins via next/font/google, variable en `<html>` tag
- ProfileRole/ProfileStatus: SCREAMING_SNAKE_CASE (ej: `ProfileStatus.ACTIVE`)
- RPC helper usa `client.rpc(name as any, params as any)` para bypass type placeholder
