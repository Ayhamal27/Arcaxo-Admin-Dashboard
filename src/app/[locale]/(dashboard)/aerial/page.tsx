'use client';

import { use, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { mapListStoresAction, mapStoreClustersAction } from '@/actions/stores/map-stores';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SearchInput, FilterSelect, ResetButton } from '@/components/layout/PageActionBar';
import type { RpcAdminMapStoreClustersOutputItem } from '@/types/rpc-outputs';
import { MapPin, X, Search, ArrowUpDown, RotateCcw } from 'lucide-react';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: 8.0, lng: -66.0 };
const DEFAULT_ZOOM = 5;
const CLUSTER_ZOOM_THRESHOLD = 11;

const STATUS_COLOR: Record<string, string> = {
  new_store: '#0000FF',
  operational: '#228D70',
  maintenance: '#F59E0B',
  inactive: '#FF4163',
};

function getStatusColor(status: string): string {
  return STATUS_COLOR[status] ?? '#667085';
}

// ─── SVG marker icon builder (cached) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconCache: Record<string, any> = {};

function getMarkerIcon(color: string): google.maps.Icon {
  if (iconCache[color]) return iconCache[color];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 38 L8 24 A13 13 0 1 1 24 24 Z" fill="${color}"/>
    <circle cx="16" cy="14" r="13" fill="none" stroke="white" stroke-width="2"/>
    <path d="M8 24 L16 38 L24 24" fill="none" stroke="white" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>
    <g transform="translate(8.8, 6.8) scale(0.6)" stroke="white" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
      <line x1="2" y1="7" x2="22" y2="7"/>
    </g>
  </svg>`;

  const icon: google.maps.Icon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 38),
  };
  iconCache[color] = icon;
  return icon;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreItem {
  store_id: string;
  name: string;
  status: string;
  city_name?: string;
  state_name?: string;
  authorized_devices_count: number;
  lat: number;
  lng: number;
}

interface MapViewport {
  zoom: number;
  bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  center: { lat: number; lng: number };
  radiusMeters: number;
}

// ─── Viewport helpers ────────────────────────────────────────────────────────

function extractViewport(map: google.maps.Map): MapViewport | null {
  const bounds = map.getBounds();
  const rawZoom = map.getZoom();
  if (!bounds || rawZoom == null) return null;
  const zoom = Math.round(rawZoom);

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const center = {
    lat: (ne.lat() + sw.lat()) / 2,
    lng: (ne.lng() + sw.lng()) / 2,
  };

  // Approximate radius (half-diagonal in meters)
  const R = 6371000;
  const dLat = ((ne.lat() - sw.lat()) * Math.PI) / 180;
  const dLng = ((ne.lng() - sw.lng()) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) *
      Math.cos((center.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const radiusMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

  return {
    zoom,
    bounds: {
      minLat: sw.lat(),
      minLng: sw.lng(),
      maxLat: ne.lat(),
      maxLng: ne.lng(),
    },
    center,
    radiusMeters,
  };
}

// ─── MapViewController — tracks user interactions, NOT idle ──────────────────

function MapViewController({
  onViewportChange,
}: {
  onViewportChange: (vp: MapViewport) => void;
}) {
  const map = useMap();
  const callbackRef = useRef(onViewportChange);
  callbackRef.current = onViewportChange;
  const initRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const emit = () => {
      const vp = extractViewport(map);
      if (vp) callbackRef.current(vp);
    };

    // Capture initial viewport once tiles load
    const tilesListener = map.addListener('tilesloaded', () => {
      if (!initRef.current) {
        initRef.current = true;
        emit();
      }
    });

    // Only react to user drag and zoom — NOT idle
    const dragListener = map.addListener('dragend', emit);

    // Debounce zoom_changed — Google fires it multiple times during animated zoom
    let zoomTimer: ReturnType<typeof setTimeout> | null = null;
    const zoomListener = map.addListener('zoom_changed', () => {
      if (zoomTimer) clearTimeout(zoomTimer);
      zoomTimer = setTimeout(emit, 350);
    });

    return () => {
      if (zoomTimer) clearTimeout(zoomTimer);
      google.maps.event.removeListener(tilesListener);
      google.maps.event.removeListener(dragListener);
      google.maps.event.removeListener(zoomListener);
    };
  }, [map]);

  return null;
}

// ─── StoreMarkers — individual markers with client-side clustering ───────────

function StoreMarkers({
  stores,
  onSelect,
}: {
  stores: StoreItem[];
  onSelect: (store: StoreItem) => void;
}) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const storeKeyRef = useRef('');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const key = stores
      .map((s) => s.store_id)
      .sort()
      .join(',');

    if (key === storeKeyRef.current) return;
    storeKeyRef.current = key;

    // Dispose previous
    for (const m of markersRef.current) {
      google.maps.event.clearInstanceListeners(m);
      m.setMap(null);
    }
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    if (stores.length === 0) {
      markersRef.current = [];
      return;
    }

    const storeById: Record<string, StoreItem> = {};
    for (const s of stores) storeById[s.store_id] = s;

    const newMarkers = stores.map((store) => {
      const marker = new google.maps.Marker({
        position: { lat: store.lat, lng: store.lng },
        icon: getMarkerIcon(getStatusColor(store.status)),
        cursor: 'pointer',
      });
      marker.addListener('click', () => {
        const s = storeById[store.store_id];
        if (s) onSelectRef.current(s);
      });
      return marker;
    });

    markersRef.current = newMarkers;

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map, markers: newMarkers });
    } else {
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [map, stores]);

  useEffect(() => {
    return () => {
      for (const m of markersRef.current) {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      }
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current = [];
      storeKeyRef.current = '';
    };
  }, []);

  return null;
}

// ─── ClusterMarkers — server-side clusters rendered as circle markers ────────

function ClusterMarkers({ clusters }: { clusters: RpcAdminMapStoreClustersOutputItem[] }) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const keyRef = useRef('');

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const key = clusters.map((c) => c.cluster_key).join(',');
    if (key === keyRef.current) return;
    keyRef.current = key;

    // Dispose previous
    for (const m of markersRef.current) {
      google.maps.event.clearInstanceListeners(m);
      m.setMap(null);
    }

    if (clusters.length === 0) {
      markersRef.current = [];
      return;
    }

    markersRef.current = clusters.map((cluster) => {
      const count = cluster.stores_count;
      const size = Math.min(24 + Math.log2(count + 1) * 10, 64);

      // Dominant status color
      const maxStatus = [
        { status: 'operational', count: cluster.operational_count },
        { status: 'new_store', count: cluster.new_store_count },
        { status: 'maintenance', count: cluster.maintenance_count },
        { status: 'inactive', count: cluster.inactive_count },
      ].sort((a, b) => b.count - a.count)[0];
      const color = getStatusColor(maxStatus.status);

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" fill-opacity="0.85" stroke="white" stroke-width="2"/>
        <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
          fill="white" font-size="${Math.max(10, size * 0.35)}" font-weight="600" font-family="system-ui, sans-serif">${count}</text>
      </svg>`;

      const marker = new google.maps.Marker({
        position: { lat: cluster.cluster_latitude, lng: cluster.cluster_longitude },
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(size, size),
          anchor: new google.maps.Point(size / 2, size / 2),
        },
        cursor: 'pointer',
        title: `${count} tiendas`,
      });

      // Zoom into cluster on click
      marker.addListener('click', () => {
        map.setZoom(Math.min((map.getZoom() ?? 5) + 3, 14));
        map.panTo({ lat: cluster.cluster_latitude, lng: cluster.cluster_longitude });
      });

      marker.setMap(map);
      return marker;
    });
  }, [map, clusters]);

  useEffect(() => {
    return () => {
      for (const m of markersRef.current) {
        google.maps.event.clearInstanceListeners(m);
        m.setMap(null);
      }
      markersRef.current = [];
      keyRef.current = '';
    };
  }, []);

  return null;
}

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Viewport quantization — reduces cache misses from micro-movements ──────

function quantizeViewport(vp: MapViewport): MapViewport {
  return {
    zoom: vp.zoom,
    center: {
      lat: Math.round(vp.center.lat * 100) / 100, // ~1.1km precision
      lng: Math.round(vp.center.lng * 100) / 100,
    },
    bounds: {
      minLat: Math.round(vp.bounds.minLat * 100) / 100,
      minLng: Math.round(vp.bounds.minLng * 100) / 100,
      maxLat: Math.round(vp.bounds.maxLat * 100) / 100,
      maxLng: Math.round(vp.bounds.maxLng * 100) / 100,
    },
    radiusMeters: Math.round(vp.radiusMeters / 1000) * 1000, // round to nearest km
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AerialViewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('aerial');
  const tStores = useTranslations('stores');
  const tCommon = useTranslations('common');

  const [selectedStore, setSelectedStore] = useState<StoreItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Viewport state — updated only by user interaction (drag/zoom), never by idle
  const [rawViewport, setRawViewport] = useState<MapViewport | null>(null);
  // Debounce viewport 500ms to prevent request storms during drag/zoom
  const viewport = useDebounce(rawViewport, 500);
  // Quantized viewport for query keys — reduces cache misses from sub-km movements
  const qvp = useMemo(() => (viewport ? quantizeViewport(viewport) : null), [viewport]);

  const statusArray = filterStatus ? [filterStatus] : undefined;
  const isClusterMode = (viewport?.zoom ?? DEFAULT_ZOOM) <= CLUSTER_ZOOM_THRESHOLD;

  // ── Cluster query (zoom <= 11) ──────────────────────────────────────────
  const {
    data: clusterData,
    isLoading: clusterLoading,
  } = useQuery({
    queryKey: [
      'aerial-clusters',
      qvp?.bounds.minLat,
      qvp?.bounds.minLng,
      qvp?.bounds.maxLat,
      qvp?.bounds.maxLng,
      qvp?.zoom,
      statusArray,
    ],
    queryFn: () =>
      mapStoreClustersAction({
        minLat: viewport!.bounds.minLat,
        minLng: viewport!.bounds.minLng,
        maxLat: viewport!.bounds.maxLat,
        maxLng: viewport!.bounds.maxLng,
        zoom: viewport!.zoom,
        statuses: statusArray,
      }),
    enabled: isClusterMode && !!viewport && !search,
    staleTime: 60_000,
  });

  // ── Individual stores query (zoom >= 12, or any zoom when searching) ───
  const {
    data: markerData,
    isLoading: markerLoading,
  } = useQuery({
    queryKey: [
      'aerial-markers',
      qvp?.center.lat,
      qvp?.center.lng,
      qvp?.radiusMeters,
      statusArray,
    ],
    queryFn: () =>
      mapListStoresAction({
        centerLat: viewport!.center.lat,
        centerLng: viewport!.center.lng,
        radiusMeters: viewport!.radiusMeters,
        statuses: statusArray,
      }),
    enabled: (!isClusterMode || !!search) && !!viewport,
    staleTime: 60_000,
  });

  // ── Derive display data ─────────────────────────────────────────────────

  const isLoading = isClusterMode && !search ? clusterLoading : markerLoading;

  // All stores from map RPC mapped to StoreItem
  const allStores: StoreItem[] = useMemo(
    () =>
      (markerData ?? []).map((s) => ({
        store_id: s.store_id,
        name: s.name,
        status: s.status,
        city_name: s.city_name,
        state_name: s.state_name,
        authorized_devices_count: s.authorized_devices_count,
        lat: s.latitude,
        lng: s.longitude,
      })),
    [markerData]
  );

  // Client-side text filter — instant, no network call
  const filteredStores: StoreItem[] = useMemo(() => {
    if (!search.trim()) return allStores;
    const q = search.trim().toLowerCase();
    return allStores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city_name?.toLowerCase().includes(q) ||
        s.state_name?.toLowerCase().includes(q) ||
        s.store_id.toLowerCase().includes(q)
    );
  }, [allStores, search]);

  // Sidebar items: filtered stores when searching, all stores when not (cluster mode shows clusters)
  const sidebarStores = filteredStores;
  const mapStores = filteredStores;

  const clusters = useMemo(() => clusterData ?? [], [clusterData]);

  // Total store count for sidebar header in cluster mode
  const clusterTotalStores = useMemo(
    () => clusters.reduce((sum, c) => sum + c.stores_count, 0),
    [clusters]
  );

  const handleViewportChange = useCallback((vp: MapViewport) => {
    setRawViewport(vp);
  }, []);

  const handleReset = useCallback(() => {
    setSearch('');
    setFilterStatus('');
  }, []);

  const handleSelectStore = useCallback((store: StoreItem) => {
    setSelectedStore(store);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Header: breadcrumb left + filters right */}
      <div className="flex items-center justify-between gap-4 mb-[24px] flex-wrap">
        <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

        <div className="flex items-center gap-[12px]">
          <SearchInput
            icon={<Search className="w-5 h-5" />}
            placeholder={tStores('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterSelect
            icon={<ArrowUpDown className="w-5 h-5" />}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">{tStores('status')}</option>
            <option value="new_store">{tStores('statuses.new_store')}</option>
            <option value="operational">{tStores('statuses.operational')}</option>
            <option value="maintenance">{tStores('statuses.maintenance')}</option>
            <option value="inactive">{tStores('statuses.inactive')}</option>
          </FilterSelect>
          <ResetButton icon={<RotateCcw className="w-5 h-5" />} onClick={handleReset} />
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex gap-[20px]" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Map card */}
        <div className="flex-1 min-w-0 rounded-[15px] overflow-hidden border border-[#E5E5EA] bg-white">
          {!MAPS_API_KEY ? (
            <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
              <div className="text-center px-8">
                <MapPin className="w-12 h-12 text-[#D0D5DD] mx-auto mb-3" />
                <p className="text-[16px] font-semibold text-[#191919] mb-1">{t('noApiKey')}</p>
                <p className="text-[14px] text-[#667085]">{t('noApiKeyDesc')}</p>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={MAPS_API_KEY}>
              <Map
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={DEFAULT_ZOOM}
                disableDefaultUI={false}
                gestureHandling="greedy"
                style={{ width: '100%', height: '100%' }}
              >
                <MapViewController onViewportChange={handleViewportChange} />

                {/* Cluster mode: server-side clusters as circle markers */}
                {isClusterMode && !search && (
                  <ClusterMarkers clusters={clusters} />
                )}

                {/* Marker mode: individual store markers with client-side clustering */}
                {(!isClusterMode || !!search) && (
                  <StoreMarkers stores={mapStores} onSelect={handleSelectStore} />
                )}

                {selectedStore && (
                  <InfoWindow
                    position={{ lat: selectedStore.lat, lng: selectedStore.lng }}
                    onCloseClick={() => setSelectedStore(null)}
                  >
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[14px] font-semibold text-[#191919] leading-tight">
                          {selectedStore.name}
                        </p>
                        <button
                          onClick={() => setSelectedStore(null)}
                          className="text-[#667085] hover:text-[#191919] flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[12px] text-[#667085] mb-1">
                        {selectedStore.city_name}
                        {selectedStore.state_name ? `, ${selectedStore.state_name}` : ''}
                      </p>

                      <div className="flex items-center gap-1.5 mb-3">
                        <div
                          className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(selectedStore.status) }}
                        />
                        <span className="text-[12px] text-[#667085]">
                          {tStores(`statuses.${selectedStore.status}`)}
                        </span>
                      </div>

                      <p className="text-[12px] text-[#667085] mb-3">
                        {selectedStore.authorized_devices_count} {tStores('devices')}
                      </p>

                      <Link
                        href={`/${locale}/stores/${selectedStore.store_id}`}
                        className="text-[12px] text-[#0000FF] hover:underline"
                      >
                        {t('viewDetail')} →
                      </Link>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>
          )}
        </div>

        {/* Sidebar card */}
        <div className="w-[320px] flex-shrink-0 bg-white rounded-[15px] border border-[#E5E5EA] flex flex-col min-h-0">
          {/* Header */}
          <div className="px-[20px] py-[16px] border-b border-[#E5E5EA] flex-shrink-0">
            <p className="text-[15px] font-semibold text-[#161616]">{t('storesOnMap')}</p>
            <p className="text-[12px] text-[#667085] mt-0.5">
              {isClusterMode && !search
                ? `${clusterTotalStores} ${t('withCoords')}`
                : `${sidebarStores.length} ${t('withCoords')}`}
            </p>
          </div>

          {/* Store list — scrolls inside this container only */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isClusterMode && !search ? (
              /* Cluster mode: show cluster summaries */
              clusters.length === 0 ? (
                <div className="px-[20px] py-12 text-center">
                  <MapPin className="w-10 h-10 text-[#D0D5DD] mx-auto mb-2" />
                  <p className="text-[13px] text-[#667085]">{tCommon('noResults')}</p>
                </div>
              ) : (
                clusters.map((cluster) => (
                  <div
                    key={cluster.cluster_key}
                    className="w-full px-[20px] py-[12px] border-b border-[#F5F5F5]"
                  >
                    <p className="text-[13px] font-medium text-[#191919]">
                      {cluster.stores_count} {tStores('title').toLowerCase()}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {cluster.operational_count > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: STATUS_COLOR.operational }} />
                          <span className="text-[11px] text-[#667085]">{cluster.operational_count}</span>
                        </div>
                      )}
                      {cluster.new_store_count > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: STATUS_COLOR.new_store }} />
                          <span className="text-[11px] text-[#667085]">{cluster.new_store_count}</span>
                        </div>
                      )}
                      {cluster.maintenance_count > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: STATUS_COLOR.maintenance }} />
                          <span className="text-[11px] text-[#667085]">{cluster.maintenance_count}</span>
                        </div>
                      )}
                      {cluster.inactive_count > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: STATUS_COLOR.inactive }} />
                          <span className="text-[11px] text-[#667085]">{cluster.inactive_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : sidebarStores.length === 0 ? (
              <div className="px-[20px] py-12 text-center">
                <MapPin className="w-10 h-10 text-[#D0D5DD] mx-auto mb-2" />
                <p className="text-[13px] text-[#667085]">{tCommon('noResults')}</p>
              </div>
            ) : (
              sidebarStores.map((store) => (
                <button
                  key={store.store_id}
                  onClick={() => setSelectedStore(store)}
                  className={`w-full text-left px-[20px] py-[12px] border-b border-[#F5F5F5] hover:bg-[#F8F8FF] transition-colors ${
                    selectedStore?.store_id === store.store_id ? 'bg-[#F0F0FF]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: getStatusColor(store.status) }}
                    />
                    <p className="text-[13px] font-medium text-[#191919] truncate">{store.name}</p>
                  </div>
                  <p className="text-[12px] text-[#667085] mt-0.5 pl-[18px] truncate">
                    {store.city_name ?? '—'}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="px-[20px] py-[16px] border-t border-[#E5E5EA] flex-shrink-0">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
              {t('legend')}
            </p>
            <div className="space-y-1.5">
              {(
                [
                  ['new_store', tStores('statuses.new_store')],
                  ['operational', tStores('statuses.operational')],
                  ['maintenance', tStores('statuses.maintenance')],
                  ['inactive', tStores('statuses.inactive')],
                ] as [string, string][]
              ).map(([status, label]) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: getStatusColor(status) }}
                  />
                  <span className="text-[12px] text-[#667085]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
