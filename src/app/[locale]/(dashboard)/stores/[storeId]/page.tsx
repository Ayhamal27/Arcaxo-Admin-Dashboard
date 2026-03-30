import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getStoreDetailAction } from '@/actions/stores/get-store';
import { getFacadeSignedUrlAction } from '@/actions/stores/get-facade-signed-url';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StatusDot } from '@/components/shared/DataTable';
import { MapPin, Cpu, Calendar, Users, Pencil } from 'lucide-react';
import Link from 'next/link';
import { StoreDetailClient, StoreToggle, MaintenanceButton } from './StoreDetailClient';
import { StoreContactActions } from './StoreContactActions';

interface StoreDetailPageProps {
  params: Promise<{ locale: string; storeId: string }>;
}

export default async function StoreDetailPage({ params }: StoreDetailPageProps) {
  const { locale, storeId } = await params;
  const t = await getTranslations('storeDetail');

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
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 128px)' }}>
      {/* Breadcrumb + Toggle top-right */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <Breadcrumb
          locale={locale}
          items={[
            { label: t('breadcrumbStores'), href: `/${locale}/stores` },
            { label: store.name },
          ]}
          className="mb-0"
        />

        <div className="flex items-center gap-3">
          <MaintenanceButton storeId={storeId} storeStatus={store.status} />

          <Link
            href={`/${locale}/stores/${storeId}/edit`}
            className="flex items-center gap-2 px-4 py-1.5 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition active:scale-[0.97] cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            {t('edit')}
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

      {/* 2-column layout: Tabs (2/3) | Info + Stats (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start lg:items-stretch lg:grid-rows-1 flex-1 min-h-0">
        {/* Left: Tabs — sessions + devices */}
        <div className="lg:col-span-2 flex flex-col min-h-0 h-full">
          <StoreTabsClient storeId={storeId} locale={locale} />

          {/* Back to stores — pinned at bottom */}
          <div className="flex-shrink-0 mt-auto pt-4 pb-2">
            <Link
              href={`/${locale}/stores`}
              className="text-[14px] font-medium text-[#667085] hover:text-[#0000FF] transition-colors"
            >
              {t('backToStores')}
            </Link>
          </div>
        </div>

        {/* Right column: fills available height, scrolls internally on small heights */}
        <div className="flex flex-col lg:min-h-0 lg:overflow-y-auto">
          {/* Store info + stats card */}
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] overflow-hidden flex flex-col lg:flex-1">
            {/* Facade photo — 24vh banner */}
            <div className="relative w-full flex flex-col justify-end" style={{ height: '20vh' }}>
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
                      {t('openSession', { type: store.open_session_type ?? '' })}
                    </p>
                    {store.open_session_installer_name && (
                      <p className="text-[11px] text-[#8B7200]">
                        {t('installer', { name: store.open_session_installer_name })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pt-4 pb-2 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <StatusDot status={store.status} />
                <h1 className="text-[18px] font-semibold text-[#191919] leading-tight">
                  {store.name}
                </h1>
              </div>

              <div className="space-y-1 text-[13px] text-[#667085] mb-3">
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
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 mb-2 px-3 py-2.5 rounded-[8px] bg-[#F9FAFB]">
              {/* Row 1 */}
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#667085]">{t('devices')}</p>
                  <p className="text-[15px] font-semibold text-[#191919]">
                    {store.installed_devices_count ?? 0} / {store.authorized_devices_count}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#667085]">{t('sessions')}</p>
                  <p className="text-[15px] font-semibold text-[#191919]">
                    {store.total_sessions_count ?? 0}
                  </p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#82A2C2] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[#667085]">{t('responsible')}</p>
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

            </div>
            {/* Action buttons — direct card child, full-width dividers, anchored to bottom */}
            <div className="mt-auto">
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
  );
}

// Import this here to avoid circular dependency issues
import { StoreTabsClient } from './StoreTabsClient';
