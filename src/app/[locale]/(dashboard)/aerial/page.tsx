'use client';

import { use, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { listStoresAction } from '@/actions/stores/list-stores';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RpcAdminListStoresOutputItem } from '@/types/rpc-outputs';
import { MapPin, X } from 'lucide-react';
import Link from 'next/link';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const DEFAULT_CENTER = { lat: 8.0, lng: -66.0 };
const DEFAULT_ZOOM = 5;

function createStoreMarkerIcon(): google.maps.Icon {
  // Circle (r=13, center 16,14) with a short tail pointing down
  // At y=24 the circle intersects at x≈8 and x≈24 — tail joins there
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 38 L8 24 A13 13 0 1 1 24 24 Z" fill="#0000FF"/>
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
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 38),
  };
}

interface StoreWithCoords {
  store_id: string;
  status: string;
  coords: { lat: number; lng: number };
}

function StoreMarkers({
  stores,
  onSelect,
}: {
  stores: StoreWithCoords[];
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const handleSelect = useCallback(onSelect, [onSelect]);
  const didFitRef = useRef(false);

  useEffect(() => {
    if (!map || !window.google || stores.length === 0) return;

    // fitBounds on first load only
    if (!didFitRef.current) {
      const bounds = new google.maps.LatLngBounds();
      stores.forEach((s) => bounds.extend(s.coords));
      map.fitBounds(bounds, 60);
      didFitRef.current = true;
    }

    // Build markers (no map assigned — clusterer manages placement)
    const markers = stores.map((store) => {
      const marker = new google.maps.Marker({
        position: store.coords,
        icon: createStoreMarkerIcon(),
        cursor: 'pointer',
      });
      marker.addListener('click', () => handleSelect(store.store_id));
      return marker;
    });

    // Create or update clusterer
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    } else {
      clustererRef.current = new MarkerClusterer({ map });
    }
    clustererRef.current.addMarkers(markers);

    return () => {
      clustererRef.current?.clearMarkers();
    };
  }, [map, stores, handleSelect]);

  return null;
}

function coordsFromMapsUrl(url?: string | null): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    const query = new URL(url).searchParams.get('query');
    if (!query) return null;
    const [lat, lng] = query.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

const STATUS_DOT: Record<string, string> = {
  active: '#228D70',
  inactive: '#667085',
  suspended: '#FF4163',
  pending: '#F59E0B',
};

export default function VistaAereaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('aerial');
  const [selectedStore, setSelectedStore] = useState<RpcAdminListStoresOutputItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stores-map'],
    queryFn: () =>
      listStoresAction({
        page: 1,
        pageSize: 500,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const allStores = data?.stores ?? [];
  const stores = allStores
    .map((s) => ({ ...s, coords: coordsFromMapsUrl(s.google_maps_url) }))
    .filter((s) => s.coords != null) as (typeof allStores[0] & { coords: { lat: number; lng: number } })[];

  const storesWithoutCoords = allStores.filter((s) => !coordsFromMapsUrl(s.google_maps_url));

  return (
    <div>
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      <div className="flex gap-6" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {/* Map */}
        <div className="flex-1 rounded-[15px] overflow-hidden border border-[#E5E5EA]">
          {isLoading ? (
            <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[14px] text-[#667085]">{t('loadingMap')}</p>
              </div>
            </div>
          ) : !MAPS_API_KEY ? (
            <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
              <div className="text-center px-8">
                <MapPin className="w-12 h-12 text-[#D0D5DD] mx-auto mb-3" />
                <p className="text-[16px] font-semibold text-[#191919] mb-1">
                  {t('noApiKey')}
                </p>
                <p className="text-[14px] text-[#667085]">
                  {t('noApiKeyDesc')}
                </p>
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
                <StoreMarkers
                  stores={stores}
                  onSelect={(id) => setSelectedStore(allStores.find((s) => s.store_id === id) ?? null)}
                />

                {selectedStore && coordsFromMapsUrl(selectedStore.google_maps_url) && (
                  <InfoWindow
                    position={coordsFromMapsUrl(selectedStore.google_maps_url)!}
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
                          style={{ backgroundColor: STATUS_DOT[selectedStore.status] ?? '#667085' }}
                        />
                        <span className="text-[12px] text-[#667085] capitalize">
                          {selectedStore.status}
                        </span>
                      </div>

                      <p className="text-[12px] text-[#667085] mb-3">
                        {selectedStore.installed_devices_count} /{' '}
                        {selectedStore.authorized_devices_count} dispositivos
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

        {/* Sidebar */}
        <div className="w-[280px] flex-shrink-0 bg-white rounded-[15px] border border-[#E5E5EA] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#E5E5EA]">
            <p className="text-[15px] font-semibold text-[#161616]">
              {t('storesOnMap')}
            </p>
            <p className="text-[12px] text-[#667085] mt-0.5">
              {stores.length} {t('withCoords')}
              {storesWithoutCoords.length > 0 && `, ${storesWithoutCoords.length} ${t('withoutLocation')}`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {stores.map((store) => (
              <button
                key={store.store_id}
                onClick={() => setSelectedStore(store)}
                className={`w-full text-left px-4 py-3 border-b border-[#F5F5F5] hover:bg-[#F8F8FF] transition-colors ${
                  selectedStore?.store_id === store.store_id ? 'bg-[#F0F0FF]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_DOT[store.status] ?? '#667085' }}
                  />
                  <p className="text-[13px] font-medium text-[#191919] truncate">{store.name}</p>
                </div>
                <p className="text-[12px] text-[#667085] mt-0.5 pl-[18px] truncate">
                  {store.city_name ?? '—'}
                </p>
              </button>
            ))}

            {storesWithoutCoords.length > 0 && (
              <>
                <div className="px-4 py-2 bg-[#F9F9F9]">
                  <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                    {t('withoutCoords')}
                  </p>
                </div>
                {storesWithoutCoords.map((store) => (
                  <Link
                    key={store.store_id}
                    href={`/${locale}/stores/${store.store_id}`}
                    className="block px-4 py-3 border-b border-[#F5F5F5] hover:bg-[#F8F8FF] transition-colors"
                  >
                    <p className="text-[13px] text-[#667085] truncate">{store.name}</p>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-[#E5E5EA]">
            <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
              {t('legend')}
            </p>
            <div className="space-y-1.5">
              {([
                ['active', t('statusActive')],
                ['inactive', t('statusInactive')],
                ['suspended', t('statusSuspended')],
                ['pending', t('statusPending')],
              ] as [string, string][]).map(([status, label]) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_DOT[status] }}
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
