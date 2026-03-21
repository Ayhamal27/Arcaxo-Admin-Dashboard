# Etapa 10 — Vista Aérea (Fly View)

## Objetivo
Build the map view page that visualizes stores and installer locations across the network using Google Maps. Optimizes for performance and memory management with large datasets (500+ markers total).

## Figma References
- No specific Figma design for map view
- Menu item "Vista Aérea" is in sidebar navigation (from stage 03)

## Design Specs

### Page Layout
- Route: `/[locale]/(dashboard)/vista-aerea/page.tsx`
- Breadcrumb: arcaxo/ > Vista Aérea
- Full-width map below breadcrumb, fills remaining viewport height
- Side panel (desktop) or bottom sheet (mobile) with controls
- No additional page margins around map (edge-to-edge except breadcrumb)

### Map View
- Background: Google Maps default street view
- Default center: center of all currently loaded stores or primary country center
- Default zoom: level 7 (entire country visible)
- Interactive: drag to pan, scroll wheel to zoom, touch-friendly pinch zoom
- Controls enabled:
  - Zoom control (+/−): top-right corner
  - Map type selector: top-right (Map, Satellite, Hybrid, Terrain)
  - Street View: DISABLED (hide Street View icon)

### Store Markers
- Custom marker pins with status color coding:
  - **New store** (new_store): blue pin (#0000FF)
  - **Operational** (operational): green pin (#228D70)
  - **Maintenance** (maintenance): orange/yellow pin (#FF9800)
  - **Inactive** (inactive): grey pin (#9CA3AF)
- Marker styling: custom SVG icon, 32x40px (standard map pin aspect)
- Marker clustering at low zoom (z < 9): use @googlemaps/markerclusterer
  - Cluster appearance: circular badge with count
  - Cluster colors: gradient from blue (few) to red (many)
  - On cluster click: zoom in to bounds

### Store Info Window
- Triggered: click on individual marker (not cluster)
- Content:
  - Store name: Poppins SemiBold, 16px, #101820
  - Status badge: colored chip (RoleBadge component style)
  - Address: Poppins Regular, 12px, #9CA3AF (truncate if long)
  - Devices count: "Dispositivos: 5 / 8" (installed / authorized)
  - Action button: "Ver detalles" link (blue, #00B2FF) → opens store detail page (stage 05)
- Positioning: top-center of map (avoid overlap with controls)
- Close on: click outside, click another marker, press Escape
- Max width: 300px

### Control Panel (Desktop Side Panel)
- Position: left side, overlaid on map, fixed width 280px
- Background: white semi-transparent rgba(255,255,255,0.95) or solid white with shadow
- Border-right: 1px #DAE1E9
- Scrollable content: max-height to fit viewport

**Panel sections:**
1. **Header**: "Filtros" title (Poppins SemiBold, 14px)
2. **Status filters**:
   - Checkboxes: "Nuevas tiendas", "Operacionales", "Mantenimiento", "Inactivas"
   - Each with colored square indicator (16x16px)
   - All checked by default
   - On change: filter markers, preserve zoom/pan, update marker count
3. **Store count indicator**:
   - Text: "Mostrando 47 tiendas" (Poppins Regular, 12px)
   - Updates in real-time as markers change
4. **Location actions**:
   - "Centrar en mi ubicación" button (neutral outline, full width)
   - Uses browser Geolocation API: navigator.geolocation.getCurrentPosition()
   - On success: pan and zoom to user location (zoom 12)
   - On error/denied: show toast "No se pudo acceder a tu ubicación"
   - Icon: map pin (16px) before text
5. **Search field**:
   - Placeholder: "Buscar tienda por nombre..."
   - Poppins Regular, 13px
   - Autocomplete dropdown from visible stores (filtered list)
   - On selection: highlight marker, zoom to it, show info window
   - Clear button (X icon) to reset

### Mobile Responsive
- Tablet (768px - 1024px): side panel remains left-side
- Mobile (<768px): control panel becomes bottom sheet
  - Sheet height: 200px (collapsed), expandable to 50% viewport on swipe
  - Or: hamburger menu button → opens panel as overlay sheet
  - Breadcrumb hidden or moved to top
  - Map takes full screen below top nav

## Tareas

### T-10-01: Página de Vista Aérea
- File: `app/[locale]/(dashboard)/vista-aerea/page.tsx`
- Server component that renders ClientMapView
- Breadcrumb: arcaxo/ > Vista Aérea
- Layout: full-width flex container, map fills remaining height
- Imports Google Maps with error boundary
- Props/Context: passes user's locale for map language

### T-10-02: Google Maps integration
- File: `app/components/map/ClientMapView.tsx`
- React client component
- Dependencies: `@react-google-maps/api` (npm install)
- Configuration:
  - API key: read from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable
  - Libraries: load ["marker", "markerclusterer", "places"] in useLoadScript
  - Error handling: show fallback UI if API fails to load
- GoogleMap component:
  - Zoom: default 7
  - Center: calculated from stores (getBounds of all markers)
  - Options:
    ```typescript
    const mapOptions = {
      zoomControl: true,
      mapTypeControl: true,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: false,  // disable Street View
      fullscreenControl: false,
      controlSize: 40,
      keyboardShortcuts: true,
      draggable: true,
      gestureHandling: 'auto',
    }
    ```
  - Style: dark theme optional (see Styling notes)
  - Event handlers: onBoundsChanged, onZoomChanged (debounced, see T-10-04)

### T-10-03: Store markers on map
- File: `app/components/map/StoreMarkers.tsx` (child component of ClientMapView)
- Data source: rpc_get_nearby_installer_stores (stage 05 existing RPC)
- Initial load on mount:
  - Default bounds: user's country or full world
  - Calculate center and radius from map bounds
  - Call server action (T-10-04) to fetch nearby stores
- Marker rendering:
  - Custom icon generation: createStoreMarkerIcon(status) function
  - Icon colors per status (see Design Specs)
  - Icon SVG: simple pin shape with status color fill
  - Sample SVG:
    ```jsx
    const createStoreMarkerIcon = (status) => ({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: getColorByStatus(status),
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    })
    ```
  - Or use custom image URL if server generates marker images
- Marker clustering:
  - Use @googlemaps/markerclusterer npm package
  - Initialize at zoom level 9 (clusters active below z9)
  - Cluster options:
    ```typescript
    const clusterOptions = {
      algorithm: new SuperClusterAlgorithm({maxZoom: 8}),
      renderer: {
        render: ({count, position}) => {
          // custom cluster badge
        },
      },
    }
    ```
  - Cluster click: zoom to cluster bounds with padding
- Marker click handler:
  - Prevent propagation (don't close if another marker clicked)
  - Open InfoWindow (T-10-05) for this marker
- Data caching: React Query with 30-second stale time

### T-10-04: Map viewport change handler
- File: `app/components/map/MapViewportManager.tsx` (or logic in ClientMapView)
- Debounce: 300ms before fetching new stores
- Triggers on:
  - Map bounds_changed event (drag/pan)
  - Zoom_changed event (scroll wheel or control button)
- Implementation:
  ```typescript
  const [viewportState, setViewportState] = useState({
    center: {lat, lng},
    radius: meters,
  })

  const handleBoundsChanged = useCallback(
    debounce(() => {
      const bounds = mapRef.current.getBounds()
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const center = bounds.getCenter()

      // Calculate radius: max distance from center to corners
      const radius = google.maps.geometry.spherical.computeDistanceBetween(
        center,
        ne
      )

      // Only fetch if viewport moved significantly
      if (hasSignificantChange(viewportState, {center, radius})) {
        fetchNearbyStores({
          latitude: center.lat(),
          longitude: center.lng(),
          radiusMeters: radius,
        })
      }
    }, 300),
    [viewportState]
  )
  ```
- Significance threshold:
  - Radius change > 10% OR
  - Center shift > 100 meters
  - Avoids unnecessary API calls during fine adjustments
- Server Action: `actions/map/get-nearby-stores.ts`
  - Input: latitude, longitude, radiusMeters, countryCode (optional)
  - Calls: rpc_get_nearby_installer_stores with dynamic params
  - Returns: paginated list of stores (limit 500 for performance)
  - If >500 stores in radius: return 500 closest, show warning toast

### T-10-04b: Server action for nearby installers
- File: `app/actions/map/get-nearby-installers.ts`
- Server action triggered on map bounds change (same debounce pattern as stores)
- Implementation:
  ```typescript
  'use server'
  export async function getNearbyInstallers(params: {
    centerLatitude: number
    centerLongitude: number
    countryCode: string
    radiusMeters?: number
    maxAgeMinutes?: number
    filterStatus?: string | null
    limit?: number
    offset?: number
  }) {
    return await callRpc('rpc_get_nearby_installers', {
      p_center_latitude: params.centerLatitude,
      p_center_longitude: params.centerLongitude,
      p_country_code: params.countryCode,
      p_radius_meters: params.radiusMeters ?? 50000,
      p_max_age_minutes: params.maxAgeMinutes ?? 480,
      p_filter_status: params.filterStatus ?? null,
      p_limit: params.limit ?? 100,
      p_offset: params.offset ?? 0,
    })
  }
  ```
- Returns: array of NearbyInstaller objects with distance_meters calculated by RPC
- React Query hook: `useNearbyInstallers(params)` with same caching strategy as stores (30sec stale time)
- Performance: default limit 100 installers per query (typically sparse dataset compared to stores)

### T-10-05: Store info popup
- File: `app/components/map/StoreInfoWindow.tsx`
- React component wrapping google.maps.InfoWindow
- Props: store data, onClose handler
- Content layout:
  - Header row: store name (Poppins SemiBold, 16px) + close button (X icon)
  - Status badge: colored chip (Poppins Regular, 12px)
  - Address: text truncated to 1 line (Poppins Regular, 12px, #9CA3AF)
  - Divider line (#DAE1E9)
  - Stats row: Devices count (Poppins Regular, 13px)
    - "Dispositivos: 5 / 8" (installed / authorized)
  - Action button: "Ver detalles" (blue, Poppins Medium, 12px)
    - Links to store detail page: `/[locale]/(dashboard)/tiendas/[storeId]`
- Positioning: anchor to marker, offset to show above
- Auto-pan: true (map pans to keep info window visible)
- Close triggers:
  - Click X button
  - Click map background (outside info window)
  - Escape key (handled by parent)
  - Click another marker (replaced)

### T-10-06: Map controls panel (side panel + mobile bottom sheet)
- File: `app/components/map/MapControlsPanel.tsx`
- Desktop layout (>768px): left side panel, fixed 280px width
- Mobile layout (<768px): bottom sheet or hamburger overlay

**Panel contents:**
1. **Filters section**:
   - Title: "Filtros" (Poppins SemiBold, 14px)
   - Checkboxes:
     - [ ] Nuevas tiendas (blue square)
     - [ ] Operacionales (green square)
     - [ ] Mantenimiento (orange square)
     - [ ] Inactivas (grey square)
   - All checked by default
   - onChange: update filter state, re-render markers, update count

2. **Count indicator**:
   - Text: "Mostrando 47 tiendas"
   - Updates real-time as filters change
   - Poppins Regular, 12px, #9CA3AF

3. **Location button**:
   - Full-width button with icon + text
   - Text: "Centrar en mi ubicación"
   - Icon: MapPin (16px, lucide-react)
   - onClick handler: calls getBrowserGeolocation()
   - States:
     - Default: neutral outline
     - Loading: disabled, shows spinner
     - Success: auto-pan and zoom to location
     - Error: show toast "No se pudo acceder a tu ubicación"
   - Implementation:
     ```typescript
     const getBrowserGeolocation = () => {
       if (!navigator.geolocation) {
         toast.error('Geolocalización no disponible')
         return
       }
       navigator.geolocation.getCurrentPosition(
         (position) => {
           const {latitude, longitude} = position.coords
           mapRef.current.panTo({lat: latitude, lng: longitude})
           mapRef.current.setZoom(12)
         },
         (error) => {
           toast.error('No se pudo acceder a tu ubicación')
         }
       )
     }
     ```

4. **Search field**:
   - Input: placeholder "Buscar tienda por nombre..."
   - Poppins Regular, 13px
   - Border: #DAE1E9
   - Icon: Search (16px, left side)
   - Clear button: X icon (right side, visible only when input has text)
   - Real-time filtering: debounce 200ms
   - Autocomplete dropdown:
     - Shows stores matching search from visible (filtered) stores
     - Display: store name + address (truncated)
     - Click to select: pan and zoom to marker, show info window
     - Max 10 results shown

### T-10-07: Memory optimization (CRITICAL)
- **Problem**: 500+ markers (stores + installers combined) can cause memory leaks, page lag, browser crashes
- **Solution**: multi-layered approach to handle both store and installer layers

1. **Marker pooling**:
   - Reuse marker objects instead of destroying/creating
   - Maintain separate pools: ~350 for stores, ~150 for installers (total ~500)
   - Update marker position/icon instead of creating new
   - Implementation: custom MarkerPool class per layer or use react-google-maps internal pooling

2. **Viewport culling**:
   - Only render markers currently visible on map + buffer zone (10% extra bounds)
   - On viewport change: update marker visibility (marker.setVisible(true/false)) for both layers
   - Reduces DOM nodes significantly at low zoom levels
   - Apply culling independently to store and installer layers

3. **Level-of-detail (LOD)**:
   - Zoom <9: use clustering only for both layers, hide individual markers
   - Zoom 9-12: show cluster + individual markers (both stores and installers mixed in clusters or separate)
   - Zoom >12: show individual markers with info on hover (both layers)
   - Prevents overdraw at low zoom

4. **Marker limit**:
   - Hard cap: 350 store markers + 100 installer markers per viewport
   - If stores >350: show warning "Demasiadas tiendas en esta zona, zoom in para ver más"
   - If installers >100: show warning "Demasiados instaladores en esta zona, zoom in para ver más"
   - Only fetch with existing markers, don't accumulate across pans
   - Can optionally reduce installer limit if total marker count approaches 400

5. **Debouncing & throttling**:
   - Debounce map bounds_changed: 300ms (already in T-10-04)
   - Throttle zoom_changed: 200ms
   - Batch marker updates in requestAnimationFrame

6. **Cleanup on unmount**:
   - Clear all markers on component unmount
   - Destroy clusterer instance
   - Detach event listeners
   - Clear React Query cache or set to VERY short stale time (10 sec)
   - Implementation:
     ```typescript
     useEffect(() => {
       return () => {
         if (clustererRef.current) clustererRef.current.clearMarkers()
         markers.forEach(m => m.setMap(null))
         google.maps.event.clearListeners(mapRef.current, 'bounds_changed')
       }
     }, [])
     ```

7. **requestAnimationFrame for batch updates**:
   - If updating >50 markers: batch updates in RAF
   - Shows better visual smoothness, reduces jank
   - ```typescript
     const updateMarkersInBatch = (updates) => {
       requestAnimationFrame(() => {
         updates.forEach(({marker, position}) => {
           marker.setPosition(position)
         })
       })
     }
     ```

8. **Lazy-loading**:
   - Dynamic import with ssr: false for MapView component
   - Prevents server-side rendering of entire map (reduces build time)
   - ```typescript
     const ClientMapView = dynamic(
       () => import('@/components/map/ClientMapView'),
       { ssr: false, loading: () => <MapSkeleton /> }
     )
     ```

9. **Browser dev tools**:
   - Document performance tips in comments
   - Link to Google Maps performance best practices in code

### T-10-08: Implementar capa de instaladores en el mapa
- File: `app/components/map/InstallerMarkers.tsx`
- Data source: rpc_get_nearby_installers (NOW IMPLEMENTED)
- Architecture:
  - Use existing NearbyInstaller interface from types/entities:
    ```typescript
    interface NearbyInstaller {
      user_id: string
      first_name: string
      last_name: string
      email: string
      role: string
      phone_country_code: string | null
      phone_number: string | null
      latitude: number
      longitude: number
      accuracy_meters: number | null
      location_source: string
      location_recorded_at: string
      active_session_store_id: string | null
      active_session_store_name: string | null
      active_session_type: string | null
      distance_meters: number
      total_count: number
    }
    ```
  - Initial load on mount: same pattern as StoreMarkers (calculate bounds, call server action)
  - Marker icons (person) differentiation:
    - Installer with active install session: blue person icon (#0000FF)
    - Installer with active maintenance session: orange person icon (#FF9800)
    - Installer idle (no session): gray person icon (#9CA3AF)
    - Icon size: 24x32px (slightly smaller than store pins)
  - Marker styling enhancements:
    - Low accuracy (accuracy_meters > 500): semi-transparent halo around marker (50% opacity)
    - Old location (> 1 hour): semi-transparent marker (60% opacity) with visual distinction
    - Marker popup tooltip on hover: installer name, distance, last seen time
  - Marker click handler:
    - Opens InfoWindow with:
      - Name (first_name + last_name)
      - Email, phone (clickable tel: link)
      - Distance (formatted, e.g., "2.5 km away")
      - Last seen time (relative, e.g., "5 minutes ago")
      - Active session info if available (store name, session type)
      - Close button
  - Same marker pooling and clustering logic as stores (SuperCluster, clustering at z<9)
- Data caching: React Query with 30-second stale time (same as stores)
- Toggle layer visibility: checkbox in MapControlsPanel "Mostrar instaladores" (unchecked by default)

### T-10-09: Responsive map
- **Desktop (>1024px)**:
  - Side panel: left, fixed 280px, scrollable
  - Map: fills remaining width
  - Info window: default top positioning
- **Tablet (768px - 1024px)**:
  - Side panel: remains left side but narrower (240px) or full-screen toggle
  - Map: full width or responsive
- **Mobile (<768px)**:
  - No left panel by default
  - Hamburger menu (3-line icon) at top-left → toggles controls panel as overlay
  - Controls panel: bottom sheet style or full-screen modal
  - Breadcrumb: hidden or moved inside panel
  - Map: fills entire visible area
  - Info window: bottom positioning (above map controls)
- Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- CSS media queries for map height adjustment

## Implementación - Detalles Técnicos

### State Management
- Local state (React hooks, no Redux needed):
  - `stores`: array of nearby stores
  - `installers`: array of nearby installers
  - `selectedStoreId`: currently selected store marker
  - `selectedInstallerId`: currently selected installer marker
  - `statusFilters`: active status filter checkboxes (stores)
  - `showInstallerLayer`: boolean toggle for installer visibility
  - `searchTerm`: search input value
  - `mapBounds`: current map viewport bounds
  - `isLoadingMarkers`: boolean for loading state (stores)
  - `isLoadingInstallers`: boolean for loading state (installers)

### Error Handling
- Google Maps API unavailable: show fallback message "No se pudo cargar el mapa" with text list of stores
- Store RPC error: show toast, keep previous markers visible, allow retry
- Installer RPC error: show toast, keep previous installer markers visible, allow retry
- Geolocation denied: show toast "Permiso de ubicación denegado"
- No stores in viewport: show "No hay tiendas en esta zona" message
- No installers in viewport: show "No hay instaladores en esta zona" message (if layer is enabled)

### Styling & Colors
- Map theme: default Google Maps theme (light mode) or custom dark theme (optional)
- Panel background: white with light shadow (elevation 4)
- Input borders: #DAE1E9
- Focus state: blue border #0000FF
- Hover state: light gray background #F5F5F7

### Performance Metrics (Goals)
- Initial map load: <2 seconds
- Marker render time: <500ms for 500 markers
- Pan/zoom response: <100ms (debounced at 300ms)
- Memory footprint: <50MB for 500 markers
- No page jank (60 FPS target) during interaction

## Criterios de aceptación
- Map loads with Google Maps API and displays correctly
- Map displays stores as clustered markers at low zoom, individual at high zoom
- Markers are color-coded by store status (new=blue, operational=green, maintenance=orange, inactive=grey)
- Marker clustering shows count badge and responds to cluster clicks with zoom
- Clicking individual marker shows info window with store details
- Info window displays store name, status badge, address, device count, "Ver detalles" button
- "Ver detalles" link navigates to store detail page (stage 05)
- Info window closes on click outside, Escape key, or new marker click
- Map viewport changes (drag/zoom) trigger store data refresh (debounced)
- Side panel displays filter checkboxes for store status (all checked by default)
- Filter changes update markers in real-time and update store count
- "Centrar en mi ubicación" button uses browser geolocation API
- On success, map pans and zooms to user location (zoom 12)
- On error, shows toast notification
- Search field filters stores by name, shows autocomplete dropdown
- Search selection pans map to store and opens info window
- Store count indicator updates as filters/search change
- Installer layer is implemented with separate toggle checkbox "Mostrar instaladores"
- Installer markers display with person icons (blue=active install, orange=active maintenance, grey=idle)
- Clicking installer marker shows info window with name, email, phone, distance, last seen time, session info
- Installer location accuracy reflected (semi-transparent halo for low accuracy >500m)
- Installer location freshness reflected (semi-transparent for locations >1 hour old)
- Map viewport changes trigger installer data refresh using rpc_get_nearby_installers
- Installer data caches with same 30-second stale time as stores
- Both store and installer layers use efficient marker pooling and clustering
- No memory leaks or page lag with 500+ combined markers
- Layout responsive: side panel on desktop, bottom sheet on mobile
- Hamburger menu on mobile shows/hides controls panel
- Clustering algorithm (SuperCluster) performs well with large datasets
- All store marker data flows through rpc_get_nearby_installer_stores
- All installer marker data flows through rpc_get_nearby_installers
- Code is well-commented, explains memory optimization strategies for both layers
- Dynamic import prevents SSR rendering of map component

## Dependencias
- Etapa 04 (layout, breadcrumb)
- Etapa 05 (store detail page, rpc_get_nearby_installer_stores RPC)
- RPC: rpc_log_installer_location (for tracking installer locations from mobile app)
- RPC: rpc_get_nearby_installers (for map visualization of nearby installers)
- @react-google-maps/api npm package
- @googlemaps/markerclusterer npm package
- lucide-react (icons: MapPin, Search, X, Menu, User)
- GOOGLE_MAPS_API_KEY environment variable configured
- google.maps.geometry library (compute distance)
- React Query (caching for both store and installer data)
- Tailwind CSS (responsive utilities)
