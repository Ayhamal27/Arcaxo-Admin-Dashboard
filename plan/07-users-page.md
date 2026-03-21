# Etapa 07 — Página de Usuarios

## Objetivo
Build the Users section: listing page with data table showing all users with their roles, stats, and actions.

## Figma References
- Users page: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=186-4832

## Design Specs (from Figma)
- Breadcrumb: arcaxo/ > Usuarios
- Action bar: "+ Nueva Usuario" button (primary blue) + Search input
- Table columns: Usuario (avatar + name) | Rol (colored badge) | Dispositivos instalados | Tiendas instaladas | Telefono | Zona | Acciones (Ampliar + edit + phone)
- Role badges with colors:
  - Administrador: blue bg
  - Instalador: dark blue bg
  - Estadista: pink/magenta bg
  - Operador: light purple bg
- Avatar: 35px circle with colored background and initial
- Row actions: "Ampliar" outlined button + edit icon + phone blue button
- Pagination: same as stores

## Tareas

### T-07-01: Página de listado de usuarios
- Route: `/[locale]/(dashboard)/usuarios/page.tsx`
- Server component, uses DataTable from stage 04
- Search, pagination

**RPC EXISTENTE:** `rpc_admin_list_users`
- Input:
  - `p_page` (int): página (1-indexed)
  - `p_page_size` (int): elementos por página
  - `p_search` (text, optional): ILIKE búsqueda en first_name/last_name/email
  - `p_filter_role` (text, optional): filtrar por rol
  - `p_filter_status` (text, optional): filtrar por estado
  - `p_sort_by` (text): updated_at, first_name, last_name, email, role, status
  - `p_sort_order` (text): asc, desc
- Output: user_id, first_name, last_name, email, role, status, agent_scope, phone_country_code, phone_number, city_name, state_name, country_code, devices_installed_count, stores_installed_count, last_sign_in_at, total_count

### T-07-02: Server Actions para listar usuarios
- File: `app/actions/users/list-users.ts`
- Calls `rpc_admin_list_users` (or fallback if not available yet)
- Returns paginated, filtered, sorted list
- Error handling: wrap in try-catch, return meaningful errors
- Type safety: use TypeScript interfaces matching RPC output
- Input validation: validate pagination params are positive integers, search string is sanitized

### T-07-03: User list item component
- File: `app/components/users/UserListItem.tsx`
- Avatar circle (35px) with initial and role-based background color
- Name: Poppins Regular, 20px, #101820
- Role badge: use RoleBadge component (T-07-04)
- Stats display: device count and store count side-by-side
- Phone number: with country code prefix
- Zone: displays city_name, optional link to maps (future enhancement)
- Actions row:
  - "Ampliar" outlined button (neutral gray border) → links to user detail page
  - Edit icon button (gray, 18px) → links to user edit page (stage 11, future)
  - Phone blue button (#00B2FF) → triggers phone call action or copy-to-clipboard

### T-07-04: Role badge component
- File: `app/components/shared/RoleBadge.tsx`
- Maps role enum to color and label:
  - `owner`: dark blue bg (#0000FF), white text
  - `admin`: blue bg (#0000FF), white text
  - `manager`: purple bg (#7C3AED), white text
  - `installer`: dark indigo bg (#1E40AF), white text
  - `viewer`: grey bg (#9CA3AF), white text
  - `store_owner`: teal bg (#228D70), white text
- Rounded pill shape (rounded-full)
- Poppins Regular, 12px text
- Padding: px-3 py-1
- Reusable across all pages (users, stores, etc.)

### T-07-05: User detail page
- Route: `/[locale]/(dashboard)/usuarios/[userId]/page.tsx`
- Full user profile with tabs or sections:
  - **Personal info**: first name, last name, email, phone, identity document, address, city, state, country
  - **Role & permissions**: current role, assigned permissions (read-only), effective agent scope
  - **Assigned stores**: list of stores this user has access to with installation count per store
  - **Activity history**: login history, last login date, actions log (future: audit trail)

**RPC EXISTENTE:** `rpc_admin_get_user_detail`
- Input: `p_user_id` (UUID)
- Output: todos los campos del perfil de usuario + auth_email, auth_created_at, auth_last_sign_in_at, auth_email_confirmed_at, devices_installed_count, stores_installed_count, active_session_store_id, active_session_type

### T-07-06: Filtros de usuarios
- Filter by role dropdown: owner, admin, manager, viewer, store_owner, installer
- Filter by status dropdown: active, inactive, suspended
- Search by name or email: real-time text input with debounce (300ms)
- URL params sync: filters stored in query params (`?role=admin&status=active&search=john`)
- Filter state managed via URL searchParams (Next.js useSearchParams hook)
- Clear filters button to reset all

## Implementación - Detalles Técnicos

### State Management
- All filtering/pagination state in URL query params
- No client-side state for filters (stateless, URL-driven)
- Use `useSearchParams` and `useRouter` for navigation

### Data Table Integration
- Reuse DataTable component from stage 04
- Columns: Usuario | Rol | Dispositivos | Tiendas | Teléfono | Zona | Acciones
- Sortable columns: Usuario, Rol, Dispositivos, Teléfono
- Row height: 64px to accommodate avatar

### Performance Considerations
- Server-side pagination (required for large datasets)
- Debounce search input (300ms) before fetching
- Cache users list for 30 seconds (add to React Query config)
- Avatar initials generated client-side from first_name[0] + last_name[0]

### Styling Notes
- Avatar colors: use role-based colors or hash initials for consistent color per user
- Table header: Poppins SemiBold, 14px, #101820
- Table body: Poppins Regular, 14px, #101820
- Borders: #DAE1E9 (tertiary color)
- Hover state: light background #F5F5F7

## Criterios de aceptación
- Table matches Figma design exactly
- Role badges display correct colors per role
- Search filters users by name/email (real-time with debounce)
- Role and status filters work correctly
- Pagination shows correct page numbers and allows navigation
- "Ampliar" button opens user detail page (T-07-05)
- "+ Nueva Usuario" button navigates to create user form (stage 08)
- Phone button is clickable (copy or dial functionality)
- Edit icon visible but may be disabled if user lacks edit permission (future)
- All data flows through `rpc_admin_list_users` only (no direct table access)
- Empty state: message "No users found" with icon
- Loading state: skeleton loaders for table rows

## Dependencias
- Etapa 04 (DataTable component, layout, pagination)
- Etapa 01 (Profile types, role enums)
- Etapa 06 (PhoneInput, geography components if zone link is implemented)
