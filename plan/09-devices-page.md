# Etapa 09 — Página de Dispositivos

## Objetivo
Build the Devices section with a read-only listing page showing all sensors/devices installed across the network. The "+Nuevo Dispositivo" button is developed but intentionally hidden—sensors can only be created via the installer mobile app.

## Figma References
- Devices page: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=271-611

## Design Specs (from Figma)

### Devices List Page
- Breadcrumb: arcaxo/ > Dispositivos
- Page title: "Dispositivos" (Poppins SemiBold, 28px, #101820)
- Action bar:
  - "+ Nuevo Dispositivo" button (primary blue, but HIDDEN via CSS display:none or feature flag)
  - Search input with icon (search by serial number or MAC address)
- Table columns (left to right):
  - **Actividad** (8px status circle, no text label)
  - **Serial del Dispositivo** (chip icon + serial text, e.g., "GH56368713A.")
  - **Instalador** (installer full name, clickable → user detail page)
  - **Tienda** (store name, clickable → store detail page)
  - **Zona** (city name + optional Google Maps link icon)
  - **Última visita** (date in "DD/MM/YYYY HH:mm" format, e.g., "15/03/2026 14:30")
  - **Acciones** (action buttons: "Ver más" + phone button)
- Status indicators (colored circles, 8px diameter):
  - Green: installed, active
  - Orange: confirming, config_sent, config_sending, connecting
  - Blue: detected (not yet installed)
  - Red: failed, cancelled, uninstalled
  - Grey: decommissioned, unknown status
- Table styling:
  - Header: Poppins SemiBold, 12px, #9CA3AF, uppercase "SERIAL DEL DISPOSITIVO"
  - Body: Poppins Regular, 14px, #101820
  - Row height: 56px
  - Borders: #DAE1E9
  - Hover: light background #F5F5F7
- Pagination: matches stores page (stage 05)
- Empty state: icon + "No hay dispositivos" message if no results

### Device Detail Page (Future Enhancement)
- Route structure: `/[locale]/(dashboard)/dispositivos/[sensorId]/page.tsx`
- Accessible via "Ver más" button
- Shows:
  - Device serial, MAC address, manufacturer
  - Current installation status with timeline
  - Current store assignment + installation date
  - Last event timestamp and event type
  - Installation history (all past stores)
  - Event log/timeline (configuration, connection events, etc.)
- Edit button: HIDDEN (devices are read-only from admin panel)

## Tareas

### T-09-01: Página de listado de dispositivos
- File: `app/[locale]/(dashboard)/dispositivos/page.tsx`
- Server component with DataTable (from stage 04)
- Search functionality: real-time search by serial number or MAC address prefix (case-sensitive LIKE)
- Pagination: same pattern as stores (stage 05)
- Sorting: by serial, last visit date, store, installer (configurable via URL params)

**RPC EXISTENTE:** `rpc_admin_list_sensors`
- Input:
  - `p_page` (int): página (1-indexed)
  - `p_page_size` (int): elementos por página (10, 25, 50, o 100)
  - `p_search` (text, optional): PREFIX búsqueda en serial/mac (LIKE, case-sensitive)
  - `p_filter_status` (text[], optional): estados a filtrar
  - `p_filter_store_id` (uuid, optional): filtrar por tienda
  - `p_filter_is_active` (boolean, optional): filtrar por activo/inactivo
  - `p_sort_by` (text): updated_at, serial, current_status
  - `p_sort_order` (text): asc, desc
- Output: rows con:
  - `sensor_id`: UUID
  - `serial`: string (ej: "GH56368713A.")
  - `mac_normalized`: string (normalized, 48-bit hex)
  - `current_status`: enum (installed, detecting, confirming_config, config_sent, config_sending, connecting, failed, cancelled, uninstalled, decommissioned)
  - `is_active`: boolean
  - `current_store_id`: UUID or null
  - `store_name`: string
  - `installer_name`: string (full name)
  - `installer_phone`: string (optional)
  - `city_name`: string
  - `google_maps_url`: string (optional, pre-formatted URL)
  - `installed_at`: timestamp or null
  - `last_event_date`: timestamp
  - `decommissioned_at`: timestamp or null
  - `total_count`: int

### T-09-02: Server Actions para listar dispositivos
- File: `app/actions/devices/list-devices.ts`
- Wrapper function that calls `rpc_admin_list_sensors`
- Input validation:
  - Page and page_size are positive integers
  - Search string is sanitized (trim, max 50 chars)
  - Status filter values are in allowed enum
  - Sort_by and sort_order are valid values
- Returns paginated response with:
  - `data`: array of device records
  - `totalCount`: total number of devices matching filter
  - `page`: current page number
  - `pageSize`: items per page
  - `totalPages`: ceil(totalCount / pageSize)
- Error handling:
  - Return empty array on RPC failure with error log
  - Fallback behavior: show empty state with "Error loading devices" message
- Caching: set React Query cache time to 60 seconds (devices change less frequently than stores)

### T-09-03: Device list item component
- File: `app/components/devices/DeviceListItem.tsx`
- Displays single row in devices table
- Status circle (8px, left-aligned):
  - Uses DeviceStatusIcon component (T-09-06)
  - Maps sensor_install_status to color via utility function
  - Tooltip on hover: shows full status text (e.g., "Active and installed")
- Serial number:
  - Chip icon (16px) before text
  - Text: Poppins Regular, 14px, #0000FF (clickable link color)
  - Clickable → opens device detail page (T-09-05)
  - Copy-to-clipboard tooltip on click
- Installer name:
  - Link to user detail page (stage 07)
  - Color: #0000FF
  - Format: "FirstName LastName"
- Store name:
  - Link to store detail page (stage 05)
  - Color: #0000FF
  - If null/empty: show "—" placeholder
- Zone:
  - Text: city_name, state_name (optional)
  - If google_maps_url available: add small maps icon (16px) that opens URL in new tab
  - Color: #101820
- Last visit:
  - Formatted date/time: "DD/MM/YYYY HH:mm"
  - If null: show "—"
  - Color: #9CA3AF
- Actions:
  - "Ver más" outlined button (neutral gray, 32px height) → links to device detail page
  - Phone button (blue, 32px height, icon-only or "Llamar") → copies phone to clipboard or opens tel: URL
  - Both buttons disabled if no associated installer

### T-09-04: Hidden "+ Nuevo Dispositivo" button
- File: Button code in page template or header component
- Visual placement: top action bar, next to search input
- Button text: "+ Nuevo Dispositivo"
- Button styling: primary blue (#0000FF), Poppins Medium, 14px
- Hidden via one of these approaches (choose one):
  - **Option A - Environment variable** (recommended):
    - Add to `.env.local`: `NEXT_PUBLIC_ENABLE_DEVICE_CREATION=false`
    - In component: `{process.env.NEXT_PUBLIC_ENABLE_DEVICE_CREATION === 'true' && (<Button>...)}`
    - Allows feature flag per environment
  - **Option B - Direct CSS**:
    - Add className `hidden` (Tailwind) to permanently hide
  - **Option C - Role-based visibility**:
    - Check user role, only show for 'owner' if implemented
- Code comment explaining hidden behavior:
  ```typescript
  {/*
    T-09-04: Create device button is hidden because devices can only be created
    via the installer mobile app. This button is implemented for future use when
    admin device creation is enabled. Enable with NEXT_PUBLIC_ENABLE_DEVICE_CREATION=true
  */}
  {process.env.NEXT_PUBLIC_ENABLE_DEVICE_CREATION === 'true' && (
    <Button className="bg-blue-600">+ Nuevo Dispositivo</Button>
  )}
  ```

### T-09-05: Device detail page
- File: `app/[locale]/(dashboard)/dispositivos/[sensorId]/page.tsx`
- Route parameter: `sensorId` (UUID)
- Server component
- Breadcrumb: arcaxo/ > Dispositivos > [Serial Number]
- Content sections (tabs or vertical stack):

  **Tab 1: Información General**
  - Device header: status circle + serial number (large)
  - Two-column layout:
    - Left: MAC address, Manufacturer, Model, Firmware version
    - Right: Current status, Is active (toggle visual), Created date
  - Full width: Current store + installation date

  **Tab 2: Instalación Actual**
  - Store details: name, address, assigned devices count
  - Installation date: timestamp
  - Installer: name, phone, email (if available)
  - Configuration status: last config sent date, last config acknowledged date

  **Tab 3: Historial de Instalación**
  - Timeline or table of all past store assignments:
    - From date → To date
    - Store name → linked to store detail
    - Installer → linked to user detail
    - Reason for change (if tracked)
  - Sortable: newest first (default)

  **Tab 4: Eventos** (Activity/Event Log)
  - Reverse chronological list of events (last 50):
    - Timestamp, Event type, Status, Details
  - Event types: connection, disconnection, config_sent, config_ack, failure, commissioned, decommissioned
  - Filter by event type (dropdown)
  - Pagination or lazy-load (show 20 newest, "Load more..." button)

**RPC EXISTENTE:** `rpc_admin_get_sensor_detail`
- Input: `p_sensor_id` (UUID) OR `p_mac_address` OR `p_serial` (at least one required)
- Output:
  - Todos los campos del sensor (serial, MAC, status, is_active, created_at)
  - Current installation: store_name, store_address, installations (jsonb array)
  - Events: recent_events (jsonb, últimos 50 eventos)
  - All metadata and context fields

### T-09-05b: Decommissioning functionality (Optional — Future Enhancement)
**RPC EXISTENTE:** `rpc_admin_decommission_sensor`
- Input:
  - `p_sensor_id` (UUID): sensor a desmantelar
  - `p_reason` (text): stolen, lost, damaged_permanent
  - `p_note` (text, optional): notas adicionales
- Marks sensor as decommissioned (sets is_active=false, records decommissioned_at timestamp)
- Accessible from device detail page with confirmation dialog
- Only owner/admin can execute

### T-09-06: Device status mapping utility
- File: `app/lib/utils/device-status.ts`
- Purpose: centralized mapping of sensor_install_status enum to UI properties
- Export function: `getDeviceStatusInfo(status: string)`
  - Returns: `{ color: string, label: string, icon: ReactNode, bgColor: string }`
- Status mappings:
  ```typescript
  {
    installed: { color: 'green', label: 'Instalado', icon: CheckCircle },
    detecting: { color: 'blue', label: 'Detectado', icon: Circle },
    confirming_config: { color: 'orange', label: 'Confirmando', icon: AlertCircle },
    config_sent: { color: 'orange', label: 'Configuración Enviada', icon: AlertCircle },
    config_sending: { color: 'orange', label: 'Enviando Configuración', icon: AlertCircle },
    connecting: { color: 'orange', label: 'Conectando', icon: AlertCircle },
    failed: { color: 'red', label: 'Error', icon: XCircle },
    cancelled: { color: 'red', label: 'Cancelado', icon: XCircle },
    uninstalled: { color: 'red', label: 'Desinstalado', icon: XCircle },
    decommissioned: { color: 'grey', label: 'Desmantelado', icon: MinusCircle },
  }
  ```
- Export component: `DeviceStatusIcon({ status, size = 'md' })`
  - Renders colored circle (8px default, scalable)
  - Tooltip with label on hover
  - Used in list items and detail pages
- Reusable across devices list (T-09-03), detail page (T-09-05), and any other pages showing device status

## Implementación - Detalles Técnicos

### Filtering & Pagination
- All filtering state in URL query params (stateless):
  - `?page=1&pageSize=25&search=GH56&sort=serial&order=asc&status=installed&store=store-uuid`
- Search debounce: 300ms before fetching
- Default sort: last_event_date descending (newest first)
- Page reset on filter change (go to page 1)

### Performance Considerations
- Server-side pagination: required for potentially thousands of devices
- Lazy-load device detail tabs: Tab 4 (events) loads on-demand when tab is clicked
- React Query caching: 60 seconds for device list, 120 seconds for detail
- Virtualization: if device list grows beyond 5000 rows, implement react-window

### Data Flow
- List page (T-09-01) → calls action (T-09-02) → calls RPC → renders DeviceListItem (T-09-03)
- Click "Ver más" → navigates to detail page (T-09-05)
- Detail page → calls RPC (T-09-05 RPC) → displays tabs with DeviceStatusIcon (T-09-06)

### Styling Notes
- Tertiary color (#DAE1E9) for borders and disabled states
- Success color (#228D70) NOT used (no green text, only green circles)
- Info color (#00B2FF) for links
- Warning color (#FF4163) NOT used on this page (devices don't warn, they fail/alert)
- Table header: uppercase with letter-spacing
- Icons: use lucide-react for consistency (MapPin, Phone, Eye, AlertCircle, CheckCircle, XCircle)

## Criterios de aceptación
- List page displays all devices in data table format
- Table matches Figma design exactly (columns, spacing, colors)
- Status circles correct color per device_status enum
- Serial number clickable and links to device detail page
- Search by serial or MAC filters results in real-time (debounced, LIKE case-sensitive prefix search)
- Pagination displays correct number of pages and allows navigation
- Sort by serial, last visit, store, installer works correctly
- "+ Nuevo Dispositivo" button exists in code but is hidden (not visible on page)
- Button can be enabled via NEXT_PUBLIC_ENABLE_DEVICE_CREATION env var
- Installer name is clickable link to user detail page
- Store name is clickable link to store detail page
- Phone button is clickable (copy or dial functionality)
- Zone displays city name + optional maps link
- Last visit shows formatted date/time or "—" if null
- "Ver más" button opens device detail page with correct sensor_id
- Device detail page displays all tabs: Information, Installation, History, Events
- Status icon used consistently across list and detail pages
- All data flows through rpc_admin_list_sensors and rpc_admin_get_sensor_detail only (no direct table access)
- Empty state: "No hay dispositivos" if no results or error
- Decommissioned sensors clearly marked with grey status circle
- Decommissioned devices can be filtered/sorted by is_active flag

## Dependencias
- Etapa 04 (DataTable component, layout, pagination)
- Etapa 05 (store detail page link patterns)
- Etapa 01 (Sensor types, status enums)
- Etapa 07 (user detail page link patterns, user display format)
- RPCs disponibles: rpc_admin_list_sensors, rpc_admin_get_sensor_detail, rpc_admin_decommission_sensor
- lucide-react (icons)
- Utility: date formatter for "DD/MM/YYYY HH:mm" format
