# Etapa 00 — Base del Proyecto

Inicialización del proyecto Next.js, configuración de variables de entorno, setup multi-idioma (next-intl), sistema de temas, dependencias core, Docker, y arquitectura base de Supabase.

## Objetivo

Establecer las bases técnicas del proyecto Arcaxo Admin Dashboard con un servidor Next.js completamente configurado, integración segura con Supabase auto-hospedado, soporte para español/inglés, sistema de diseño de Tailwind + shadcn/ui, y una arquitectura de carpetas escalable lista para las siguientes etapas de desarrollo.

---

## Tareas

### T-00-01: Inicializar proyecto Next.js

Crear el proyecto Next.js con configuración estándar de TypeScript, Tailwind CSS, App Router y directorio src/.

**Pasos:**
1. Ejecutar: `npx create-next-app@latest arcaxo-admin --typescript --tailwind --app --src-dir --eslint --no-git`
2. Seleccionar opciones:
   - TypeScript: Sí
   - ESLint: Sí
   - Tailwind CSS: Sí
   - src/ directory: Sí
   - App Router: Sí
3. Eliminar archivos iniciales innecesarios (globals.css modificado más adelante)
4. Crear .gitignore con:
   ```
   .env.local
   .env*.local
   .DS_Store
   node_modules/
   .next/
   dist/
   *.log
   ```

**Configuración ESLint + Prettier:**
1. Instalar prettier: `npm install -D prettier eslint-config-prettier`
2. Crear .prettierrc.json:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2,
     "trailingComma": "es5",
     "arrowParens": "always",
     "printWidth": 100
   }
   ```
3. Actualizar .eslintrc.json para extender prettier
4. Crear script en package.json: `"format": "prettier --write ."`

**Verificación:**
- `npm run dev` ejecuta sin errores en http://localhost:3000
- ESLint y Prettier no lanzan warnings críticos

---

### T-00-02: Instalar dependencias core

Instalar todas las librerías requeridas del stack especificado.

**Supabase y Auth:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**State Management + Data Fetching:**
```bash
npm install zustand @tanstack/react-query
```

**Internacionalización:**
```bash
npm install next-intl
```

**UI Components + Icons:**
```bash
npm install @radix-ui/react-slot clsx class-variance-authority lucide-react
npm install -D shadcn-ui
```
Ejecutar: `npx shadcn-ui@latest init` con config por defecto.

**Forms + Validation:**
```bash
npm install react-hook-form zod @hookform/resolvers
```

**Maps (para etapa 10, instalar ahora):**
```bash
npm install @react-google-maps/api @googlemaps/js-api-loader
npm install -D @types/google.maps
```

**Utilities:**
```bash
npm install lodash-es date-fns
npm install -D @types/lodash-es
```

**Development:**
```bash
npm install -D @types/node @types/react @types/react-dom typescript
```

**Versiones exactas (como reference):**
- @supabase/supabase-js: ^2.38.0
- @supabase/ssr: ^0.0.10
- zustand: ^4.4.0
- @tanstack/react-query: ^5.28.0
- next-intl: ^3.9.0
- next: ^15.0.0 (latest)
- react: ^19.0.0
- react-dom: ^19.0.0

**Verificación:**
```bash
npm list | grep -E "(supabase|zustand|react-query|next-intl|shadcn)"
```
Todos los packages deben estar instalados.

---

### T-00-03: Configurar variables de entorno

Crear archivos de configuración de entorno segura. El archivo `.env.local` NUNCA debe ser commiteado.

**Crear `.env.local` (git-ignored):**
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-supabase-instance].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps (para Stage 10)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...

# App Config
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_VERSION=0.1.0

# Node Environment
NODE_ENV=development
```

**Crear `.env.example` (para documentación):**
```
# Supabase (obtener de https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # NUNCA exponer al navegador

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# App Config
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_VERSION=0.1.0

# Node Environment
NODE_ENV=development
```

**Importante:**
- `NEXT_PUBLIC_*` variables son públicas en el cliente
- `SUPABASE_SERVICE_ROLE_KEY` DEBE ser accedida solo en server (servidor Node.js)
- En server actions y API routes: usar `process.env.SUPABASE_SERVICE_ROLE_KEY`
- En componentes cliente: nunca intentar acceder a service role
- Validar en `next.config.js` que service role no esté disponible en cliente

---

### T-00-04: Configurar cliente de Supabase

Crear clients separados para servidor (con service role) y cliente (con anon key). Implementar middleware para refresh de sesión.

**Crear `lib/supabase/server.ts` (Server-side client con service role):**
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const createServerClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
};

export const serverClient = createServerClient();
```

**Crear `lib/supabase/client.ts` (Browser client con anon key - auth solo):**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

export const createBrowserClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
```

**Crear `lib/supabase/middleware.ts` (Session refresh):**
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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

  // Refresh session
  await supabase.auth.getSession();

  return response;
};
```

**Crear `middleware.ts` en raíz del proyecto:**
```typescript
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Documentación importante:**
- Server client usa service_role_key: acceso total a tablas, puede ejecutar RPCs con privilegios
- Browser client usa anon key: acceso limitado, solo para autenticación
- TODOS los RPCs y queries a datos DEBEN ir a través de server actions
- El middleware refresca la sesión en cada request
- Cookies están configuradas como httpOnly (seguras)

---

### T-00-05: Configurar i18n (next-intl)

Implementar soporte multi-idioma con next-intl para español (es) e inglés (en).

**Crear `src/middleware.i18n.ts`:**
```typescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

export const config = {
  matcher: ['/', '/(es|en)/:path*'],
};
```

**Crear `next.config.js` (actualizar con i18n config):**
```javascript
const withNextIntl = require('next-intl/build');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

module.exports = withNextIntl(nextConfig);
```

**Crear estructura de mensajes `src/messages/`:**
```
messages/
├── es.json
└── en.json
```

**`src/messages/es.json` (template inicial):**
```json
{
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Agregar",
    "back": "Atrás",
    "next": "Siguiente"
  },
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "rememberMe": "Recuérdame",
    "signIn": "Iniciar sesión",
    "invalidCredentials": "Correo o contraseña inválidos"
  },
  "nav": {
    "dashboard": "Panel de Control",
    "reports": "Informes",
    "aerial": "Vista Aérea",
    "stores": "Tiendas",
    "devices": "Dispositivos",
    "users": "Usuarios",
    "settings": "Configuración"
  }
}
```

**`src/messages/en.json` (template inicial):**
```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "back": "Back",
    "next": "Next"
  },
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot your password?",
    "rememberMe": "Remember me",
    "signIn": "Sign In",
    "invalidCredentials": "Invalid email or password"
  },
  "nav": {
    "dashboard": "Dashboard",
    "reports": "Reports",
    "aerial": "Aerial View",
    "stores": "Stores",
    "devices": "Devices",
    "users": "Users",
    "settings": "Settings"
  }
}
```

**Crear `src/app/[locale]/layout.tsx` (root layout con i18n):**
```typescript
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

export const metadata = {
  title: 'Arcaxo Admin Dashboard',
  description: 'IoT Sensor Installation Management',
};

export function generateStaticParams() {
  return [{ locale: 'es' }, { locale: 'en' }];
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;

  try {
    messages = await getMessages();
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Usar en componentes:**
```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations();
  return <button>{t('common.save')}</button>;
}
```

---

### T-00-06: Configurar tema y design tokens

Implementar Tailwind CSS con colores Figma, fonts Poppins, y variables CSS para el design system.

**Actualizar `tailwind.config.ts`:**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0000FF',
        secondary: '#101820',
        tertiary: '#DAE1E9',
        warning: '#FF4163',
        success: '#228D70',
        start: '#FADC45',
        info: '#00B2FF',
        'dark-a': '#17222E',
        'dark-b': '#202F40',
        'dark-c': '#38506A',
        'grey-a': '#223243',
        'grey-b': '#2E435A',
        'grey-c': '#557290',
        'grey-d': '#82A2C2',
        'grey-e': '#C9DCEF',
      },
      fontFamily: {
        poppins: ['var(--font-poppins)'],
      },
      fontSize: {
        '2xl': ['25px', { fontWeight: '600', fontFamily: 'Poppins' }], // SemiBold
        'base': ['16px', { fontWeight: '400', fontFamily: 'Poppins' }], // Regular
        'button': ['16px', { fontWeight: '500', fontFamily: 'Poppins' }], // Medium
      },
      spacing: {
        gutter: '15px',
        'gutter-mobile': '20px',
      },
      gridTemplateColumns: {
        desktop: 'repeat(12, minmax(0, 1fr))',
        tablet: 'repeat(6, minmax(0, 1fr))',
        mobile: 'repeat(2, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
```

**Actualizar `src/app/globals.css`:**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

:root {
  --font-poppins: 'Poppins', sans-serif;

  /* Primary Colors */
  --color-primary: #0000FF;
  --color-secondary: #101820;
  --color-tertiary: #DAE1E9;

  /* Status Colors */
  --color-warning: #FF4163;
  --color-success: #228D70;
  --color-start: #FADC45;
  --color-info: #00B2FF;

  /* Dark Palette */
  --color-dark-a: #17222E;
  --color-dark-b: #202F40;
  --color-dark-c: #38506A;

  /* Grey Palette */
  --color-grey-a: #223243;
  --color-grey-b: #2E435A;
  --color-grey-c: #557290;
  --color-grey-d: #82A2C2;
  --color-grey-e: #C9DCEF;

  /* Neutral */
  --color-white: #FFFFFF;
  --color-bg: #FBFBFF;

  /* Spacing */
  --gutter: 15px;
  --gutter-mobile: 20px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: var(--font-poppins);
}

body {
  background-color: var(--color-bg);
  color: var(--color-grey-a);
  line-height: 1.6;
}

@media (max-width: 768px) {
  :root {
    --gutter: var(--gutter-mobile);
  }
}
```

**Grid System Documentation en `src/lib/grid.ts`:**
```typescript
/**
 * Grid System Specifications
 *
 * Desktop: 12 columns, 1920x1080 base
 * - Column width: ~142px
 * - Gutter: 15px
 * - Margin: auto-centered
 *
 * Tablet: 6 columns, 768px+
 * - Column width: flexible
 * - Gutter: 15px
 *
 * Mobile: 2 columns
 * - Column width: flexible
 * - Gutter: 20px
 * - Margin: 18px left/right
 */

export const GRID_COLUMNS = {
  DESKTOP: 12,
  TABLET: 6,
  MOBILE: 2,
};

export const GRID_GUTTER = {
  DESKTOP: 15,
  TABLET: 15,
  MOBILE: 20,
};

export const BREAKPOINTS = {
  MOBILE: 320,
  TABLET: 768,
  DESKTOP: 1920,
};
```

---

### T-00-07: Arquitectura de carpetas

Crear la estructura completa de directorios siguiendo convenciones Next.js App Router.

**Crear estructura de carpetas:**
```
src/
├── app/
│   ├── api/                          # API routes (si se necesitan)
│   ├── [locale]/
│   │   ├── (auth)/                   # Rutas públicas de auth
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── restore-account/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/              # Rutas protegidas
│   │   │   ├── layout.tsx            # Sidebar + main nav
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── tiendas/
│   │   │   │   ├── page.tsx          # Lista de tiendas
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Detalle de tienda
│   │   │   │   └── nuevo/
│   │   │   │       └── page.tsx
│   │   │   ├── dispositivos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── usuarios/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── nuevo/
│   │   │   │       └── page.tsx
│   │   │   ├── vista-aerea/
│   │   │   │   └── page.tsx
│   │   │   ├── informes/
│   │   │   │   └── page.tsx
│   │   │   └── configuracion/
│   │   │       └── page.tsx
│   │   ├── layout.tsx               # Root layout con i18n
│   │   └── not-found.tsx
│   ├── layout.tsx                    # Global layout
│   └── not-found.tsx
├── components/
│   ├── ui/                           # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── navbar.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── sidebar-menu.tsx
│   │   └── language-switcher.tsx
│   └── shared/
│       ├── page-header.tsx
│       ├── data-table.tsx
│       ├── form-wrapper.tsx
│       └── ...
├── lib/
│   ├── supabase/
│   │   ├── server.ts               # Server client con service role
│   │   ├── client.ts               # Browser client con anon key
│   │   ├── middleware.ts           # Session refresh
│   │   └── rpc.ts                  # Generic RPC helper (etapa 01)
│   ├── stores/
│   │   ├── auth-store.ts           # Zustand auth state (etapa 02)
│   │   └── ...
│   ├── auth/
│   │   └── permissions.ts          # RBAC utilities (etapa 02)
│   ├── utils/
│   │   ├── cn.ts                   # classnames utility
│   │   ├── format.ts               # Formatting utilities
│   │   └── ...
│   └── grid.ts                     # Grid system specs
├── actions/
│   ├── auth/
│   │   ├── login.ts                # Server action para login
│   │   ├── logout.ts
│   │   ├── restore.ts
│   │   └── session.ts
│   ├── stores/                     # Server actions para stores (etapa 04+)
│   ├── users/                      # Server actions para users (etapa 05+)
│   └── ...
├── types/
│   ├── database.ts                 # Tipos de Supabase (etapa 01)
│   ├── stores.ts
│   ├── profiles.ts
│   ├── sensors.ts
│   ├── geography.ts
│   ├── sessions.ts
│   └── ...
├── hooks/
│   ├── use-auth.ts                 # Hook para auth context
│   ├── use-permissions.ts          # Hook para RBAC (etapa 02)
│   ├── use-toast.ts                # Toast notifications
│   └── ...
├── messages/
│   ├── es.json                     # Spanish translations
│   └── en.json                     # English translations
├── middleware.ts                   # Session refresh + i18n
├── middleware.i18n.ts
├── env.ts                          # Zod schema para env vars (optional)
└── constants.ts                    # App constants
```

**Crear `src/lib/utils/cn.ts` (class name utility):**
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### T-00-08: Docker para desarrollo

Crear configuración de Docker para facilitar desarrollo local y CI/CD.

**Crear `Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**Crear `.dockerignore`:**
```
node_modules
npm-debug.log
.next
.git
.env.local
.env*.local
.DS_Store
coverage
dist
build
```

**Crear `docker-compose.dev.yml` (para desarrollo con Supabase local):**
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_SUPABASE_URL: http://supabase:8000
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - supabase
    networks:
      - arcaxo

  # Conectar con Supabase si está en otro docker-compose
  # Esta sección es reference; normalmente Supabase corre en otro proyecto
  # supabase:
  #   # ... configuración de supabase

networks:
  arcaxo:
    driver: bridge
```

**Instrucciones en `DOCKER.md`:**
```markdown
# Docker Development

## Build
```bash
docker build -t arcaxo-admin:latest .
```

## Run Development
```bash
docker-compose -f docker-compose.dev.yml up
```

## Connect to Supabase
Actualizar NEXT_PUBLIC_SUPABASE_URL en .env.local con la URL del contenedor Supabase.

## Stop
```bash
docker-compose down
```
```

---

### T-00-09: Reglas del proyecto

Crear documentación de convenciones y reglas de desarrollo para mantener consistencia.

**Crear `src/.cursorrules` (para Claude/Codebase):**
```
# Arcaxo Admin Dashboard - Cursor Rules

## Convenciones de Código

### TypeScript
- Siempre usar tipos explícitos
- Preferir interfaces para objetos
- Usar enums para valores constantes
- Archivos: SCREAMING_SNAKE_CASE para constantes, camelCase para variables

### React Components
- Functional components con 'use client' cuando sea necesario
- Props siempre tipados (no any)
- Destructure props en parámetros
- Componentes pequeños y reutilizables

### Server Actions
- Crear en src/actions/ con sufijo .ts
- Usar "use server" al inicio del archivo
- Validar entrada con Zod
- Retornar {success, data, error} siempre
- Nunca exponer Supabase logic al cliente

### Naming Conventions
- Archivos: kebab-case (button-primary.tsx)
- Carpetas: kebab-case
- Componentes React: PascalCase
- Variables/funciones: camelCase
- Tipos/Interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE

## Reglas de Supabase

### CRÍTICO: RPC-Only Rule
- TODO acceso a datos DEBE ser a través de RPCs
- NUNCA direct table access desde cliente o server actions
- NUNCA select() sobre tablas sensibles
- Todos los RPCs deben estar documentados en docs/rpc-reference.md

### Authentication
- Server role key NUNCA en cliente
- Anon key solo para auth en cliente
- Session refresh automático vía middleware
- HttpOnly cookies para tokens

### Server Actions Pattern
```typescript
'use server';

import { z } from 'zod';

const InputSchema = z.object({...});

export async function myAction(input: unknown) {
  try {
    const validated = InputSchema.parse(input);
    // Call RPC via serverClient
    const result = await callRpc('rpc_name', validated);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Estructura de Componentes

- Componentes pequeños (<100 líneas)
- Un componente por archivo
- Props bien tipadas
- Usar hooks para lógica reutilizable
- Preferir composition sobre props drilling

## Estilos

- Tailwind CSS para todo
- Custom CSS solo en casos excepcionales
- Variables CSS para valores dinámicos
- Mantener design tokens del Figma
- Poppins font para todo el proyecto

## i18n

- Usar useTranslations() en componentes client
- Mensajes en messages/[locale].json
- Llaves: namespaced (auth.login, common.save)
- Traducir todo texto visible

## Testing (fase futura)

- Jest + React Testing Library
- Tests para lógica crítica
- Tests para server actions
- Coverage mínimo 80%

## Commits

- Commit messages en inglés
- Formato: "feat: description" o "fix: description"
- Atomic commits (cambios lógicos únicos)
```

**Crear `ARCHITECTURE.md` con overview técnico:**
```markdown
# Arcaxo Admin Dashboard - Architecture

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand + React Query
- **Backend:** Supabase (self-hosted)
- **i18n:** next-intl
- **Auth:** Supabase Auth (server-side via @supabase/ssr)

## Key Principles

### 1. Server-First Security
- All Supabase logic on server
- Service role key never in browser
- Session management via httpOnly cookies
- Middleware for token refresh

### 2. RPC-Only Data Access
- All queries through RPCs
- Never direct table selects
- RPCs validate permissions server-side

### 3. Type Safety
- Full TypeScript from DB to UI
- Zod for runtime validation
- Generated types from Supabase schema

### 4. Internationalization
- Spanish default, English fallback
- All text in messages JSON
- useTranslations() hook

## Data Flow

```
[Client Component]
    ↓
[Form + Server Action]
    ↓
[RPC via serverClient]
    ↓
[Supabase DB]
    ↓
[Response back to Client]
```

## Folder Structure

See T-00-07 for detailed structure.

## Environment Variables

See T-00-03 for configuration.
```

---

## Criterios de aceptación

- [x] Proyecto Next.js creado con TypeScript, Tailwind, App Router, src/
- [x] ESLint y Prettier configurados y funcionando
- [x] Todas las dependencias core instaladas sin conflictos
- [x] Archivo .env.local existe con todas las variables requeridas (local)
- [x] Archivo .env.example documenta todas las variables
- [x] Supabase client (server) y client (browser) funcionan sin errores
- [x] Middleware de sesión actualiza tokens automáticamente
- [x] next-intl configurado con es/en y estructura de mensajes
- [x] Tailwind CSS incluye todos los colores Figma
- [x] Poppins font cargada correctamente
- [x] Estructura de carpetas completa según T-00-07
- [x] Archivo .cursorrules documenta convenciones
- [x] Dockerfile y docker-compose.dev.yml funcionan
- [x] `npm run dev` ejecuta en http://localhost:3000 sin errores
- [x] `npm run build` completa sin warnings críticos
- [x] TypeScript strict mode activo sin errores

---

## Dependencias (etapas posteriores)

Esta etapa es independiente y no depende de ninguna otra. Las siguientes etapas dependen de esta:

- Etapa 01: Modelado de Datos y RPCs de Supabase
- Etapa 02: Sistema de Autenticación
- Etapa 03: Páginas de Autenticación
- Etapa 04+: Features del Dashboard

---

## Figma referencias

- **Style Guide:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2200
- **Typography Guide:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=230-2072
- **Color Palette:** Colores listados en T-00-06
- **Grid System:** Especificaciones en T-00-06

---

## Notas adicionales

- Keep this project isolated; never modify arcaxo-supabase directory
- Service role key is extremely sensitive; rotate regularly
- Document any new environment variables in .env.example immediately
- Consider adding pre-commit hooks to prevent .env.local commits
- Setup GitHub Secrets for CI/CD with environment variables
