# Etapa 05 — Página de Tiendas

## Objetivo
Build the Stores section desde el sidebar: la página principal que lista todas las tiendas en una data table con búsqueda, filtros, ordenamiento, paginación, y acciones en filas.

## Referencias de Figma
- Stores page: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2429

## Especificaciones de diseño (desde Figma)
- Breadcrumb: arcaxo/ > Tiendas
- Action bar: "+ Nueva tienda" button (primary blue) + Search input + Sort dropdown ("Sort: Mantenimiento") + Reset button
- Columnas table: [Status circle] | Tienda (image + name) | Dispositivos (count + serial chips) | Zona (city + maps link) | Ultima visita (date) | Acciones (Ampliar + edit + phone)
- Row height: ~96px
- Store image: 71x71px rounded-[5px]
- Device info: "2 🔵: 7137, 8AMC." format con chip icon
- Location: nombre ciudad + blue truncated google maps link + location pin icon
- Acciones: "Ampliar" outlined button + edit icon button + phone blue icon button

## Tareas

### T-05-01: Página de listado de tiendas
**Archivo:** `/[locale]/(dashboard)/tiendas/page.tsx`

- Server component que obtiene data inicial
- Usa DataTable component de etapa 04
- Implementa búsqueda, ordenamiento, filtros, paginación
- Props: searchParams (para query params sync)
- Breadcrumb: muestra "Arcaxo > Tiendas"
- Action bar con botones y controles
- Gestiona loading/error states via React Query
- Integración con Zustand store para client state (filters, pagination)
- Responsive layout: ajusta grid/stack en mobile

### T-05-02: Server Actions para listar tiendas
**Archivo:** `actions/stores/list-stores.ts`

```typescript
export async function listStores(params: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filterStatus?: string[];
  filterCountryCode?: string;
  filterActive?: boolean;
}): Promise<{
  stores: Store[];
  total: number;
  page: number;
}>
```

- Llama `rpc_admin_list_stores` (YA EXISTE en backend)
- Parámetros: p_page, p_page_size, p_search, p_sort_by, p_sort_order, p_filter_status, p_filter_country_code, p_filter_active
- Returns: objeto con stores[], total count, current page
- Error handling: try-catch, rethrow con contexto
- Auth check: valida que user sea owner o admin

**RPC EXISTENTE:** `rpc_admin_list_stores`
- Input:
  - `p_page` (int): página (1-indexed)
  - `p_page_size` (int): elementos por página
  - `p_search` (text, optional): ILIKE búsqueda en name/address
  - `p_sort_by` (text): name, status, updated_at, city_name
  - `p_sort_order` (text): asc, desc
  - `p_filter_status` (text[], optional): estado(s) a filtrar
  - `p_filter_country_code` (text, optional): código país
  - `p_filter_active` (boolean, optional): filtrar por activo/inactivo
- Output: rows con: store_id, name, facade_photo_url, status, active, install_enabled, authorized_devices_count, installed_devices_count, city_name, state_name, country_code, google_maps_url, phone_country_code, phone_number, last_visit_date, total_count

### T-05-03: Store list item component
**Archivo:** `components/stores/StoreListItem.tsx`

- Status circle: green (operational), orange (maintenance), blue (new_store), red (inactive)
- Store thumbnail + nombre
- Devices summary: count + serial numbers abreviados
- Zone: nombre ciudad + truncated maps link
- Last visit date formateada
- Botones acción:
  - "Ampliar" → navega a store detail
  - Edit icon → abre modal/form editar
  - Phone icon → llamada o intención de contacto
- Hover states: cambios de background, resalta acciones
- Tooltip en truncated text para ver completo

### T-05-04: Filtros y búsqueda
**Archivo:** `components/stores/StoresFilters.tsx`

- Search: input debounceado 300ms, busca por nombre tienda
- Sort dropdown: opciones para status, name, last_visit, zone
- Filter por status: new_store, maintenance, operational, inactive
- Botón reset: limpia todos los filtros
- URL params sync: filtros persisten en query params (page, search, sortBy, sortOrder, status)
- Zustand store update on filter change
- React Query refetch automático cuando cambian filters
- Loading indicator mientras fetching

### T-05-05: Store detail page
**Archivo:** `/[locale]/(dashboard)/tiendas/[storeId]/page.tsx`

- Muestra detalles completos de la tienda: todos los campos, contexto, metadata
- Tabs o secciones para: General info, Devices list, Installation sessions, Maintenance history
- Server action: getStoreDetail (llama `rpc_admin_get_store_detail` — YA EXISTE)
- Breadcrumb: Arcaxo > Tiendas > [Store Name]
- Botones acciones: Edit, Delete (con confirmación), Back
- Loading state mientras carga data
- Error state con retry button
- Información mostrada:
  - Foto fachada large
  - Nombre, dirección, teléfono
  - Responsable info
  - Geographic location
  - Stats: dispositivos autorizados vs instalados
  - Histórico: última visita, última sesión de instalación

**RPC EXISTENTE:** `rpc_admin_get_store_detail`
- Input: `p_store_id` (UUID)
- Output: todos los campos de store + installed_devices_count, total_sessions_count, open_session_id, open_session_type, open_session_installer_name

### T-05-06: Zustand store para estado de tiendas
**Archivo:** `stores/stores-store.ts`

```typescript
interface StoresStore {
  stores: Store[];
  selectedStore: Store | null;
  filters: {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string[];
  };
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
  };
  // Actions
  setStores: (stores: Store[]) => void;
  setSelectedStore: (store: Store | null) => void;
  setFilters: (filters: Partial<StoresStore['filters']>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<StoresStore['pagination']>) => void;
}
```

- Usado para client-side state management
- React Query para data fetching (useQuery hook)
- Zustand para filter/pagination UI state
- Sincronización con URL params (useEffect)

### T-05-07: Store types (Type definitions)
**Archivo:** `types/stores.ts`

```typescript
export interface Store {
  store_id: string;
  name: string;
  facade_photo_url: string;
  status: 'operational' | 'maintenance' | 'new_store' | 'inactive';
  active: boolean;
  authorized_devices_count: number;
  installed_devices_count: number;
  city_name: string;
  state_name: string;
  google_maps_url: string;
  phone_number: string;
  last_visit_date: string; // ISO date
  sensors_summary: Record<string, any>;
  // Detail fields (loaded in detail page)
  address?: string;
  responsible_name?: string;
  responsible_email?: string;
  responsible_phone?: string;
  latitude?: number;
  longitude?: number;
  country_name?: string;
}
```

- Interfaces para API responses
- Separar tipos de list vs detail

## Criterios de aceptación
- Table muestra tiendas matching Figma layout
- Búsqueda, ordenamiento, filtros funcionan correctamente
- Paginación navega entre páginas
- "Ampliar" abre store detail en nueva página/modal
- "+ Nueva tienda" navega a create form (etapa 06)
- Todos los textos i18n ready
- URL params sync con filtros
- Loading states animados
- Error handling con user-friendly messages
- Mobile responsive: table scrolls horizontally en mobile

## Dependencias
- Etapa 04 (layout, table, pagination components)
- Etapa 01 (Store types definition)
- Auth middleware working
- React Query + Zustand setup
- RPCs disponibles: rpc_admin_list_stores, rpc_admin_get_store_detail

## Notas de implementación
- Usar useQuery de React Query para data fetching
- Debounce búsqueda con useDeferredValue o custom hook
- URL params via useSearchParams + router.push
- Error boundaries para fallos de API
- i18n keys: tiendas.title, tiendas.newButton, tiendas.search, tiendas.sort, etc.
- Date formatting usando date-fns con locale
- Image loading: usar next/image con fallback
- Mostrar loading skeleton de T-04-09 mientras fetching
