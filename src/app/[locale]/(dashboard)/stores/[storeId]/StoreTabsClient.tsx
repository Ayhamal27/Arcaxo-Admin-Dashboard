'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { TooltipHint } from '@/components/shared/TooltipHint';
import { listStoreSessionsAction } from '@/actions/stores/list-store-sessions';
import { listStoreDevicesAction } from '@/actions/stores/list-store-devices';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { format, isValid, type Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

function safeFormat(date: string | null | undefined, fmt: string, dateLocale: Locale) {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt, { locale: dateLocale }) : '—';
}

interface StoreTabsClientProps {
  storeId: string;
  locale: string;
}

export function StoreTabsClient({ storeId, locale }: StoreTabsClientProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'devices'>('sessions');
  const t = useTranslations('storeDetail');
  const dateLocale = locale === 'en' ? enUS : es;

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['store-sessions', storeId],
    queryFn: () => listStoreSessionsAction({ storeId, pageSize: 20 }),
    enabled: activeTab === 'sessions',
  });

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['store-devices', storeId],
    queryFn: () => listStoreDevicesAction({ storeId, pageSize: 20 }),
    enabled: activeTab === 'devices',
  });

  const sessions = sessionsData?.sessions ?? [];
  const devices = devicesData?.devices ?? [];

  return (
    <div className="bg-white rounded-[15px] border border-[#E5E5EA] overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Tab headers */}
      <div className="flex border-b border-[#E5E5EA] flex-shrink-0">
        <button
          onClick={() => setActiveTab('sessions')}
          className={[
            "relative px-6 py-4 text-[14px] font-medium transition-colors duration-150",
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#0000FF]",
            "after:transition-transform after:duration-200 after:ease-out after:origin-left",
            activeTab === 'sessions'
              ? 'text-[#0000FF] bg-[#F0F0FF] after:scale-x-100'
              : 'text-[#667085] hover:text-[#191919] after:scale-x-0',
          ].join(' ')}
        >
          {t('tabSessions')}
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={[
            "relative px-6 py-4 text-[14px] font-medium transition-colors duration-150",
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#0000FF]",
            "after:transition-transform after:duration-200 after:ease-out after:origin-left",
            activeTab === 'devices'
              ? 'text-[#0000FF] bg-[#F0F0FF] after:scale-x-100'
              : 'text-[#667085] hover:text-[#191919] after:scale-x-0',
          ].join(' ')}
        >
          {t('tabDevices')}
        </button>
      </div>

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="overflow-y-auto flex-1 min-h-0">
          {sessionsLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-[#667085]">{t('noSessions')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9F9] sticky top-0 z-10">
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableType')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableStatus')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableInstaller')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableOpened')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">
                    <span className="flex items-center gap-1">
                      {t('devices')}
                      <TooltipHint text={t('tableDevicesTooltip')} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, index) => (
                  <tr
                    key={s.session_id}
                    className="border-t border-[#F0F0F0] hover:bg-[#F9F9F9] transition-colors duration-150 animate-in fade-in duration-200"
                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                  >
                    <td className="px-6 py-4 text-[14px] text-[#191919] capitalize">{s.session_type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                        s.status === 'open'
                          ? 'bg-[#FFF9E6] text-[#8B7200]'
                          : s.status === 'completed'
                          ? 'bg-[#E6F9F1] text-[#228D70]'
                          : s.status === 'closed'
                          ? 'bg-[#F5F5F5] text-[#667085]'
                          : 'bg-[#FFE8EC] text-[#FF4163]'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#667085]">{s.installer_name ?? '—'}</td>
                    <td className="px-6 py-4 text-[14px] text-[#667085]">
                      {safeFormat(s.opened_at, 'd MMM yyyy', dateLocale)}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#191919]">
                      {s.installed_devices_at_open} / {s.required_devices_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Devices tab */}
      {activeTab === 'devices' && (
        <div className="overflow-y-auto flex-1 min-h-0">
          {devicesLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : devices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-[#667085]">{t('noDevices')}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9F9] sticky top-0 z-10">
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableSerial')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableMac')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableVersion')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableStatus')}</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider bg-[#F9F9F9]">{t('tableInstalled')}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d, index) => (
                  <tr
                    key={d.sensor_id}
                    className="border-t border-[#F0F0F0] hover:bg-[#F9F9F9] transition-colors duration-150 animate-in fade-in duration-200"
                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                  >
                    <td className="px-6 py-4 text-[14px] font-medium text-[#191919]">{d.serial}</td>
                    <td className="px-6 py-4 text-[13px] text-[#667085] font-mono">{d.mac_normalized}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F0F5] text-[#667085]">
                          FW: {d.firmware_version ?? '-'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F0F5] text-[#667085]">
                          HW: {d.hardware_version ?? '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                        d.current_status === 'installed'
                          ? 'bg-[#E6F9F1] text-[#228D70]'
                          : d.current_status === 'failed'
                          ? 'bg-[#FFE8EC] text-[#FF4163]'
                          : 'bg-[#F5F5F5] text-[#667085]'
                      }`}>
                        {d.current_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#667085]">
                      {safeFormat(d.installed_at, 'd MMM yyyy', dateLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
