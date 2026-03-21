# Etapa 04 — Skeleton de Páginas

## Objetivo
Create the base page structure used across all dashboard pages: sidebar, navbar, header, breadcrumbs, content area, tables, search sections, and grid elements.

## Referencias de Figma
- Main layout: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2429
- Style Guide: https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2200

## Tareas

### T-04-01: Dashboard Layout Component
**Archivo:** `/[locale]/(dashboard)/layout.tsx`

- Estructura: Fixed Navbar (top, full width, h-[80px]) + Fixed Sidebar (left, w-[317px], below navbar) + Main content (scrollable, right of sidebar, below navbar)
- Sidebar collapses a solo iconos en tablet (768-1024px)
- Main content: padding-left 368px, padding-top 80px + 20px gap
- Background: #FBFBFF
- El layout actúa como wrapper para todas las páginas dashboard
- Implementa responsivo: mobile (sidebar oculto, hamburger toggle), tablet (sidebar collapse), desktop (sidebar full)

### T-04-02: Navbar Component
**Archivo:** `components/layout/Navbar.tsx`

- Fixed top, z-50, h-[80px], bg-white, border-b border-[#E2DFDF]
- Izquierda: menú hamburguesa (3 líneas, visible mobile/tablet) + logo Arcaxo (188x35px)
- Derecha: campana notificaciones con badge (contador), avatar usuario círculo (35x35, bg-[#53009C], letra inicial blanca, Poppins)
- Responsivo: hamburguesa alterna visible/oculta de sidebar en tablet
- Avatar clickeable: abre dropdown con opciones "Mi perfil" y "Cerrar sesión"
- Notificaciones: badge rojo con contador dinámico
- Importa user data desde auth context (Zustand o Server Actions)

### T-04-03: Sidebar Component
**Archivo:** `components/layout/Sidebar.tsx`

- Fixed left, w-[317px], h-full (below navbar), bg-white, border-r border-[#E2DFDF]
- Items de menú: icon (24px) + label (Poppins Regular 21.5px), gap 41px entre icon y text
- Estado activo: left border 7px solid #0000FF, icon y text color #0000FF, font SemiBold
- Estado inactivo: text black, font Regular, icon gris #82A2C2
- Orden de items: Dashboard, Informes, Vista Aérea, Tiendas, Dispositivos, Usuarios, [espaciador], Configuración (al final)
- Icons: usar lucide-react equivalentes (LayoutDashboard, FileText, Map, Store, Cpu, Users, Settings)
- Cada item es un Next.js Link a la ruta respectiva
- Highlight activo basado en current pathname
- Scroll vertical si items exceden viewport
- Collapse a solo iconos en tablet con tooltip al hover

### T-04-04: Breadcrumb Component
**Archivo:** `components/layout/Breadcrumb.tsx`

- Posición: top del área main content
- Formato: [Logo mini Arcaxo] > [Nombre sección]
- Logo Arcaxo: versión small, 75x14px
- Separador: ícono ">" (triángulo rotado)
- Nombre sección: Poppins SemiBold 19px #101820
- Anidado: puede mostrar múltiples niveles (ej: Tiendas > Crear nueva tienda)
- Dinámico: se actualiza basado en pathname actual
- Links a secciones previas son clickeables

### T-04-05: Page Action Bar Component
**Archivo:** `components/layout/PageActionBar.tsx`

- Contenedor flex horizontal debajo del breadcrumb
- Slots para: botón acción primaria, input búsqueda, filtros, botón reset
- Botón primario: bg-[#0000FF], text-white, h-[50px], rounded-[10px], Poppins Medium 16px, icon + text
- Input búsqueda: bg-white, border border-[#D0D5DD], h-[50px], rounded-[10px], search icon + placeholder
- Dropdown filtros: bg-white, border border-[#BDC2C5], h-[50px], rounded-[10px], icon + text
- Botón reset: bg-white, border border-[#BDC2C5], h-[50px], w-[64px], rounded-[10px], reset icon
- Responsive: wraps en mobile a layout vertical
- Acepta children como slots para máxima flexibilidad

### T-04-06: Data Table Component
**Archivo:** `components/shared/DataTable.tsx`

- Contenedor: bg-white, rounded-[15px], border border-[#E5E5EA], px-[20px] py-[25px]
- Row header: Poppins SemiBold 18px #161616, columnas ordenables con arrow icon
- Data rows: h-[96px], flex items-center, gap-[52px] entre columnas
- Status indicator: círculo coloreado 20px (green #228D70, orange #FADC45, red #FF4163)
- Thumbnail imagen: 71x71px, rounded-[5px]
- Text: Poppins Regular 20px #191919 (primary), 15px #333 (secondary)
- Location info: nombre ciudad + Google Maps link truncado en azul
- Columna acciones: botón "Ampliar" (border blue, rounded-[8px]), edit icon, phone icon (bg-[#0000FF])
- Configurable columns via props (ColumnDef[])
- Props: data, columns, isLoading, isEmpty, onRowClick
- TypeScript generic: DataTable<T> para flexibilidad con any data type
- Sorting: implementa sorting en headers si columna es sortable
- Integración con React Query loading states

### T-04-07: Pagination Component
**Archivo:** `components/shared/Pagination.tsx`

- Centrado debajo de table
- Layout: "Previous" text + page numbers + "Next" text
- Página activa: bg-[#0000FF] text-white rounded-[8px] px-[13px] py-[11px]
- Páginas inactivas: text-[#414141]
- Font: PT Sans Regular 17px
- Props: currentPage, totalPages, onPageChange
- Previous/Next buttons disabled si en primera/última página
- Mostrar página numbers cercanas (ej: si estás en 5, mostrar 3-7)

### T-04-08: Empty State Component
**Archivo:** `components/shared/EmptyState.tsx`

- Mostrado cuando table no tiene data
- Icon (ilustración o lucide-react)
- Mensaje descriptivo (ej: "No hay tiendas registradas")
- Botón acción opcional (ej: "Crear primera tienda")
- Props: icon, title, description, actionLabel, onAction

### T-04-09: Loading Skeleton
**Archivo:** `components/shared/TableSkeleton.tsx`

- Placeholder animado de rows que match tabla layout
- Usar shadcn/ui Skeleton component
- Mostrar ~6-8 skeleton rows
- Animación pulse para simular loading

## Criterios de aceptación
- Layout matches Figma pixel-perfect (tolerancia ±2px)
- Navegación sidebar funciona con active state highlighting
- Responsivo: sidebar collapse en tablet, hamburger toggle en mobile
- Table component es reusable across todas list pages
- Pagination es funcional y sincroniza con URL params
- Todos los componentes usan i18n para text
- Dark mode compatible (si es requerimiento futuro, structure prepared)
- Accesibilidad: ARIA labels, keyboard navigation en dropdown/selects

## Dependencias
- Etapa 00 (theme setup, fonts, shadcn/ui components)
- Etapa 02 (auth middleware, layout necesita authenticated user)
- Zustand + React Query setup para data fetching

## Notas de implementación
- Usar Next.js App Router (layout.tsx en app/)
- Server Components para layout estático, Client Components para interactivos (Navbar, Sidebar)
- Importar icons desde lucide-react
- Tailwind CSS para styling (no CSS modules)
- Font Poppins debe estar cargada en _app o layout root
- usePathname() de next/navigation para active state
- useRouter() para navegación
