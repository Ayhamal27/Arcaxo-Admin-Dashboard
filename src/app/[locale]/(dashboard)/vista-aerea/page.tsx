'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { listStoresAction } from '@/actions/stores/list-stores';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RpcAdminListStoresOutputItem } from '@/types/rpc-outputs';
import { MapPin, X } from 'lucide-react';
import Link from 'next/link';

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const DEFAULT_CENTER = { lat: 23.6345, lng: -102.5528 }; // Centro de México
const DEFAULT_ZOOM = 5;

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

  const stores = (data?.stores ?? []).filter(
    (s) => s.latitude != null && s.longitude != null
  );

  const storesWithoutCoords = (data?.stores ?? []).filter(
    (s) => s.latitude == null || s.longitude == null
  );

  return (
    <div>
      <Breadcrumb locale={locale} items={[{ label: 'Vista Aérea' }]} />

      <div className="flex gap-6" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {/* Map */}
        <div className="flex-1 rounded-[15px] overflow-hidden border border-[#E5E5EA]">
          {isLoading ? (
            <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[14px] text-[#667085]">Cargando mapa...</p>
              </div>
            </div>
          ) : !MAPS_API_KEY ? (
            <div className="w-full h-full bg-[#F5F5F5] flex items-center justify-center">
              <div className="text-center px-8">
                <MapPin className="w-12 h-12 text-[#D0D5DD] mx-auto mb-3" />
                <p className="text-[16px] font-semibold text-[#191919] mb-1">
                  API Key no configurada
                </p>
                <p className="text-[14px] text-[#667085]">
                  Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en las variables de entorno
                </p>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={MAPS_API_KEY}>
              <Map
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={DEFAULT_ZOOM}
                mapId="arcaxo-aerial-view"
                disableDefaultUI={false}
                gestureHandling="greedy"
                style={{ width: '100%', height: '100%' }}
              >
                {stores.map((store) => (
                  <AdvancedMarker
                    key={store.store_id}
                    position={{ lat: store.latitude!, lng: store.longitude! }}
                    onClick={() => setSelectedStore(store)}
                  >
                    <div
                      className="w-[14px] h-[14px] rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
                      style={{ backgroundColor: STATUS_DOT[store.status] ?? '#667085' }}
                    />
                  </AdvancedMarker>
                ))}

                {selectedStore && selectedStore.latitude && selectedStore.longitude && (
                  <InfoWindow
                    position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
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
                        href={`/${locale}/tiendas/${selectedStore.store_id}`}
                        className="text-[12px] text-[#0000FF] hover:underline"
                      >
                        Ver detalle →
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
              Tiendas en el mapa
            </p>
            <p className="text-[12px] text-[#667085] mt-0.5">
              {stores.length} con coordenadas
              {storesWithoutCoords.length > 0 && `, ${storesWithoutCoords.length} sin ubicación`}
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
                    Sin coordenadas
                  </p>
                </div>
                {storesWithoutCoords.map((store) => (
                  <Link
                    key={store.store_id}
                    href={`/${locale}/tiendas/${store.store_id}`}
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
              Leyenda
            </p>
            <div className="space-y-1.5">
              {Object.entries({
                active: 'Activa',
                inactive: 'Inactiva',
                suspended: 'Suspendida',
                pending: 'Pendiente',
              }).map(([status, label]) => (
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
