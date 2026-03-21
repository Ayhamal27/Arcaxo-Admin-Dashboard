'use client';

import { use, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Search, RotateCcw, Cpu } from 'lucide-react';

import { listSensorsAction } from '@/actions/sensors/list-sensors';
import { useSensorsStore } from '@/lib/stores/sensors-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  PageActionBar,
  SearchInput,
  FilterSelect,
  ResetButton,
} from '@/components/layout/PageActionBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RpcAdminListSensorsOutputItem } from '@/types/rpc-outputs';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  installed: { label: 'Instalado', className: 'bg-[#E6F9F1] text-[#228D70]' },
  failed: { label: 'Fallido', className: 'bg-[#FFE8EC] text-[#FF4163]' },
  uninstalled: { label: 'Desinstalado', className: 'bg-[#F5F5F5] text-[#667085]' },
  connecting: { label: 'Conectando', className: 'bg-[#FFF9E6] text-[#8B7200]' },
};

function SensorStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-[#F5F5F5] text-[#667085]' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${config.className}`}>
      {config.label}
    </span>
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

  const { filters, pagination, setFilters, resetFilters, setPage } = useSensorsStore();

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

  const columns: ColumnDef<RpcAdminListSensorsOutputItem>[] = [
    {
      key: 'serial',
      header: t('serialNumber'),
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-[15px] font-semibold text-[#191919]">{row.serial}</p>
          <p className="text-[12px] text-[#667085] font-mono">{row.mac_normalized}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (row) => <SensorStatusBadge status={row.current_status} />,
    },
    {
      key: 'active',
      header: 'Activo',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium ${
            row.is_active
              ? 'bg-[#E6F9F1] text-[#228D70]'
              : 'bg-[#F5F5F5] text-[#667085]'
          }`}
        >
          {row.is_active ? 'Sí' : 'No'}
        </span>
      ),
    },
    {
      key: 'store',
      header: t('store'),
      render: (row) => (
        <div>
          <p className="text-[15px] text-[#191919]">{row.store_name ?? '—'}</p>
          {row.city_name && (
            <p className="text-[12px] text-[#667085]">{row.city_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'installed_at',
      header: t('installDate'),
      render: (row) => (
        <span className="text-[14px] text-[#667085]">
          {row.installed_at
            ? format(new Date(row.installed_at), 'd MMM yyyy', { locale: es })
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tCommon('actions'),
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/${locale}/dispositivos/${row.sensor_id}`}
            className="px-4 py-2 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors whitespace-nowrap"
          >
            Ampliar
          </Link>
        </div>
      ),
    },
  ];

  const sensors = data?.sensors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  return (
    <div>
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      <PageActionBar>
        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={(e) =>
            startTransition(() => setFilters({ search: e.target.value || undefined }))
          }
          icon={<Search className="w-4 h-4" />}
        />

        <FilterSelect
          value={filters.filterIsActive === undefined ? '' : String(filters.filterIsActive)}
          onChange={(e) => {
            const val = e.target.value;
            setFilters({
              filterIsActive: val === '' ? undefined : val === 'true',
            });
          }}
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </FilterSelect>

        <ResetButton
          onClick={resetFilters}
          icon={<RotateCcw className="w-4 h-4" />}
          title={tCommon('reset')}
        />
      </PageActionBar>

      {isLoading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : isError ? (
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-12 text-center">
          <p className="text-[16px] text-[#FF4163]">{tCommon('error')}</p>
        </div>
      ) : (
        <>
          <DataTable
            data={sensors}
            columns={columns}
            isEmpty={sensors.length === 0}
            emptyContent={
              <EmptyState
                icon={<Cpu className="w-12 h-12" />}
                title="No hay dispositivos registrados"
                description="Los dispositivos aparecerán aquí una vez instalados"
              />
            }
            onRowClick={(row) => router.push(`/${locale}/dispositivos/${row.sensor_id}`)}
          />
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
