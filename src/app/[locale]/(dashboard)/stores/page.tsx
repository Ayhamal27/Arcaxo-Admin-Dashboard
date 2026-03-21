'use client';

import { use, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Search, RotateCcw, ArrowUpDown } from 'lucide-react';

import { listStoresAction } from '@/actions/stores/list-stores';
import { useStoresStore } from '@/lib/stores/stores-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  PageActionBar,
  ActionButton,
  SearchInput,
  FilterSelect,
  ResetButton,
} from '@/components/layout/PageActionBar';
import { DataTable, ColumnDef, StatusDot } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RpcAdminListStoresOutputItem } from '@/types/rpc-outputs';
import { Store } from 'lucide-react';
import { StoreImage } from '@/components/shared/StoreImage';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

function safeFormat(date: string | null | undefined, fmt: string) {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt, { locale: es }) : '—';
}

export default function TiendasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('stores');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { filters, pagination, setFilters, resetFilters, setPage } = useStoresStore();

  // Data fetching via React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stores', filters, pagination.currentPage, pagination.pageSize],
    queryFn: () =>
      listStoresAction({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filterStatus: filters.filterStatus,
        filterActive: filters.filterActive,
      }),
  });

  const columns: ColumnDef<RpcAdminListStoresOutputItem>[] = [
    {
      key: 'status',
      header: '',
      width: '32px',
      render: (row) => <StatusDot status={row.status} />,
    },
    {
      key: 'name',
      header: t('name'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <StoreImage src={row.facade_photo_url} alt={row.name} />
          <div>
            <p className="text-[18px] font-semibold text-[#191919] leading-tight">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'devices',
      header: t('devices'),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-[#333]">
            {row.installed_devices_count}/{row.authorized_devices_count}
          </span>
        </div>
      ),
    },
    {
      key: 'zone',
      header: t('location'),
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] text-[#333]">{row.city_name ?? '—'}</span>
          {row.google_maps_url && (
            <a
              href={row.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[#0000FF] hover:underline truncate max-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              {t('viewMap')}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'last_visit',
      header: t('createdAt'),
      sortable: true,
      render: (row) => (
        <span className="text-[15px] text-[#333]">
          {safeFormat(row.last_visit_date, 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: tCommon('actions'),
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/${locale}/stores/${row.store_id}`}
            className="px-4 py-2 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors whitespace-nowrap"
          >
            {tCommon('expand')}
          </Link>
        </div>
      ),
    },
  ];

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      startTransition(() => setFilters({ search: e.target.value || undefined }));
    },
    [setFilters]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [sortBy, sortOrder] = e.target.value.split(':') as [string, 'asc' | 'desc'];
      setFilters({ sortBy, sortOrder });
    },
    [setFilters]
  );

  const stores = data?.stores ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      <PageActionBar>
        <ActionButton
          icon={<Plus className="w-5 h-5" />}
          onClick={() => router.push(`/${locale}/stores/new`)}
        >
          {t('newStore')}
        </ActionButton>

        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={handleSearch}
          icon={<Search className="w-4 h-4" />}
        />

        <FilterSelect
          value={`${filters.sortBy ?? 'name'}:${filters.sortOrder ?? 'asc'}`}
          onChange={handleSortChange}
          icon={<ArrowUpDown className="w-4 h-4" />}
        >
          <option value="name:asc">{t('sortNameAZ')}</option>
          <option value="name:desc">{t('sortNameZA')}</option>
          <option value="status:asc">{t('sortStatus')}</option>
          <option value="updated_at:desc">{t('sortNewest')}</option>
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
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] flex items-center justify-center">
          <p className="text-[16px] text-[#FF4163]">{tCommon('error')}</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] flex items-center justify-center">
          <EmptyState
            title={t('noStores')}
            description={t('noStoresDesc')}
            actionLabel={t('newStore')}
            onAction={() => router.push(`/${locale}/stores/new`)}
          />
        </div>
      ) : (
        <>
          <DataTable
            data={stores}
            columns={columns}
            onRowClick={(row) => router.push(`/${locale}/stores/${row.store_id}`)}
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
