'use client';

import { use, useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Search,
  RotateCcw,
  ArrowUpDown,
  Cpu,
  Phone,
  SquarePen,
  Copy,
  Check,
} from 'lucide-react';

import { listStoresAction } from '@/actions/stores/list-stores';
import { listStoreDevicesAction } from '@/actions/stores/list-store-devices';
import { useStoresStore } from '@/lib/stores/stores-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  PageActionBar,
  ActionButton,
  SearchInput,
  FilterSelect,
  ResetButton,
} from '@/components/layout/PageActionBar';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StoreImage } from '@/components/shared/StoreImage';
import { RpcAdminListStoreSensorsOutputItem } from '@/types/rpc-outputs';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

function safeFormat(date: string | null | undefined, fmt: string) {
  if (!date) return '—';
  const d = new Date(date);
  return isValid(d) ? format(d, fmt, { locale: es }) : '—';
}

// ─── Activity Dot with glow (matches devices page) ───────────────────────────

const STORE_STATUS_COLORS: Record<string, string> = {
  operational: '#228D70',
  active: '#228D70',
  new_store: '#0000FF',
  maintenance: '#F59E0B',
  inactive: '#FF4163',
  suspended: '#FF4163',
};

function StoreActivityDot({ status }: { status: string }) {
  const color = STORE_STATUS_COLORS[status] ?? '#9CA3AF';
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

// ─── Location icon (inline SVG) ──────────────────────────────────────────────

function LocationFilledIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </svg>
  );
}

// ─── Chip icon (colored) ─────────────────────────────────────────────────────

function ChipIcon({ color }: { color: string }) {
  return <Cpu className="w-[16px] h-[16px] flex-shrink-0" style={{ color }} />;
}

// ─── Devices cell: active/inactive sensor rows ──────────────────────────────

function DevicesCell({
  sensors,
  isLoading,
  locale,
  installedCount,
  authorizedCount,
}: {
  sensors: RpcAdminListStoreSensorsOutputItem[] | undefined;
  isLoading: boolean;
  locale: string;
  installedCount: number;
  authorizedCount: number;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-[18px] w-[120px] bg-[#F0F0F5] rounded animate-pulse" />
        <div className="h-[18px] w-[80px] bg-[#F0F0F5] rounded animate-pulse" />
      </div>
    );
  }

  if (!sensors || sensors.length === 0) {
    return (
      <span className="text-[15px] text-[#9CA3AF]">
        {installedCount}/{authorizedCount}
      </span>
    );
  }

  const active = sensors.filter((s) => s.is_active);
  const inactive = sensors.filter((s) => !s.is_active);

  return (
    <div className="flex flex-col gap-[5px]" onClick={(e) => e.stopPropagation()}>
      {active.length > 0 && (
        <div className="flex items-center gap-0">
          <span className="text-[16px] text-black w-[17px] text-center">{active.length}</span>
          <ChipIcon color="#228D70" />
          <span className="text-[15px] text-black">
            :{' '}
            {active.map((s, i) => (
              <span key={s.sensor_id}>
                <Link
                  href={`/${locale}/devices/${s.sensor_id}`}
                  className="text-[#0000FF] hover:underline"
                >
                  {s.serial.slice(-4)}
                </Link>
                {i < active.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </span>
        </div>
      )}
      {inactive.length > 0 && (
        <div className="flex items-center gap-0">
          <span className="text-[16px] text-black w-[17px] text-center">{inactive.length}</span>
          <ChipIcon color="#FF4163" />
          <span className="text-[15px] text-black">
            :{' '}
            {inactive.map((s, i) => (
              <span key={s.sensor_id}>
                <Link
                  href={`/${locale}/devices/${s.sensor_id}`}
                  className="text-[#0000FF] hover:underline"
                >
                  {s.serial.slice(-4)}
                </Link>
                {i < inactive.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Phone modal ─────────────────────────────────────────────────────────────

interface StorePhoneInfo {
  name: string;
  city_name?: string;
  phone_country_code?: string;
  phone_number?: string;
}

function StorePhoneModal({ store, onClose }: { store: StorePhoneInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('stores');
  const tC = useTranslations('common');

  const phone =
    store.phone_country_code && store.phone_number
      ? `${store.phone_country_code} ${store.phone_number}`
      : store.phone_number ?? null;

  const handleCopy = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[15px] p-6 w-full max-w-[380px] shadow-xl animate-in fade-in zoom-in-95 duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-[40px] h-[40px] rounded-full bg-[#0000FF] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-[#191919]">{t('contactStore')}</p>
            <p className="text-[13px] text-[#667085]">{store.name}</p>
          </div>
        </div>

        {store.city_name && (
          <div className="bg-[#F9F9FF] rounded-[10px] px-4 py-3 mb-4">
            <p className="text-[13px] text-[#667085]">{store.city_name}</p>
          </div>
        )}

        {phone ? (
          <>
            <div className="bg-[#F5F5F5] rounded-[10px] px-4 py-3 flex items-center justify-between mb-4">
              <span className="text-[18px] font-semibold text-[#191919] tracking-wide">
                {phone}
              </span>
              <button
                onClick={handleCopy}
                className="ml-3 flex items-center gap-1.5 text-[13px] text-[#0000FF] hover:opacity-80 transition-opacity cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? tC('copied') : tC('copy')}
              </button>
            </div>
            <a
              href={`tel:${store.phone_number}`}
              className="flex items-center justify-center gap-2 w-full h-[44px] bg-[#0000FF] text-white text-[15px] font-medium rounded-[10px] hover:bg-[#0000CC] transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t('callStore')}
            </a>
          </>
        ) : (
          <div className="text-center py-3 mb-1">
            <p className="text-[14px] text-[#9CA3AF]">{t('noPhoneAvailable')}</p>
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

// ─── Main page ───────────────────────────────────────────────────────────────

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
  const [phoneModal, setPhoneModal] = useState<StorePhoneInfo | null>(null);

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

  const stores = data?.stores ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  // Fetch sensors per visible store
  const sensorQueries = useQueries({
    queries: stores.map((store) => ({
      queryKey: ['store-sensors', store.store_id],
      queryFn: () => listStoreDevicesAction({ storeId: store.store_id, pageSize: 50 }),
      enabled: store.installed_devices_count > 0 || store.authorized_devices_count > 0,
      staleTime: 60_000,
    })),
  });

  // Map store_id → sensors
  const sensorsByStore = new Map<string, RpcAdminListStoreSensorsOutputItem[]>();
  const sensorLoadingByStore = new Map<string, boolean>();
  stores.forEach((store, i) => {
    const q = sensorQueries[i];
    if (q?.data) sensorsByStore.set(store.store_id, q.data.devices);
    sensorLoadingByStore.set(store.store_id, q?.isLoading ?? false);
  });

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
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] px-[20px] py-[25px]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F0F0]">
                  <th className="w-[50px] min-w-[50px]" />
                  <th className="text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]">
                    {t('store')}
                  </th>
                  <th className="text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]">
                    <span className="inline-flex items-center gap-1">
                      {t('devices')}
                    </span>
                  </th>
                  <th className="text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]">
                    {tCommon('zone')}
                  </th>
                  <th className="text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]">
                    {t('lastVisit')}
                  </th>
                  <th className="text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]">
                    {tCommon('actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stores.map((row, index) => (
                  <tr
                    key={row.store_id}
                    className="border-b border-[#F8F8F8] last:border-0 h-[96px] cursor-pointer hover:bg-[#FAFAFF] transition-colors duration-150 animate-in fade-in duration-300"
                    style={{ animationDelay: `${index * 35}ms`, animationFillMode: 'both' }}
                    onClick={() => router.push(`/${locale}/stores/${row.store_id}`)}
                  >
                    {/* Activity dot */}
                    <td className="px-[10px]">
                      <div className="flex items-center justify-center">
                        <StoreActivityDot status={row.status} />
                      </div>
                    </td>

                    {/* Store name + image */}
                    <td className="pr-4">
                      <div className="flex items-center gap-4">
                        <StoreImage src={row.facade_photo_url} alt={row.name} />
                        <p className="text-[20px] text-[#191919] leading-tight">{row.name}</p>
                      </div>
                    </td>

                    {/* Devices (active/inactive sensors with chip icons) */}
                    <td className="pr-4">
                      <DevicesCell
                        sensors={sensorsByStore.get(row.store_id)}
                        isLoading={sensorLoadingByStore.get(row.store_id) ?? false}
                        locale={locale}
                        installedCount={row.installed_devices_count}
                        authorizedCount={row.authorized_devices_count}
                      />
                    </td>

                    {/* Zone */}
                    <td className="pr-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] text-[#333]">{row.city_name ?? '—'}</span>
                        {row.google_maps_url && (
                          <div className="flex items-center gap-1">
                            <a
                              href={row.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] text-[#0000FF] hover:underline truncate max-w-[160px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.google_maps_url.replace(/^https?:\/\//, '').slice(0, 20)}..
                            </a>
                            <LocationFilledIcon className="w-[14px] h-[14px] text-[#0000FF] flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Last visit */}
                    <td className="pr-4">
                      <span className="text-[15px] text-[#333]">
                        {safeFormat(row.last_visit_date, 'dd/MM/yyyy')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-[20px]">
                        <Link
                          href={`/${locale}/stores/${row.store_id}`}
                          className="flex items-center justify-center h-[34px] w-[80px] text-[15px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition active:scale-[0.97] whitespace-nowrap"
                        >
                          {tCommon('expand')}
                        </Link>
                        <Link
                          href={`/${locale}/stores/${row.store_id}/edit`}
                          className="flex items-center justify-center h-[34px] w-[40px] border border-[#0000FF] rounded-[8px] text-[#0000FF] hover:bg-[#F0F0FF] transition active:scale-[0.97]"
                        >
                          <SquarePen className="w-[18px] h-[18px]" />
                        </Link>
                        <button
                          className="flex items-center justify-center h-[34px] w-[40px] bg-[#0000FF] rounded-[8px] text-white hover:bg-[#0000CC] transition active:scale-[0.97] cursor-pointer"
                          onClick={() =>
                            setPhoneModal({
                              name: row.name,
                              city_name: row.city_name,
                              phone_country_code: row.phone_country_code,
                              phone_number: row.phone_number,
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

      {phoneModal && <StorePhoneModal store={phoneModal} onClose={() => setPhoneModal(null)} />}
    </div>
  );
}
