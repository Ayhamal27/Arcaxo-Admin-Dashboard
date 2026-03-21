# Etapa 08 — Crear Nuevo Usuario

## Objetivo
Build the multi-step form for registering new users with role assignment and geographic location selection. Integrates with Supabase Auth to create user accounts.

## Figma References
- Form Step 1: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=288-817
- Form Step 2: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=288-1175

## Design Specs

### Step 1 — "Datos generales del usuario" (Paso 1/2)
- Breadcrumb: arcaxo/ > Usuarios > Crear nuevo usuario
- Progress indicator: "Paso 1/2" with visual step progress
- Fields (2-column responsive grid):
  - **Left Column**:
    - Nombre (text input, required, placeholder "Ingrese el nombre")
    - Apellido (text input, required, placeholder "Ingrese el apellido")
    - Cedula de identidad (text input, optional, placeholder "Ej: V12345678")
  - **Right Column**:
    - Numero Telefonico (country code selector + phone number input, optional, placeholder "+1 (305) 123-4567")
    - Correo Electronico (email input, required, placeholder "usuario@ejemplo.com")
    - Direccion (text input, optional, placeholder "Calle 123, Apartamento 4")
- Action buttons: "Cancelar" (secondary/outline) + "Siguiente" (primary blue)
- Form validation: inline error messages below fields
- Cancel navigates back to users list

### Step 2 — "Rol de usuario y asignacion de zona" (Paso 2/2)
- Progress indicator: "Paso 2/2" with visual step progress
- Back button: "Atrás" (secondary) to return to Step 1 (preserves field values)
- Fields (2-column responsive grid):
  - **Left Column**:
    - Rol (dropdown required, options: Propietario, Administrador, Gestor, Visualizador, Propietario de Tienda, Instalador)
    - País (dropdown required, loads countries from geography RPC)
  - **Right Column**:
    - Estado (dropdown required, cascades from País selection, loads states from geography RPC)
    - Ciudad (dropdown required, cascades from Estado selection, loads cities from geography RPC)
- Action buttons: "Cancelar" (secondary) + "Crear usuario" (primary blue, shows loading spinner when submitting)
- Cancel navigates back to users list (confirms if form has unsaved changes)

### Typography & Styling
- Page title: Poppins SemiBold, 28px, #101820
- Step label: Poppins Medium, 14px, #9CA3AF
- Field labels: Poppins SemiBold, 14px, #101820, 8px bottom margin
- Input fields: Poppins Regular, 14px, border #DAE1E9, focus border #0000FF
- Error text: Poppins Regular, 12px, #FF4163
- Success text: Poppins Regular, 12px, #228D70
- Buttons: Poppins Medium, 14px
- Primary button: bg #0000FF, text white, hover: darker blue
- Secondary button: border #101820, text #101820, hover: light background

## Tareas

### T-08-01: Página de creación multi-step
- File: `app/[locale]/(dashboard)/usuarios/nuevo/page.tsx`
- Server component that renders ClientNewUserPage
- Breadcrumb: arcaxo/ > Usuarios > Crear nuevo usuario
- Page state: manages current step (1 or 2)
- Uses StepProgress component from stage 04 to show visual progress
- Layout: Form centered in content area with max-width 600px
- On successful creation: redirect to users list with toast notification

### T-08-02: Step 1 — Datos personales (Client Component)
- File: `app/components/users/NewUserStep1.tsx`
- React component with React Hook Form + Zod validation
- Form schema:
  ```typescript
  const step1Schema = z.object({
    first_name: z.string().min(1, "El nombre es requerido").max(50),
    last_name: z.string().min(1, "El apellido es requerido").max(50),
    email: z.string().email("Correo electrónico inválido").min(1, "Requerido"),
    phone_country_code: z.string().optional().nullable(),
    phone_number: z.string().optional().nullable(),
    identity_document: z.string().optional().nullable().max(30),
    address: z.string().optional().nullable().max(200),
  })
  ```
- Fields:
  - Name: text input with real-time validation
  - Last name: text input with real-time validation
  - Email: email input with real-time validation (visual indicator: valid/invalid)
  - Phone: reuses PhoneInput component from stage 06
  - Identity document: optional text input
  - Address: optional textarea (2 lines)
- Buttons:
  - "Cancelar": onClick → navigate back to /usuarios with confirmation if form dirty
  - "Siguiente": onClick → validate form, call onNext callback with form data
- Error display: inline error messages below each field
- Loading state: button disabled and shows spinner during submission
- Props:
  ```typescript
  interface NewUserStep1Props {
    onNext: (data: Step1Data) => void
    isLoading?: boolean
    initialData?: Partial<Step1Data>
  }
  ```

### T-08-03: Step 2 — Rol y zona (Client Component)
- File: `app/components/users/NewUserStep2.tsx`
- React component with React Hook Form + Zod validation
- Form schema:
  ```typescript
  const step2Schema = z.object({
    role: z.enum(['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer']),
    country_id: z.number().int().positive("País requerido"),
    state_id: z.number().int().positive("Estado requerido"),
    city_id: z.number().int().positive("Ciudad requerida"),
  })
  ```
- Fields:
  - Role: dropdown with role options (mapped from enum to display names)
  - Country: dropdown (loads from rpc_get_countries via server action)
  - State: cascading dropdown (disabled until country selected, loads from rpc_get_states_by_country)
  - City: cascading dropdown (disabled until state selected, loads from rpc_get_cities_by_state)
- Cascading behavior:
  - Selecting country clears state and city selections
  - Selecting state clears city selection
  - Each dropdown shows loading state while fetching options
  - Each dropdown disables if parent is not selected
- Buttons:
  - "Atrás": onClick → onBack callback, returns to step 1 preserving all step 1 data
  - "Cancelar": onClick → navigate back to /usuarios with confirmation if form dirty
  - "Crear usuario": onClick → validate form, call onSubmit callback, shows loading spinner
- Props:
  ```typescript
  interface NewUserStep2Props {
    onBack: () => void
    onSubmit: (data: Step2Data) => void
    isLoading?: boolean
    initialData?: Partial<Step2Data>
  }
  ```

### T-08-04: Server Action para crear usuario
- File: `app/actions/users/create-user.ts`
- TWO-STEP atomic creation process:

  **Step 1: Create Supabase Auth User**
  - Uses Supabase Admin API (via `createClient` with service_role secret key)
  - Call: `supabase.auth.admin.createUser({...})`
  - Parameters:
    - `email`: from form Step 1
    - `password`: generate random 16-character temporary password
    - `email_confirm`: true (auto-confirm to skip verification email)
    - `user_metadata`: { first_name, last_name } (store for future reference)
  - Returns: new user_id from auth.users table
  - On error: return detailed error message, do NOT create profile

  **Step 2: Create User Profile**
  - After Step 1 succeeds, call `rpc_upsert_user_profile` (YA EXISTE) with:
    - `p_user_id` (required): user_id from auth.users (MUST exist in auth.users)
    - `p_first_name` (required): from Step 1
    - `p_last_name` (required): from Step 1
    - `p_role` (required): from Step 2
    - `p_status` (required): 'active'
    - `p_city_id` (required): from Step 2
    - `p_agent_scope` (optional): derived from role (see mapping below)
    - `p_phone_country_code` (optional): from Step 1
    - `p_phone_number` (optional): from Step 1
    - `p_identity_document` (optional): from Step 1
    - `p_address` (optional): from Step 1
  - Email syncs from auth.users automáticamente via RPC trigger
  - Geographic fields (city_name, state_name, country_code) derived from city_id via trigger
  - Returns: user_id, result, error
  - On error: ROLLBACK both auth user and profile creation

  **Agent scope mapping from role:**
  ```typescript
  const agentScopeByRole: Record<UserRole, AgentScope> = {
    'owner': 'company',      // full access
    'admin': 'company',      // full access
    'manager': 'assigned_stores',
    'installer': 'assigned_stores',
    'store_owner': 'assigned_stores',
    'viewer': 'assigned_stores',  // read-only
  }
  ```

  **Rollback on failure:**
  - If profile creation fails after auth user created: attempt to delete the auth user immediately
  - Log deletion success or failure for debugging
  - Return error message to client

  **Optional: Send welcome email**
  - After successful creation: send transactional email with:
    - User's email address
    - Temporary password
    - Link to login page
    - Instructions to change password on first login
  - Use Supabase's email provider or custom email service
  - Email failure should NOT rollback user creation (non-blocking)

**RPC EXISTENTE:** `rpc_upsert_user_profile`
- Crea o actualiza perfil de usuario
- Auth.users entry DEBE existir antes de llamar este RPC
- Email se obtiene de auth.users automáticamente via trigger
- Geographic data (city_name, state_name, country_code) se puebla desde city_id via trigger
- Solo owner/admin pueden ejecutar esta RPC

- Type safety:
  ```typescript
  interface CreateUserRequest {
    step1: Step1Data
    step2: Step2Data
  }

  interface CreateUserResponse {
    success: boolean
    user_id?: string
    email?: string
    error?: string
  }
  ```
- Error handling:
  - Email already exists: return "Email ya está registrado"
  - Invalid role: return "Rol no válido"
  - Invalid city_id: return "Ciudad no existe"
  - Auth API error: return sanitized error message
  - Profile creation error: attempt rollback, return error
  - Network error: return "Error al crear usuario, intente nuevamente"

### T-08-05: Validación server-side
- **Email uniqueness**: Before creating auth user, check if email exists in auth.users (use `auth.users` query or dedicated RPC)
  - If exists: return error "Este correo electrónico ya está registrado"
- **Role validation**: Verify role is in allowed list ['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer']
  - If invalid: return error "Rol no válido"
- **Geography validation**:
  - Verify country_id exists via rpc_get_countries
  - Verify state_id exists via rpc_get_states_by_country for selected country
  - Verify city_id exists via rpc_get_cities_by_state for selected state
  - If any invalid: return specific error message
- **Phone validation** (optional but if provided):
  - Validate country code format (e.g., "+1", "+58")
  - Validate phone number matches country's format using libphonenumber-js
  - Store normalized phone number (digits only)
- **Name validation**:
  - Trim whitespace from first_name and last_name
  - Reject names with only whitespace
  - Reject names with special characters (alphanumeric + spaces allowed)

## Client-side Form Management

### Multi-step State (Page-level)
- Current step: number (1 or 2)
- Step 1 data: cached in memory (do NOT persist to URL to avoid leaking emails)
- Step 2 data: cached in memory
- isLoading: boolean during form submission
- formErrors: Record<string, string> for server-side errors

### Local Storage (Optional)
- Option to persist form data to localStorage with 10-minute expiry
- Auto-restore on page reload (if within 10 min window)
- Clear on successful submission
- Clear on user logout

## Criterios de aceptación
- Multi-step form UI matches Figma design exactly
- Step 1 validates required fields (name, last name, email) before allowing "Siguiente"
- Step 1 shows real-time validation errors below fields
- Step 1 cancel button confirms with user before navigating away (if form has data)
- "Siguiente" button navigates to Step 2 and preserves Step 1 data
- Step 2 displays role dropdown with all 6 role options
- Step 2 displays country dropdown populated from rpc_get_countries
- Step 2 state dropdown cascades from country selection (disabled if no country)
- Step 2 city dropdown cascades from state selection (disabled if no state)
- Cascading dropdowns show loading state while fetching data
- "Atrás" button returns to Step 1 with all Step 1 data preserved
- "Atrás" and "Cancelar" buttons ask for confirmation if form modified
- "Crear usuario" validates Step 2 required fields before submission
- "Crear usuario" button shows loading spinner and disables during submission
- Server action creates auth.users entry via Supabase Admin API
- Server action creates user profile via rpc_upsert_user_profile
- User creation is atomic: both auth user AND profile created, or neither (rollback on error)
- On success: user created with email, temporary password, active status
- On success: redirect to users list (T-07-01) with toast notification "Usuario creado exitosamente"
- On error: show error toast with specific error message
- Email uniqueness validated: reject duplicate emails
- Role and geographic data validated server-side
- Welcome email sent to new user (if configured)
- No sensitive data (email, password) logged or exposed in error messages

## Dependencias
- Etapa 04 (layout, StepProgress component, form components)
- Etapa 06 (PhoneInput component, GeographySelects helper functions, cascading dropdown logic)
- Etapa 01 (UserRole enum, AgentScope enum, user types)
- Etapa 07 (users list page for redirect on success)
- Supabase Admin SDK configured with service_role API key
- RPCs disponibles: rpc_geo_list_countries, rpc_geo_list_states, rpc_geo_list_cities, rpc_upsert_user_profile
- libphonenumber-js library for phone validation (npm: libphonenumber-js)
