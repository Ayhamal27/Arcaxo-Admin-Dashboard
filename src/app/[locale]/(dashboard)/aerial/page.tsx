'use client';

import { use, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { mapListStoresAction } from '@/actions/stores/map-stores';
import { listStoresAction } from '@/actions/stores/list-stores';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { SearchInput, FilterSelect, ResetButton } from '@/components/layout/PageActionBar';
import type { RpcAdminMapListStoresOutputItem } from '@/types/rpc-outputs';
import { MapPin, X, Search, ArrowUpDown, RotateCcw } from 'lucide-react';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: 8.0, lng: -66.0 };
const DEFAULT_ZOOM = 5;

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

// ─── Markers — pure display, zero map event listeners ────────────────────────

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

    // Build stable key to skip no-op updates
    const key = stores
      .map((s) => s.store_id)
      .sort()
      .join(',');

    if (key === storeKeyRef.current) return;
    storeKeyRef.current = key;

    // Dispose previous markers
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

    // Build lookup for click handler
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

  // Cleanup on unmount
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

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
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
  const debouncedSearch = useDebounce(search, 400);

  const statusArray = filterStatus ? [filterStatus] : undefined;

  // Map query — fixed center+radius, no viewport tracking, no feedback loop.
  const {
    data: mapData,
    isLoading: mapLoading,
    isError: mapError,
  } = useQuery({
    queryKey: ['aerial-map-stores', statusArray],
    queryFn: () =>
      mapListStoresAction({
        centerLat: DEFAULT_CENTER.lat,
        centerLng: DEFAULT_CENTER.lng,
        radiusMeters: 5_000_000,
        statuses: statusArray,
        limit: 500,
      }),
    enabled: !debouncedSearch,
    staleTime: 30_000,
  });

  // Search query — only when user types in search bar.
  const {
    data: searchData,
    isLoading: searchLoading,
    isError: searchError,
  } = useQuery({
    queryKey: ['aerial-search-stores', debouncedSearch, statusArray],
    queryFn: () =>
      listStoresAction({
        page: 1,
        pageSize: 500,
        search: debouncedSearch,
        sortBy: 'name',
        sortOrder: 'asc',
        filterStatus: statusArray,
      }),
    enabled: !!debouncedSearch,
    staleTime: 30_000,
  });

  const isLoading = debouncedSearch ? searchLoading : mapLoading;
  const isError = debouncedSearch ? searchError : mapError;

  // Merge data into a single StoreItem array
  const stores: StoreItem[] = useMemo(() => {
    if (debouncedSearch) {
      return (searchData?.stores ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          store_id: s.store_id,
          name: s.name,
          status: s.status,
          city_name: s.city_name,
          state_name: s.state_name,
          authorized_devices_count: s.authorized_devices_count,
          lat: s.latitude!,
          lng: s.longitude!,
        }));
    }
    return (mapData ?? []).map((s) => ({
      store_id: s.store_id,
      name: s.name,
      status: s.status,
      city_name: s.city_name,
      state_name: s.state_name,
      authorized_devices_count: s.authorized_devices_count,
      lat: s.latitude,
      lng: s.longitude,
    }));
  }, [debouncedSearch, mapData, searchData]);

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

      {/* Map + Sidebar — fixed height so sidebar scroll stays contained */}
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
                <StoreMarkers stores={stores} onSelect={handleSelectStore} />

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

        {/* Sidebar card — same height as map, scroll stays inside */}
        <div className="w-[320px] flex-shrink-0 bg-white rounded-[15px] border border-[#E5E5EA] flex flex-col min-h-0">
          {/* Header — fixed */}
          <div className="px-[20px] py-[16px] border-b border-[#E5E5EA] flex-shrink-0">
            <p className="text-[15px] font-semibold text-[#161616]">{t('storesOnMap')}</p>
            <p className="text-[12px] text-[#667085] mt-0.5">
              {stores.length} {t('withCoords')}
            </p>
          </div>

          {/* Store list — scrolls inside this container only */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isError ? (
              <div className="px-[20px] py-12 text-center">
                <p className="text-[13px] text-[#FF4163]">{tStores('errorLoading')}</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="px-[20px] py-12 text-center">
                <MapPin className="w-10 h-10 text-[#D0D5DD] mx-auto mb-2" />
                <p className="text-[13px] text-[#667085]">{tCommon('noResults')}</p>
              </div>
            ) : (
              stores.map((store) => (
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

          {/* Legend — fixed at bottom */}
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
