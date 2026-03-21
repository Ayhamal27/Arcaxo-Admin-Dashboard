import { notFound } from 'next/navigation';
import { getStoreDetailAction } from '@/actions/stores/get-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StatusDot } from '@/components/shared/DataTable';
import { MapPin, Phone, Users, Cpu, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  return (
    <div>
      <Breadcrumb
        locale={locale}
        items={[
          { label: 'Tiendas', href: `/${locale}/tiendas` },
          { label: store.name },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info card */}
        <div className="lg:col-span-2 bg-white rounded-[15px] border border-[#E5E5EA] p-6">
          <div className="flex items-start gap-6">
            {/* Facade photo */}
            {store.facade_photo_url ? (
              <Image
                src={store.facade_photo_url}
                alt={store.name}
                width={120}
                height={120}
                className="rounded-[10px] object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-[120px] h-[120px] rounded-[10px] bg-[#F0F0F5] flex items-center justify-center flex-shrink-0">
                <span className="text-[#D0D5DD] text-[36px]">🏪</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <StatusDot status={store.status} />
                <h1 className="text-[24px] font-semibold text-[#191919]">{store.name}</h1>
              </div>

              <div className="flex items-start gap-2 text-[14px] text-[#667085] mb-1">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{store.address}</span>
              </div>

              {store.city_name && (
                <p className="text-[14px] text-[#667085] pl-6">
                  {store.city_name}
                  {store.state_name ? `, ${store.state_name}` : ''}
                </p>
              )}

              {store.phone_number && (
                <div className="flex items-center gap-2 mt-2 text-[14px] text-[#667085]">
                  <Phone className="w-4 h-4" />
                  <span>
                    {store.phone_country_code} {store.phone_number}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-[#161616] mb-4">Estadísticas</h2>

          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-[#82A2C2]" />
            <div>
              <p className="text-[12px] text-[#667085]">Dispositivos</p>
              <p className="text-[18px] font-semibold text-[#191919]">
                {store.installed_devices_count ?? 0} / {store.authorized_devices_count}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#82A2C2]" />
            <div>
              <p className="text-[12px] text-[#667085]">Total sesiones</p>
              <p className="text-[18px] font-semibold text-[#191919]">
                {store.total_sessions_count ?? 0}
              </p>
            </div>
          </div>

          {store.responsible && (
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#82A2C2]" />
              <div>
                <p className="text-[12px] text-[#667085]">Responsable</p>
                <p className="text-[14px] font-medium text-[#191919]">
                  {(store.responsible as Record<string, string>)?.first_name}{' '}
                  {(store.responsible as Record<string, string>)?.last_name}
                </p>
              </div>
            </div>
          )}

          {store.open_session_id && (
            <div className="mt-4 p-3 bg-[#FFF9E6] border border-[#FADC45] rounded-[8px]">
              <p className="text-[13px] font-medium text-[#8B7200]">
                Sesión abierta: {store.open_session_type}
              </p>
              {store.open_session_installer_name && (
                <p className="text-[12px] text-[#8B7200]">
                  Instalador: {store.open_session_installer_name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Back link */}
      <div className="mt-6">
        <Link
          href={`/${locale}/tiendas`}
          className="text-[14px] text-[#0000FF] hover:underline"
        >
          ← Volver a tiendas
        </Link>
      </div>
    </div>
  );
}
