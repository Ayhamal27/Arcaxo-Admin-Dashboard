import { notFound } from 'next/navigation';
import { getSensorDetailAction } from '@/actions/sensors/get-sensor';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MapPin, Calendar, Store, Cpu } from 'lucide-react';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { SensorActionsClient } from './SensorActionsClient';

function safeFormat(dateStr: string, fmt: string) {
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt, { locale: es }) : '—';
}

interface SensorDetailPageProps {
  params: Promise<{ locale: string; sensorId: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  installed: { label: 'Instalado', className: 'bg-[#E6F9F1] text-[#228D70]' },
  failed: { label: 'Fallido', className: 'bg-[#FFE8EC] text-[#FF4163]' },
  uninstalled: { label: 'Desinstalado', className: 'bg-[#F5F5F5] text-[#667085]' },
  connecting: { label: 'Conectando', className: 'bg-[#FFF9E6] text-[#8B7200]' },
};

export default async function SensorDetailPage({ params }: SensorDetailPageProps) {
  const { locale, sensorId } = await params;

  let sensor;
  try {
    sensor = await getSensorDetailAction(sensorId);
  } catch {
    notFound();
  }

  if (!sensor) notFound();

  const statusConfig = STATUS_CONFIG[sensor.current_status] ?? {
    label: sensor.current_status,
    className: 'bg-[#F5F5F5] text-[#667085]',
  };

  return (
    <div>
      <Breadcrumb
        locale={locale}
        items={[
          { label: 'Dispositivos', href: `/${locale}/dispositivos` },
          { label: sensor.serial },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info card */}
        <div className="lg:col-span-2 bg-white rounded-[15px] border border-[#E5E5EA] p-6">
          <div className="flex items-start gap-4">
            <div className="w-[60px] h-[60px] rounded-[12px] bg-[#F0F0F5] flex items-center justify-center flex-shrink-0">
              <Cpu className="w-7 h-7 text-[#82A2C2]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-[24px] font-semibold text-[#191919]">{sensor.serial}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                    sensor.is_active
                      ? 'bg-[#E6F9F1] text-[#228D70]'
                      : 'bg-[#F5F5F5] text-[#667085]'
                  }`}
                >
                  {sensor.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <p className="text-[14px] text-[#667085] font-mono">{sensor.mac_normalized}</p>
            </div>
          </div>

          {/* Additional data */}
          <div className="mt-6 pt-6 border-t border-[#E5E5EA] grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensor.store_name && (
              <div className="flex items-start gap-3">
                <Store className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Tienda actual</p>
                  <p className="text-[15px] font-medium text-[#191919]">{sensor.store_name}</p>
                  {sensor.store_address && (
                    <p className="text-[12px] text-[#667085]">{sensor.store_address}</p>
                  )}
                </div>
              </div>
            )}

            {(sensor.city_name || sensor.country_code) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Ubicación</p>
                  <p className="text-[15px] font-medium text-[#191919]">
                    {sensor.city_name ?? ''}
                    {sensor.country_code ? `, ${sensor.country_code}` : ''}
                  </p>
                </div>
              </div>
            )}

            {sensor.installed_at && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Fecha de instalación</p>
                  <p className="text-[15px] font-medium text-[#191919]">
                    {safeFormat(sensor.installed_at, 'd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}

            {sensor.uninstalled_at && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Fecha de desinstalación</p>
                  <p className="text-[15px] font-medium text-[#191919]">
                    {safeFormat(sensor.uninstalled_at, 'd MMM yyyy')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History card */}
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-6 space-y-4">
          <h2 className="text-[18px] font-semibold text-[#161616]">Historial</h2>

          <div>
            <p className="text-[12px] text-[#667085]">Registrado</p>
            <p className="text-[14px] text-[#191919]">
              {safeFormat(sensor.created_at, 'd MMM yyyy')}
            </p>
          </div>

          <div>
            <p className="text-[12px] text-[#667085]">Última actualización</p>
            <p className="text-[14px] text-[#191919]">
              {safeFormat(sensor.updated_at, 'd MMM yyyy, HH:mm')}
            </p>
          </div>

          {sensor.decommissioned_at && (
            <div className="p-3 bg-[#FFE8EC] border border-[#FF4163] rounded-[8px]">
              <p className="text-[13px] font-medium text-[#FF4163]">Dado de baja</p>
              <p className="text-[12px] text-[#FF4163]">
                {safeFormat(sensor.decommissioned_at, 'd MMM yyyy')}
              </p>
              {sensor.decommission_reason && (
                <p className="text-[12px] text-[#FF4163] mt-1">{sensor.decommission_reason}</p>
              )}
              {sensor.decommission_note && (
                <p className="text-[12px] text-[#667085] mt-1">{sensor.decommission_note}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <SensorActionsClient
          sensorId={sensor.sensor_id}
          currentStatus={sensor.current_status}
          isActive={sensor.is_active}
          locale={locale}
        />
      </div>

      {/* Back link */}
      <div className="mt-4">
        <Link
          href={`/${locale}/dispositivos`}
          className="text-[14px] text-[#0000FF] hover:underline"
        >
          ← Volver a dispositivos
        </Link>
      </div>
    </div>
  );
}
