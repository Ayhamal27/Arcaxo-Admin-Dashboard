# Etapa 06 — Crear Nueva Tienda

## Objetivo
Build el formulario multi-step para registrar nuevas tiendas, disparado por el botón "+ Nueva Tienda" en la página de tiendas.

## Referencias de Figma
- Form Step 1: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=186-4560
- Form Step 2: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=288-624

## Especificaciones de diseño (desde screenshots Figma)

**Step 1 — "Datos generales de la tienda" (Paso 1/2):**
- Progress bar: fill azul proporcional al step
- Indicador "Paso 1/2" top-right
- Fields en grid 2-columnas:
  - Left: Nombre de la tienda (text), Numero Telefonico (country code selector + phone)
  - Right: País (dropdown), Ciudad (dropdown), Direccion exacta con google maps (text with location icon)
- Nota: Los campos de "Estado" y "Activo" NO existen — la tienda se crea siempre como new_store/active=true
- Buttons: "Cancelar" (outlined) + "Siguiente" (primary blue)

**Step 2 — "Datos generales del Responsable de la tienda" (Paso 2/2):**
- Progress bar: full azul
- Fields en grid 2-columnas:
  - Left: Nombre (text), Apellido (text)
  - Right: Numero Telefonico (country code + phone), Correo Electronico (email)
- Buttons: "Cancelar" (outlined) + "Crear tienda" (primary blue)

**Especificaciones de inputs:**
- Todos inputs: h-[50px], bg-white, border border-[#D0D5DD], rounded-[10px], Poppins Regular 16px, placeholder #667085
- Dropdowns: mismo style con chevron icon
- Phone input: flag icon + country code dropdown + number input
- Error states: border red, error message debajo
- Focus states: border blue, shadow subtle
- Disabled states: bg-gray, text-gray

## Tareas

### T-06-01: Página de creación multi-step
**Archivo:** `/[locale]/(dashboard)/tiendas/nueva/page.tsx`

- Breadcrumb: arcaxo/ > Tiendas > Crear nueva tienda
- Formulario multi-step con 2 steps
- Step state manejado localmente (useState o form library)
- Componentes renderizados conditionally basado en currentStep
- Form data persistido entre steps en estado local
- Navegación: Back button vuelve a tiendas list
- Estructura:
  ```tsx
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateStoreInput>({...});

  return (
    <>
      <Breadcrumb />
      <PageActionBar>
        <h1>Crear nueva tienda</h1>
      </PageActionBar>
      <StepProgress currentStep={currentStep} totalSteps={2} />
      {currentStep === 1 ? (
        <NewStoreStep1 data={formData} onChange={setFormData} />
      ) : (
        <NewStoreStep2 data={formData} onChange={setFormData} />
      )}
    </>
  );
  ```

### T-06-02: Componente StepProgress
**Archivo:** `components/shared/StepProgress.tsx`

- Visual progress bar + "Paso X/Y" text
- Blue fill proporcional al step actual
- Layout:
  - Left: progress bar container (bg-gray, blue fill from 0-100%)
  - Right: "Paso X/Y" text (Poppins SemiBold 18px)
- Props: currentStep, totalSteps
- Animación smooth cuando step cambia

### T-06-03: Step 1 — Datos generales de la tienda
**Archivo:** `components/stores/NewStoreStep1.tsx`

- Form fields con validación (react-hook-form + zod):
  ```typescript
  const schema = z.object({
    name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
    phone_country_code: z.string().optional(),
    phone_number: z.string().optional().refine(
      (val) => !val || /^\d+$/.test(val),
      'Solo números permitidos'
    ),
    country: z.string().min(1, 'País es requerido'),
    state: z.string().min(1, 'Estado es requerido'),
    city: z.string().min(1, 'Ciudad es requerida'),
    google_maps_url: z.string().min(1, 'Dirección es requerida'),
  });
  ```
- Campos (IMPORTANTES):
  - name: required, min 2 chars, max 100 chars
  - phone_country_code: optional, dropdown con country codes
  - phone_number: optional, numeric only, validar longitud
  - country_id: required, dropdown poblado desde `rpc_geo_list_countries`
  - state_id: required, dropdown poblado desde `rpc_geo_list_states(country_id)` — cascading
  - city_id: required, dropdown poblado desde `rpc_geo_list_cities(country_id, state_id)` — cascading
  - address: required, text input (dirección exacta)
  - latitude: required, extracted from Google Maps autocomplete or manual entry
  - longitude: required, extracted from Google Maps autocomplete or manual entry
  - Extract latitude/longitude desde Google Maps Autocomplete API o manual lat/long input

- Dropdowns cascading: country → state → city
- Loading states mientras fetching geo data
- Validación client-side inmediata
- Error messages debajo de cada field
- Botones: "Cancelar" (vuelve a tiendas), "Siguiente" (valida y va a step 2)

### T-06-04: Step 2 — Datos del responsable
**Archivo:** `components/stores/NewStoreStep2.tsx`

- Form fields:
  ```typescript
  const schema = z.object({
    responsible_first_name: z.string().min(1, 'Nombre es requerido'),
    responsible_last_name: z.string().min(1, 'Apellido es requerido'),
    responsible_phone_country_code: z.string().optional(),
    responsible_phone_number: z.string().optional().refine(
      (val) => !val || /^\d+$/.test(val),
      'Solo números permitidos'
    ),
    responsible_email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  });
  ```
- Campos:
  - responsible_first_name: required, min 1 char
  - responsible_last_name: required, min 1 char
  - responsible_phone_country_code: optional, country code dropdown
  - responsible_phone_number: optional, numeric
  - responsible_email: required, email format validation
- Botón "Crear tienda" dispara final submission
- Botón "Atrás" vuelve a step 1 (preserva data)
- Botón "Cancelar" cancela todo
- Loading indicator mientras se envía (disabled buttons)

### T-06-05: Server Action para crear tienda
**Archivo:** `actions/stores/create-store.ts`

```typescript
export async function createStore(input: CreateStoreInput): Promise<{
  success: boolean;
  store_id?: string;
  error?: string;
}>
```

- Valida todos los datos server-side (re-valida schema)
- Llama `rpc_create_store` (YA EXISTE en backend) con parámetros:
  - **Required:** p_name, p_city_id, p_address, p_latitude, p_longitude, p_responsible_first_name, p_responsible_last_name, p_responsible_email
  - **Optional:** p_phone_country_code, p_phone_number, p_responsible_phone_country_code, p_responsible_phone_number, p_authorized_devices_count (default 0), p_preload_payload, p_context_is_complete, p_metadata, p_created_by, p_client_group, p_internal_id, p_facade_photo_url
  - **IMPORTANTE:** p_status y p_active NO son parámetros — la tienda se crea siempre como new_store/active=true
  - **IMPORTANTE:** Si p_context_is_complete=true, p_preload_payload NO puede ser {} (debe tener contenido)
- Manejo de success: redirect a /tiendas con store_id en URL o ir a detail page del store nuevo
- Manejo de error: retorna error message, frontend mantiene form data
- Auth check: valida que user sea owner o admin
- Error handling: try-catch, valida RPC response, maneja constraint violations

**RPC EXISTENTE:** `rpc_create_store`
- Crea nueva tienda con estado inicial new_store y active=true
- Retorna: store_id, name, status, active, y demás campos

### T-06-06: Phone input component con country code
**Archivo:** `components/shared/PhoneInput.tsx`

- Componente reusable para phone input con country code
- Layout:
  - Left: Country flag image (24x24px)
  - Middle: Country code dropdown ("+1", "+34", etc.)
  - Right: Number input field
- Props:
  - countryCode: string (ej: "US", "ES")
  - number: string
  - onChange: (code: string, number: string) => void
  - disabled?: boolean
  - error?: string
- Fetch country codes desde actions/geography/list-country-codes.ts
- Dropdown searchable (filter by country name o code)
- Flag image desde cdn (countryflags.io o similar)

### T-06-07: Geography cascading selects component
**Archivo:** `components/shared/GeographySelects.tsx`

- Reusable component: Country → State → City dropdowns
- Props:
  ```typescript
  interface GeographySelectsProps {
    countryId?: string;
    stateId?: string;
    cityId?: string;
    onChange: (data: {
      countryId: string;
      stateId: string;
      cityId: string;
    }) => void;
    countryLabel?: string;
    stateLabel?: string;
    cityLabel?: string;
    required?: boolean;
    errors?: Record<string, string>;
    disabled?: boolean;
  }
  ```
- Cada dropdown dispara server action para cargar nivel siguiente
- Loading states (spinner) mientras fetching
- Empty states si no hay opciones
- Usado en formularios store y user creation
- Country → State → City flow:
  1. User selecciona Country → dispara listStates server action
  2. State dropdown se puebla y user selecciona → dispara listCities
  3. City dropdown se puebla para selección final

### T-06-08: Server Actions para geografía
**Archivo:** `actions/geography/`

Tres server actions:

**list-countries.ts:**
```typescript
export async function listCountries(): Promise<Array<{
  id: string;
  name: string;
  code: string;
}>>
```
- Llama `rpc_geo_list_countries` (YA EXISTE)
- Cachea resultado (isFetch = true)
- Retorna sorted by name

**list-states.ts:**
```typescript
export async function listStates(countryId: string): Promise<Array<{
  id: string;
  name: string;
}>>
```
- Llama `rpc_geo_list_states(country_id)` (YA EXISTE)
- Retorna sorted by name

**list-cities.ts:**
```typescript
export async function listCities(countryId: string, stateId: string): Promise<Array<{
  id: string;
  name: string;
}>>
```
- Llama `rpc_geo_list_cities(country_id, state_id)` (YA EXISTE)
- Retorna sorted by name

### T-06-09: Type definitions
**Archivo:** `types/forms.ts`

```typescript
export interface CreateStoreInput {
  // Step 1
  name: string;
  phone_country_code?: string;
  phone_number?: string;
  country: string;
  state: string;
  city: string;
  google_maps_url: string;
  latitude?: number;
  longitude?: number;
  address?: string;

  // Step 2
  responsible_first_name: string;
  responsible_last_name: string;
  responsible_phone_country_code?: string;
  responsible_phone_number?: string;
  responsible_email: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface State {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}
```

## Criterios de aceptación
- Formulario multi-step matches Figma design pixel-perfect
- Validación geografía cascading funciona correctamente
- Form validation previene invalid submissions (client + server)
- rpc_create_store se llama via server action con todos los parámetros
- Success: redirect a /tiendas con toast notification éxito
- Error: muestra error user-friendly, preserva form data, permite reintentar
- Cancel retorna a tiendas list sin cambios
- Back button (step 1) preserva data al volver
- Progress bar visual updates with step
- Phone inputs aceptan intl format (country code + number)
- Loading indicators mientras submit en progress
- Todos los textos i18n ready (es, en)
- Mobile responsive: form wraps en mobile, inputs full-width

## Dependencias
- Etapa 04 (layout components, PageActionBar, StepProgress)
- Etapa 05 (navegación back a tiendas, tipos Store)
- Etapa 01 (CreateStoreInput types)
- RPCs disponibles: rpc_geo_list_countries, rpc_geo_list_states, rpc_geo_list_cities, rpc_create_store
- React Hook Form + Zod para validación

## Notas de implementación
- Usar react-hook-form para form state management (mejor que Zustand para forms)
- useFormContext para acceder form state en step components
- Google Maps Autocomplete API opcional para dirección (plus cost)
- Alternativa: simple text input con lat/long manual entry
- Date formatting i18n usando date-fns
- Phone formatting usar libphonenumber-js
- Cascading selects: implementar en componente GeographySelects
- Error boundaries para fallos de API
- Retry logic para server actions si fallan
- Toast notifications: success/error messages (usar sonner o similar)
- Optimistic updates: opcional, puede esperar RPC response
- URL: /tiendas/nueva (singular) o /tiendas/new? Seguir convención existente
