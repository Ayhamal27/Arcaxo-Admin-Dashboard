'use client';

import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Search, Cpu, Phone, Cpu as ChipIcon, Eye, X, Copy, Check } from 'lucide-react';

import { listSensorsAction } from '@/actions/sensors/list-sensors';
import { useSensorsStore } from '@/lib/stores/sensors-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RpcAdminListSensorsOutputItem } from '@/types/rpc-outputs';
import Link from 'next/link';
import { format, isValid } from 'date-fns';

function safeFormat(date: string | null | undefined, fmt: string) {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt) : '—';
}

function ActivityDot({ status, isActive }: { status: string; isActive: boolean }) {
  let color = '#9CA3AF';
  if (status === 'installed' && isActive) color = '#228D70';
  else if (status === 'installed' && !isActive) color = '#FF4163';
  else if (status === 'connecting') color = '#F59E0B';
  else if (status === 'failed') color = '#FF4163';
  else if (status === 'uninstalled') color = '#FF4163';

  return (
    <span
      className="inline-block w-[14px] h-[14px] rounded-full flex-shrink-0"
      style={{
        backgroundColor: `${color}CC`,
        boxShadow: `0 0 5px 2px ${color}66, 0 0 10px 3px ${color}33`,
      }}
    />
  );
}

function LocationFilledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </svg>
  );
}

interface PhoneModalSensor {
  serial: string;
  store_name?: string | null;
  installer_name?: string | null;
  installer_phone?: string | null;
  city_name?: string | null;
}

function PhoneModal({ sensor, onClose }: { sensor: PhoneModalSensor; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const tD = useTranslations('devices');
  const tC = useTranslations('common');
  const phone = sensor.installer_phone ?? null;

  const handleCopy = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[15px] p-6 w-full max-w-[380px] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-full bg-[#0000FF] flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#191919]">{tD('contactInstaller')}</p>
              {sensor.store_name && (
                <p className="text-[13px] text-[#667085]">{sensor.store_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors text-[#667085]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installer info */}
        {sensor.installer_name ? (
          <div className="bg-[#F9F9FF] rounded-[10px] px-4 py-3 mb-4 space-y-1">
            <p className="text-[15px] font-semibold text-[#191919]">{sensor.installer_name}</p>
            {sensor.city_name && (
              <p className="text-[13px] text-[#667085]">{sensor.city_name}</p>
            )}
          </div>
        ) : (
          <div className="bg-[#F9F9F9] rounded-[10px] px-4 py-3 mb-4">
            <p className="text-[13px] text-[#9CA3AF]">{tD('noInstallerAssigned')}</p>
          </div>
        )}

        {/* Phone number */}
        {phone ? (
          <>
            <div className="bg-[#F5F5F5] rounded-[10px] px-4 py-3 flex items-center justify-between mb-4">
              <span className="text-[18px] font-semibold text-[#191919] tracking-wide">{phone}</span>
              <button
                onClick={handleCopy}
                className="ml-3 flex items-center gap-1.5 text-[13px] text-[#0000FF] hover:opacity-80 transition-opacity cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? tC('copied') : tC('copy')}
              </button>
            </div>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-2 w-full h-[44px] bg-[#0000FF] text-white text-[15px] font-medium rounded-[10px] hover:bg-[#0000CC] transition-colors"
            >
              <Phone className="w-4 h-4" />
              {tD('call')}
            </a>
          </>
        ) : (
          <div className="text-center py-3 mb-1">
            <p className="text-[14px] text-[#9CA3AF]">{tD('phoneNotAvailable')}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[10px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
        >
          {tC('close')}
        </button>
      </div>
    </div>
  );
}

export default function DispositivosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('devices');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [phoneModal, setPhoneModal] = useState<PhoneModalSensor | null>(null);

  const { filters, pagination, setFilters, setPage } = useSensorsStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sensors', filters, pagination.currentPage, pagination.pageSize],
    queryFn: () =>
      listSensorsAction({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        search: filters.search,
        filterIsActive: filters.filterIsActive,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });

  const sensors = data?.sensors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      {/* Action bar */}
      <div className="flex gap-[18px] items-center mb-[44px]">
        <div className="relative h-[50px] w-[445px]">
          <div className="absolute left-[13px] top-[15px]">
            <Search className="w-5 h-5 text-[#667085]" />
          </div>
          <input
            type="text"
            placeholder={tCommon('search')}
            value={filters.search ?? ''}
            onChange={(e) =>
              startTransition(() => setFilters({ search: e.target.value || undefined }))
            }
            className="w-full h-full pl-[41px] pr-4 bg-white border border-[#D0D5DD] rounded-[10px] text-[16px] text-[#191919] placeholder:text-[#667085] focus:border-[#0000FF] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : isError ? (
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] flex items-center justify-center">
          <p className="text-[16px] text-[#FF4163]">{t('errorLoading')}</p>
        </div>
      ) : sensors.length === 0 ? (
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] flex items-center justify-center">
          <EmptyState
            icon={<Cpu className="w-12 h-12" />}
            title={t('noDevices')}
            description={t('noDevicesDesc')}
          />
        </div>
      ) : (
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] px-[20px] py-[25px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-center p-[10px] text-[18px] font-semibold text-[#161616] w-[90px] min-w-[90px]">
                    {t('activity')}
                  </th>
                  <th className="text-left pl-[15px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[200px] min-w-[180px]">
                    {t('serialColumn')}
                  </th>
                  <th className="text-left pl-[15px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[160px] min-w-[140px]">
                    {t('installer')}
                  </th>
                  <th className="text-left px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[160px] min-w-[140px]">
                    {t('store')}
                  </th>
                  <th className="text-left px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[170px] min-w-[150px]">
                    {t('zone')}
                  </th>
                  <th className="text-left px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[140px] min-w-[120px]">
                    {t('lastVisit')}
                  </th>
                  <th className="text-center p-[10px] text-[18px] font-semibold text-[#161616] w-[130px] min-w-[130px]">
                    {tCommon('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sensors.map((row) => (
                  <tr
                    key={row.sensor_id}
                    className="h-[74px] hover:bg-[#FAFAFF] transition-colors cursor-pointer"
                    onClick={() => router.push(`/${locale}/devices/${row.sensor_id}`)}
                  >
                    {/* Actividad */}
                    <td className="p-[10px]">
                      <div className="flex items-center justify-center">
                        <ActivityDot status={row.current_status} isActive={row.is_active} />
                      </div>
                    </td>

                    {/* Serial */}
                    <td className="p-[15px]">
                      <div className="flex items-center gap-[6px]">
                        <ChipIcon className="w-[18px] h-[18px] text-[#667085] flex-shrink-0" />
                        <span className="text-[18px] text-[#404D61]">{row.serial}</span>
                      </div>
                    </td>

                    {/* Instalador */}
                    <td className="pl-[15px] pr-[10px]">
                      <span className="text-[18px] text-[#404D61]">—</span>
                    </td>

                    {/* Tienda */}
                    <td className="px-[15px]">
                      <span className="text-[18px] text-[#404D61]">{row.store_name ?? '—'}</span>
                    </td>

                    {/* Zona */}
                    <td className="px-[15px]">
                      <div className="flex items-center gap-[6px]">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[18px] text-[#404D61] leading-[22px] whitespace-nowrap">
                            {row.city_name ?? '—'}
                          </span>
                        </div>
                        {row.city_name && (
                          <LocationFilledIcon className="w-[14px] h-[14px] text-[#0000FF] flex-shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Ultima visita */}
                    <td className="px-[15px]">
                      <span className="text-[18px] text-[#404D61]">
                        {safeFormat(row.installed_at, 'dd/MM/yyyy')}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td
                      className="px-[10px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-[16px]">
                        {/* Ver detalle */}
                        <Link
                          href={`/${locale}/devices/${row.sensor_id}`}
                          className="flex items-center justify-center h-[36px] w-[36px] border border-[#0000FF] rounded-[8px] text-[#0000FF] hover:bg-[#F0F0FF] transition-colors flex-shrink-0"
                          title="Ver detalle"
                        >
                          <Eye className="w-[18px] h-[18px]" />
                        </Link>

                        {/* Llamar */}
                        <button
                          className="flex items-center justify-center h-[36px] w-[36px] bg-[#0000FF] rounded-[8px] text-white hover:bg-[#0000CC] transition-colors flex-shrink-0 cursor-pointer"
                          title="Ver teléfono del instalador"
                          onClick={() =>
                            setPhoneModal({
                              serial: row.serial,
                              store_name: row.store_name,
                              installer_name: row.installer_name,
                              installer_phone: row.installer_phone,
                              city_name: row.city_name,
                            })
                          }
                        >
                          <Phone className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Phone modal */}
      {phoneModal && (
        <PhoneModal sensor={phoneModal} onClose={() => setPhoneModal(null)} />
      )}
    </div>
  );
}
