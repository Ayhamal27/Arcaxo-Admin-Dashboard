'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStoreSessionsAction } from '@/actions/stores/list-store-sessions';
import { listStoreDevicesAction } from '@/actions/stores/list-store-devices';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

function safeFormat(date: string | null | undefined, fmt: string) {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt, { locale: es }) : '—';
}

interface StoreTabsClientProps {
  storeId: string;
  locale: string;
}

export function StoreTabsClient({ storeId, locale: _locale }: StoreTabsClientProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'devices'>('sessions');

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
    <div className="bg-white rounded-[15px] border border-[#E5E5EA] overflow-hidden">
      {/* Tab headers */}
      <div className="flex border-b border-[#E5E5EA]">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-6 py-4 text-[14px] font-medium transition-colors ${
            activeTab === 'sessions'
              ? 'text-[#0000FF] border-b-2 border-[#0000FF]'
              : 'text-[#667085] hover:text-[#191919]'
          }`}
        >
          Sesiones
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-6 py-4 text-[14px] font-medium transition-colors ${
            activeTab === 'devices'
              ? 'text-[#0000FF] border-b-2 border-[#0000FF]'
              : 'text-[#667085] hover:text-[#191919]'
          }`}
        >
          Dispositivos
        </button>
      </div>

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div>
          {sessionsLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-[#667085]">No hay sesiones registradas</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9F9]">
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Instalador</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Apertura</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Dispositivos</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.session_id} className="border-t border-[#F0F0F0] hover:bg-[#F9F9F9]">
                    <td className="px-6 py-4 text-[14px] text-[#191919] capitalize">{s.session_type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
                        s.status === 'open'
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
                      {safeFormat(s.opened_at, 'd MMM yyyy')}
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
        <div>
          {devicesLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : devices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[14px] text-[#667085]">No hay dispositivos registrados</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#F9F9F9]">
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Serial</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">MAC</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-[12px] font-semibold text-[#667085] uppercase tracking-wider">Instalado</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.sensor_id} className="border-t border-[#F0F0F0] hover:bg-[#F9F9F9]">
                    <td className="px-6 py-4 text-[14px] font-medium text-[#191919]">{d.serial}</td>
                    <td className="px-6 py-4 text-[13px] text-[#667085] font-mono">{d.mac_normalized}</td>
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
                      {safeFormat(d.installed_at, 'd MMM yyyy')}
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
