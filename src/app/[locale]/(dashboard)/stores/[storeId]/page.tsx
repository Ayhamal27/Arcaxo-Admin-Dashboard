import { notFound } from 'next/navigation';
import { getStoreDetailAction } from '@/actions/stores/get-store';
import { getFacadeSignedUrlAction } from '@/actions/stores/get-facade-signed-url';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StatusDot } from '@/components/shared/DataTable';
import { MapPin, Cpu, Calendar, Users, Pencil } from 'lucide-react';
import Link from 'next/link';
import { StoreDetailClient, StoreToggle } from './StoreDetailClient';
import { StoreContactActions } from './StoreContactActions';

interface StoreDetailPageProps {
  params: Promise<{ locale: string; storeId: string }>;
}

export default async function StoreDetailPage({ params }: StoreDetailPageProps) {
  const { locale, storeId } = await params;

  let store;
  try {
    store = await getStoreDetailAction(storeId);
  } catch {
    notFound();
  }

  if (!store) notFound();

  const responsibleName = store.responsible
    ? `${(store.responsible as Record<string, string>)?.first_name ?? ''} ${(store.responsible as Record<string, string>)?.last_name ?? ''}`.trim()
    : null;

  const fullPhone =
    store.phone_country_code && store.phone_number
      ? `${store.phone_country_code} ${store.phone_number}`
      : null;

  const fullAddress = [store.address, store.city_name, store.state_name].filter(Boolean).join(', ');

  // Resolve facade photo URL (signed URL for bucket paths, passthrough for legacy URLs)
  const facadeDisplayUrl = await getFacadeSignedUrlAction(store.facade_photo_url ?? null);

  return (
    <div className="flex-1 flex flex-col">
      {/* Breadcrumb + Toggle top-right */}
      <div className="flex items-center justify-between mb-6">
        <Breadcrumb
          locale={locale}
          items={[
            { label: 'Tiendas', href: `/${locale}/stores` },
            { label: store.name },
          ]}
          className="mb-0"
        />

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/stores/${storeId}/edit`}
            className="flex items-center gap-2 px-4 py-1.5 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>

          <StoreToggle
            storeId={storeId}
            initialActive={store.active}
            installedDevicesCount={store.installed_devices_count ?? 0}
            hasOpenSession={!!store.open_session_id}
            openSessionType={store.open_session_type ?? null}
          />
        </div>
      </div>

      {/* 2-column layout: Tabs (2/3) | Info + Stats (1/3 sticky) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1">
        {/* Left: Tabs — sessions + devices */}
        <div className="lg:col-span-2">
          <StoreTabsClient storeId={storeId} locale={locale} />

          {/* Back link below tabs */}
          <div className="mt-4">
            <Link
              href={`/${locale}/stores`}
              className="text-[14px] text-[#0000FF] hover:underline"
            >
              ← Volver a tiendas
            </Link>
          </div>
        </div>

        {/* Right column: sticky, stretches to bottom of viewport */}
        <div className="lg:sticky lg:top-[104px] lg:h-[calc(100vh-128px)] flex flex-col gap-5 min-h-0 flex-1">
          {/* Store info + stats card (unified) */}
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] overflow-hidden flex-1 flex flex-col">
            {/* Facade photo — 24vh banner */}
            <div className="relative w-full flex flex-col justify-end" style={{ height: '24vh' }}>
              {facadeDisplayUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={facadeDisplayUrl}
                  alt={store.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[#F0F0F5] flex items-center justify-center">
                  <span className="text-[#D0D5DD] text-[48px]">🏪</span>
                </div>
              )}
              {store.open_session_id && (
                <div className="relative z-10 flex justify-end" style={{ paddingRight: '16px', paddingBottom: '16px' }}>
                  <div className="px-3 py-2.5 bg-[#FFF9E6] border border-[#FADC45] rounded-[8px] text-right">
                    <p className="text-[12px] font-medium text-[#8B7200]">
                      Sesión abierta: {store.open_session_type}
                    </p>
                    {store.open_session_installer_name && (
                      <p className="text-[11px] text-[#8B7200]">
                        Instalador: {store.open_session_installer_name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <StatusDot status={store.status} />
                <h1 className="text-[18px] font-semibold text-[#191919] leading-tight">
                  {store.name}
                </h1>
              </div>

              <div className="space-y-1.5 text-[13px] text-[#667085] mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{store.address}</span>
                </div>

                {store.city_name && (
                  <p className="pl-[22px]">
                    {store.city_name}
                    {store.state_name ? `, ${store.state_name}` : ''}
                  </p>
                )}

              </div>

              {/* Stats grid 2x2 */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-4 px-3 py-3 rounded-[8px] bg-[#F9FAFB]">
              {/* Row 1 */}
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#667085]">Dispositivos</p>
                  <p className="text-[15px] font-semibold text-[#191919]">
                    {store.installed_devices_count ?? 0} / {store.authorized_devices_count}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#667085]">Sesiones</p>
                  <p className="text-[15px] font-semibold text-[#191919]">
                    {store.total_sessions_count ?? 0}
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#667085]">Responsable</p>
                  <p className="text-[13px] font-medium text-[#191919] truncate">
                    {responsibleName || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StoreContactActions
                  phone={fullPhone}
                  address={fullAddress}
                  googleMapsUrl={store.google_maps_url ?? null}
                />
              </div>
            </div>

{/* Action buttons: WiFi, Devices, Facade — pushed to bottom */}
              <div className="mt-auto pt-2">
                <StoreDetailClient
                  storeId={storeId}
                  initialActive={store.active}
                  installedDevicesCount={store.installed_devices_count ?? 0}
                  authorizedDevicesCount={store.authorized_devices_count ?? 0}
                  wifiSsid={store.wifi_ssid ?? null}
                  facadePhotoUrl={store.facade_photo_url ?? null}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import this here to avoid circular dependency issues
import { StoreTabsClient } from './StoreTabsClient';
