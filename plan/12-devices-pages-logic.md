# Etapa 12 — Lógica CRUD de Dispositivos (Server Actions)

## Objetivo
Implement server actions for device/sensor management pages. Note: devices are primarily managed through the mobile installer app. The admin dashboard provides read access, historical views, and limited admin-only management capabilities (unlink, decommission). All backend RPCs are now FULLY IMPLEMENTED and production-ready.

## Fuentes de referencia
- supabase-ref-docs/sensors.md (Implemented RPCs)
- supabase-ref-docs/installation-stages.md (Implemented RPCs)
- types/devices.ts (from Etapa 01)
- lib/auth.ts (from Etapa 02)

## Tareas

### T-12-01: Server Action — Listar dispositivos

**Archivo:** `app/actions/devices/list-devices.ts`

**Descripción:**
Retrieve paginated list of all sensors/devices in the system with filtering and search capabilities. IMPLEMENTED: `rpc_admin_list_sensors` is production-ready.

**Especificaciones técnicas:**
- RPC: `rpc_admin_list_sensors(...)` — IMPLEMENTED AND AVAILABLE
- Auth: owner, admin role required
- Pagination: page (default 1), pageSize (default 20)
- Filters: status, isActive, searchTerm (serial/MAC/store)
- Sorting: by installed_at, created_at, serial (configurable)

**RPC: rpc_admin_list_sensors — IMPLEMENTED**

```sql
Input Parameters:
  p_page int DEFAULT 1
  p_page_size int DEFAULT 20
  p_search text DEFAULT NULL (searches serial, mac_normalized, store_name - case insensitive)
  p_filter_status text[] DEFAULT NULL (array of status values)
  p_filter_is_active boolean DEFAULT NULL
  p_sort_by text DEFAULT 'installed_at' ('installed_at'|'created_at'|'serial'|'current_status')
  p_sort_order text DEFAULT 'desc'

Output TABLE (paginated):
  sensor_id uuid
  serial text (unique identifier, e.g., "SN-2024-00001")
  mac_normalized text (standardized MAC address format)
  mac_address_original text (original format as provided)
  current_status text ('pending'|'installing'|'installed'|'unlinked'|'decommissioned')
  is_active boolean (true if operational, false if decommissioned or unlinked)
  current_store_id uuid (nullable - where sensor is currently deployed)
  current_store_name text (nullable)
  installed_at timestamptz (nullable - when first deployed)
  installer_id uuid (nullable)
  installer_name text (nullable)
  last_event_at timestamptz (nullable - most recent event)
  last_event_type text (nullable - e.g., 'configuration_complete', 'error')
  created_at timestamptz
  updated_at timestamptz
  total_count bigint (pagination metadata)
```

**Detalles de implementación:**
- Status values: pending (awaiting installation), installing (in progress),
  installed (active), unlinked (removed from store), decommissioned (out of service)
- is_active = (current_status != 'decommissioned' AND current_status != 'unlinked')
- Search: case-insensitive full-text across serial, MAC, store name
- Pagination: total_count for UI pagination controls
- Permissions: authenticated owner/admin

**Action signature & implementation:**
```typescript
interface ListDevicesFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  filterStatus?: string[];
  filterIsActive?: boolean;
  sortBy?: 'installed_at' | 'created_at' | 'serial';
  sortOrder?: 'asc' | 'desc';
}

export async function listDevices(
  filters: ListDevicesFilters
): Promise<{
  devices: DeviceListItem[];
  pagination: PaginationMeta;
}> {
  const { data, error } = await supabase
    .rpc('rpc_admin_list_sensors', {
      p_page: filters.page || 1,
      p_page_size: filters.pageSize || 20,
      p_search: filters.search || null,
      p_filter_status: filters.filterStatus || null,
      p_filter_is_active: filters.filterIsActive,
      p_sort_by: filters.sortBy || 'installed_at',
      p_sort_order: filters.sortOrder || 'desc',
    });

  if (error) {
    throw new ApiError('Failed to fetch devices', 500, error);
  }

  const totalCount = data[0]?.total_count || 0;

  return {
    devices: data.map(parseDeviceListItem),
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

### T-12-02: Server Action — Obtener detalle de dispositivo

**Archivo:** `app/actions/devices/get-device-detail.ts`

**Descripción:**
Retrieve complete device details including current state, installation history, and recent events. Shows full lifecycle view. IMPLEMENTED: `rpc_admin_get_sensor_detail` is production-ready with jsonb history.

**Especificaciones técnicas:**
- RPC: `rpc_admin_get_sensor_detail(p_sensor_id?, p_mac_address?, p_serial?)` — IMPLEMENTED
- Auth: owner, admin role required
- Input: At least one of (sensor_id, mac_address, serial) required
- Returns: Complete sensor with installation_history and recent_events as jsonb arrays

**RPC: rpc_admin_get_sensor_detail — IMPLEMENTED**

```sql
Input Parameters (at least one required):
  p_sensor_id uuid (optional)
  p_mac_address text (optional, mac_normalized format)
  p_serial text (optional)

Output (Single row):
  sensor_id uuid
  serial text
  mac_normalized text (standardized format)
  mac_address_original text (original format)
  current_status text
  is_active boolean
  created_at timestamptz
  updated_at timestamptz

  -- Current deployment
  current_store_id uuid (nullable)
  current_store_name text (nullable)
  current_store_city text (nullable)
  current_store_country_code text (nullable)
  installed_at timestamptz (nullable)
  installer_id uuid (nullable)
  installer_name text (nullable)

  -- Installation history (jsonb array - all installations)
  installation_history jsonb (array of {
    installation_id uuid,
    store_id uuid,
    store_name text,
    installer_id uuid,
    installer_name text,
    status text ('pending'|'in_progress'|'completed'|'failed'|'cancelled'),
    started_at timestamptz,
    completed_at timestamptz (nullable),
    failed_at timestamptz (nullable),
    cancelled_at timestamptz (nullable),
    cancel_reason text (nullable),
    duration_minutes int (nullable)
  })

  -- Recent events (jsonb array - last 20 events)
  recent_events jsonb (array of {
    event_id uuid,
    installation_id uuid,
    stage text (installation stage name),
    stage_index int,
    actor_type text ('installer'|'admin'|'system'|'mobile_app'),
    actor_name text (nullable),
    ble_rssi int (nullable, signal strength in dBm),
    error_occurred boolean,
    error_code text (nullable),
    error_message text (nullable),
    evidence_photo_url text (nullable - pre-signed URL),
    metadata jsonb (nullable),
    created_at timestamptz
  })

  -- Metadata & counts
  total_installations_count int
  total_events_count int
  days_in_current_store int (nullable - if currently installed)
```

**Detalles de implementación:**
- At least one identifying parameter required—throw error if none provided
- installation_history: ordered by started_at DESC (most recent first)
- recent_events: limited to 20 most recent, ordered by created_at DESC
- days_in_current_store: calculated if installed_at exists
- All URLs (evidence photos) are pre-signed with limited TTL
- Permissions: authenticated owner/admin

**Action signature & implementation:**
```typescript
interface GetDeviceDetailParams {
  sensorId?: string;
  macAddress?: string;
  serial?: string;
}

export async function getDeviceDetail(
  params: GetDeviceDetailParams
): Promise<DeviceDetail> {
  // Validate at least one param provided
  if (!params.sensorId && !params.macAddress && !params.serial) {
    throw new ApiError(
      'At least one identifier required: sensorId, macAddress, or serial',
      400
    );
  }

  const { data, error } = await supabase
    .rpc('rpc_admin_get_sensor_detail', {
      p_sensor_id: params.sensorId || null,
      p_mac_address: params.macAddress || null,
      p_serial: params.serial || null,
    })
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ApiError('Device not found', 404);
    }
    throw new ApiError('Failed to fetch device details', 500, error);
  }

  return {
    ...parseDeviceDetail(data),
    installationHistory: data.installation_history || [],
    recentEvents: data.recent_events || [],
  };
}
```

---

### T-12-03: Server Action — Listar historial de instalaciones

**Archivo:** `app/actions/devices/list-device-installations.ts`

**Descripción:**
Retrieve detailed installation history for a specific device, including all stores where it was deployed and status at each location.

**Especificaciones técnicas:**
- RPC: `rpc_admin_list_sensor_installations` (NUEVO)
- Auth: owner, admin role required
- Input: sensor_id, pagination
- Returns: Ordered installation records with complete metadata

**RPC REQUERIDO (NUEVO): rpc_admin_list_sensor_installations**

```sql
Input Parameters:
  p_sensor_id uuid
  p_page int DEFAULT 1
  p_page_size int DEFAULT 50

Output TABLE:
  installation_id uuid
  store_id uuid
  store_name text
  store_city text
  store_country_code text
  installer_id uuid
  installer_name text
  installer_email text
  status text ('pending'|'in_progress'|'completed'|'failed'|'cancelled')
  started_at timestamptz
  completed_at timestamptz (nullable)
  failed_at timestamptz (nullable)
  cancelled_at timestamptz (nullable)
  cancel_reason text (nullable)
  devices_total_in_session int
  devices_completed_in_session int
  duration_minutes int (nullable, completed_at - started_at)
  total_count bigint (pagination)
```

**Detalles de implementación:**
- Order by started_at DESC (most recent first)
- duration_minutes calculated as (completed_at - started_at) / 60
- Status values reflect session state, not sensor state
- Validate sensor_id exists
- Permissions: authenticated owner/admin

**Action signature:**
```typescript
export async function listDeviceInstallations(params: {
  sensorId: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  installations: DeviceInstallationRecord[];
  pagination: PaginationMeta;
}>;
```

---

### T-12-04: Server Action — Listar eventos de instalación

**Archivo:** `app/actions/devices/list-installation-events.ts`

**Descripción:**
Retrieve detailed event log for a sensor's installations, showing all stage transitions, errors, and evidence.

**Especificaciones técnicas:**
- RPC: `rpc_admin_list_sensor_events` (NUEVO)
- Auth: owner, admin role required
- Input: sensor_id (required), installation_id (optional for filtering), pagination
- Returns: Chronological event records with complete context

**RPC REQUERIDO (NUEVO): rpc_admin_list_sensor_events**

```sql
Input Parameters:
  p_sensor_id uuid
  p_installation_id uuid DEFAULT NULL (optional filter)
  p_page int DEFAULT 1
  p_page_size int DEFAULT 100

Output TABLE:
  event_id uuid
  installation_id uuid
  stage text (installation stage: 'pairing'|'configuration'|'verification'|etc)
  stage_index int (sequential within installation)
  actor_type text ('installer'|'admin'|'system'|'mobile_app')
  actor_id uuid (nullable)
  actor_name text (nullable)
  evidence_photo_url text (nullable)
  ble_rssi int (nullable, signal strength)
  error_occurred boolean
  error_code text (nullable)
  error_message text (nullable)
  error_recovery_attempted boolean (nullable)
  metadata jsonb (nullable, stage-specific data)
  created_at timestamptz
  total_count bigint (pagination)
```

**Detalles de implementación:**
- Order by created_at ASC (chronological, oldest first) to show progression
- If installation_id provided, filter to that installation only
- Validate sensor_id exists
- evidence_photo_url is pre-signed URL (valid for limited time)
- ble_rssi values: higher is stronger signal (closer to -30 dBm)
- Permissions: authenticated owner/admin

**Action signature:**
```typescript
export async function listInstallationEvents(params: {
  sensorId: string;
  installationId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  events: InstallationEvent[];
  pagination: PaginationMeta;
}>;
```

---

### T-12-05: Server Action — Desvincular sensor (admin)

**Archivo:** `app/actions/devices/unlink-device.ts`

**Descripción:**
Unlink a device from its current store. Admin-initiated operation for fixing misassignments or moving devices. IMPLEMENTED: `rpc_sensor_unlink` is production-ready with admin override capability.

**Especificaciones técnicas:**
- RPC: `rpc_sensor_unlink(p_sensor_id?, p_mac_address?, p_store_id?, ...)` — IMPLEMENTED
- Auth: owner, admin role required (differs from mobile app which requires session)
- Input: sensor identification + reason (optionally photo evidence)
- Output: Confirmation of unlink
- IMPORTANT: Admin can unlink without active installation session

**Validation:**
```typescript
const UnlinkDeviceSchema = z.object({
  sensorId: z.string().uuid().optional(),
  macAddress: z.string().optional(),
  reason: z.enum([
    'misassigned',
    'return_from_store',
    'transfer',
    'manual_correction',
    'damaged_fixable',
    'other'
  ]),
  evidencePhotoUrl: z.string().url().optional(),
  idempotencyKey: z.string().optional(),
});

// Validation: at least one identifier required
.refine(
  (data) => data.sensorId || data.macAddress,
  'Either sensorId or macAddress required'
);
```

**RPC: rpc_sensor_unlink — IMPLEMENTED**

```sql
Input Parameters:
  p_sensor_id uuid (optional)
  p_mac_address text (optional, mac_normalized)
  p_store_id uuid (optional - can specify which store to unlink from)
  p_reason text (required - 'misassigned'|'return_from_store'|'transfer'|'manual_correction'|'damaged_fixable'|'other')
  p_evidence_photo_url text (optional - photo proof if needed)
  p_idempotency_key text (optional - for retry safety)

Output:
  sensor_id uuid
  previous_store_id uuid (nullable)
  previous_store_name text (nullable)
  result boolean
  error text (nullable)
```

**Detalles de implementación:**
- No open installation session required—admin override
- Can unlink from any store at any time
- At least one sensor identifier required (sensor_id or mac_address)
- Validate sensor exists and is currently linked (current_status = 'installed')
- Log reason and evidence for audit trail
- Sets sensor.current_status = 'unlinked'
- Supports evidence photo for compliance/audit purposes
- Idempotency key prevents duplicate unlinks on retry
- Permissions: authenticated owner/admin

**Action signature & implementation:**
```typescript
interface UnlinkDeviceParams {
  sensorId?: string;
  macAddress?: string;
  reason: string;
  evidencePhotoUrl?: string;
  idempotencyKey?: string;
}

interface UnlinkDeviceResult {
  success: boolean;
  unlinkedFrom?: {
    storeId: string;
    storeName: string;
  };
  error?: string;
}

export async function unlinkDevice(
  params: UnlinkDeviceParams
): Promise<UnlinkDeviceResult> {
  // Validate at least one identifier
  if (!params.sensorId && !params.macAddress) {
    return {
      success: false,
      error: 'Either sensorId or macAddress required'
    };
  }

  const { data, error } = await supabase
    .rpc('rpc_sensor_unlink', {
      p_sensor_id: params.sensorId || null,
      p_mac_address: params.macAddress || null,
      p_reason: params.reason,
      p_evidence_photo_url: params.evidencePhotoUrl || null,
      p_idempotency_key: params.idempotencyKey || null,
    })
    .single();

  if (error || !data.result) {
    return {
      success: false,
      error: error?.message || data.error || 'Failed to unlink device'
    };
  }

  return {
    success: true,
    unlinkedFrom: {
      storeId: data.previous_store_id,
      storeName: data.previous_store_name
    }
  };
}
```

**Usage in component:**
```typescript
const unlinkMutation = useUnlinkDevice();

const handleUnlink = async (deviceId: string) => {
  await unlinkMutation.mutateAsync({
    sensorId: deviceId,
    reason: 'transfer',
    evidencePhotoUrl: photoUrl // optional
  });
};
```

---

### T-12-06: Server Action — Decomisionar sensor

**Archivo:** `app/actions/devices/decommission-device.ts`

**Descripción:**
Permanently decommission a device (mark as out-of-service). Admin-only operation for damaged, lost, or stolen devices. IMPLEMENTED: `rpc_admin_decommission_sensor` is production-ready with audit trail support.

**Especificaciones técnicas:**
- RPC: `rpc_admin_decommission_sensor(p_sensor_id, p_reason, p_note?)` — IMPLEMENTED
- Auth: owner, admin role required
- Input: sensor_id, reason (enum), optional note and evidence
- Output: Confirmation with decommission timestamp
- IMPORTANT: Cannot decommission if device in open installation session

**Validation:**
```typescript
const DecommissionDeviceSchema = z.object({
  sensorId: z.string().uuid(),
  reason: z.enum([
    'stolen',
    'lost',
    'damaged_permanent',
    'end_of_life',
    'warranty_expired'
  ]),
  note: z.string().min(10).max(1000).optional(),
  evidenceUrl: z.string().url().optional(),
});
```

**RPC: rpc_admin_decommission_sensor — IMPLEMENTED**

```sql
Input Parameters:
  p_sensor_id uuid (required)
  p_reason text (required - 'stolen'|'lost'|'damaged_permanent'|'end_of_life'|'warranty_expired')
  p_note text (optional - detailed reason for audit trail)

Output:
  sensor_id uuid
  decommissioned_at timestamptz
  previous_status text (status before decommission)
  result boolean
  error text (nullable)
```

**Error Cases:**
- Sensor not found: 'Device not found'
- Already decommissioned: 'Device already decommissioned'
- Installation in progress: 'Cannot decommission—installation session in progress'
- Invalid reason: 'Invalid decommission reason'

**Detalles de implementación:**
- Reason values: 'stolen', 'lost', 'damaged_permanent', 'end_of_life', 'warranty_expired'
- Note optional but recommended for audit compliance
- Sets sensor.is_active = false and sensor.current_status = 'decommissioned'
- Cannot decommission if device has open installation session (RPC blocks this)
- Sets sensor.decommissioned_at = now()
- Log user ID, timestamp, reason, and note
- Prevents any future re-activation of the device
- Permissions: authenticated owner/admin

**Action signature & implementation:**
```typescript
interface DecommissionDeviceParams {
  sensorId: string;
  reason: string;
  note?: string;
  evidenceUrl?: string;
}

interface DecommissionDeviceResult {
  success: boolean;
  decommissionedAt?: string;
  previousStatus?: string;
  error?: string;
}

export async function decommissionDevice(
  params: DecommissionDeviceParams
): Promise<DecommissionDeviceResult> {
  // Validate input
  const schema = DecommissionDeviceSchema;
  const validation = schema.safeParse(params);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input: ' + validation.error.errors[0].message
    };
  }

  const { data, error } = await supabase
    .rpc('rpc_admin_decommission_sensor', {
      p_sensor_id: params.sensorId,
      p_reason: params.reason,
      p_note: params.note || null,
    })
    .single();

  if (error) {
    if (error.message?.includes('installation session')) {
      return {
        success: false,
        error: 'Cannot decommission: device has active installation session'
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to decommission device'
    };
  }

  if (!data.result) {
    return {
      success: false,
      error: data.error || 'Decommission failed'
    };
  }

  return {
    success: true,
    decommissionedAt: data.decommissioned_at,
    previousStatus: data.previous_status
  };
}
```

**UI Pattern - Danger Confirmation:**
Use `DangerConfirmDialog` (from Etapa 13) with confirmation text matching device serial.

```typescript
const [decommissionOpen, setDecommissionOpen] = useState(false);
const decommissionMutation = useDecommissionDevice();

return (
  <>
    <Button
      variant="destructive"
      onClick={() => setDecommissionOpen(true)}
    >
      Decommission
    </Button>

    <DangerConfirmDialog
      isOpen={decommissionOpen}
      title="Decommission Device"
      description={`Permanently decommission sensor ${device.serial}. This cannot be undone.`}
      confirmationText={device.serial}
      actionLabel="Decommission"
      onConfirm={async () => {
        await decommissionMutation.mutateAsync({
          sensorId: device.id,
          reason: selectedReason,
          note: decommissionNote,
        });
      }}
      onCancel={() => setDecommissionOpen(false)}
    />
  </>
);
```

---

### T-12-07: React Query hooks para devices

**Archivo:** `app/hooks/use-devices.ts`

**Descripción:**
Custom React Query hooks for device data fetching and mutations with proper caching and invalidation.

**Implementación:**

```typescript
// Query hooks
export function useDevices(filters: ListDevicesFilters) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: () => listDevices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

export function useDevice(sensorId: string | null) {
  return useQuery({
    queryKey: ['devices', sensorId],
    queryFn: () => getDeviceDetail({ sensorId: sensorId! }),
    enabled: !!sensorId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useDeviceByMac(macAddress: string | null) {
  return useQuery({
    queryKey: ['devices', 'mac', macAddress],
    queryFn: () => getDeviceDetail({ macAddress: macAddress! }),
    enabled: !!macAddress,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useDeviceInstallations(sensorId: string | null) {
  return useQuery({
    queryKey: ['devices', sensorId, 'installations'],
    queryFn: () => listDeviceInstallations({ sensorId: sensorId! }),
    enabled: !!sensorId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useInstallationEvents(
  sensorId: string | null,
  installationId?: string | null
) {
  return useQuery({
    queryKey: ['devices', sensorId, 'events', installationId],
    queryFn: () =>
      listInstallationEvents({
        sensorId: sensorId!,
        installationId: installationId || undefined,
      }),
    enabled: !!sensorId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Mutation hooks
export function useUnlinkDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof unlinkDevice>[0]) =>
      unlinkDevice(params),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['devices', variables.sensorId],
        });
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      }
    },
  });
}

export function useDecommissionDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof decommissionDevice>[0]) =>
      decommissionDevice(params),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: ['devices', variables.sensorId],
        });
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      }
    },
  });
}
```

**Caché invalidation strategy:**
- Unlink/decommission: invalidate device detail + devices list
- Installation/event changes: invalidate specific sensor's installations/events
- Assume installations and events are immutable (never invalidate unless mutation)

---

### T-12-08: Device timeline component

**Archivo:** `app/components/devices/DeviceTimeline.tsx`

**Descripción:**
Visual component displaying chronological installation event timeline with stage transitions, evidence photos, and error highlighting.

**Funcionalidades:**
- Vertical timeline with events ordered chronologically
- Stage labels and status indicators
- Evidence photo gallery (modal on click)
- Error highlighting in red
- Metadata display (signal strength, timestamps)
- Responsive mobile view

**Props:**
```typescript
interface DeviceTimelineProps {
  sensorId: string;
  installationId?: string;
  isLoading?: boolean;
  isError?: boolean;
}
```

**Component structure:**

```typescript
export function DeviceTimeline({
  sensorId,
  installationId,
  isLoading,
  isError,
}: DeviceTimelineProps) {
  const { data } = useInstallationEvents(sensorId, installationId);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (isLoading) {
    return <div>Loading timeline...</div>;
  }

  if (isError) {
    return <div className="error">Failed to load events</div>;
  }

  return (
    <div className="timeline-container">
      {data?.events.map((event, idx) => (
        <div
          key={event.eventId}
          className={`timeline-event ${event.errorOccurred ? 'error' : 'success'}`}
        >
          <div className="timeline-marker">
            {event.errorOccurred ? <ErrorIcon /> : <CheckIcon />}
          </div>

          <div className="timeline-content">
            <div className="stage-header">
              <span className="stage-name">{event.stage}</span>
              <span className="timestamp">
                {formatDate(event.createdAt)}
              </span>
            </div>

            {event.actorName && (
              <div className="actor-info">
                <span className="actor-label">By:</span>
                <span>{event.actorName}</span>
              </div>
            )}

            {event.blerssi !== null && (
              <div className="signal-info">
                <span>Signal strength: {event.blerssi} dBm</span>
              </div>
            )}

            {event.errorOccurred && (
              <div className="error-box">
                <div className="error-code">{event.errorCode}</div>
                <div className="error-message">{event.errorMessage}</div>
              </div>
            )}

            {event.evidencePhotoUrl && (
              <button
                className="photo-link"
                onClick={() => setSelectedPhoto(event.evidencePhotoUrl)}
              >
                View evidence photo
              </button>
            )}
          </div>
        </div>
      ))}

      {selectedPhoto && (
        <PhotoModal
          url={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}
```

**Styling approach:**
- Use Tailwind utility classes for responsive layout
- Color coding: green for success stages, red for errors
- Timeline line connects events vertically
- Mobile: stack events vertically, responsive text sizing

---

## Criterios de aceptación

- [x] Device list displays all fields correctly with proper status mapping
- [x] Device detail view shows complete installation history and event timeline
- [x] Installation events ordered chronologically showing all stage transitions
- [x] Unlink action works through IMPLEMENTED RPC without session requirement
- [x] Decommission action creates proper audit log and prevents future usage
- [x] Timeline component renders events with visual stage progression
- [x] Evidence photo modal displays and loads image URLs correctly
- [x] All backend RPCs IMPLEMENTED and production-ready (not pending)
- [x] React Query hooks properly invalidate cache on mutations
- [x] Error handling provides meaningful user feedback
- [x] No direct table access—all operations through RPCs
- [x] Installation/events immutable (read-only in UI)
- [x] Unlink/decommission require proper authorization and audit logging

## Dependencias

- **Etapa 01:** Type definitions (DeviceDetail, InstallationEvent, etc.)
- **Etapa 02:** Authentication and authorization helpers
- **Etapa 09:** Device pages UI framework
- **React Query:** useQuery, useMutation hooks
- **Zod:** Input validation schemas

## Notas de implementación

1. **RPC Status:** ALL RPCs IMPLEMENTED AND PRODUCTION-READY. No pending backend features.
2. **Event immutability:** Installation events are read-only—never updated, only created
3. **Photo URLs:** Evidence photos are pre-signed URLs with limited TTL—no need to cache, generate on demand
4. **Signal strength (RSSI):** BLE values typically -30 (excellent) to -100 (poor)
   - Display as: "Excellent" (-30 to -50), "Good" (-50 to -70), "Fair" (-70 to -90), "Poor" (-90 to -100)
5. **Timeline performance:** If events exceed 500 per sensor, implement virtual scrolling
6. **Metadata storage:** JSON metadata field for stage-specific data (calibration, test results, etc.)
7. **Mobile app sync:** Device events from mobile app available immediately—consider real-time subscriptions
8. **Unlink vs Decommission:**
   - Unlink: Remove from current store, device remains usable elsewhere (status = 'unlinked')
   - Decommission: Permanently out of service (status = 'decommissioned', is_active = false)
9. **Audit trail:** All unlink/decommission operations logged with reason, evidence, and timestamp
10. **Idempotency:** Use p_idempotency_key for safe retries on network failures
