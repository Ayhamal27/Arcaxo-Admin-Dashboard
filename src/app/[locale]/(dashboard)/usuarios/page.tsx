'use client';

import { use, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Search, RotateCcw } from 'lucide-react';

import { listUsersAction } from '@/actions/users/list-users';
import { useUsersStore } from '@/lib/stores/users-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  PageActionBar,
  ActionButton,
  SearchInput,
  FilterSelect,
  ResetButton,
} from '@/components/layout/PageActionBar';
import { DataTable, ColumnDef } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { RpcAdminListUsersOutputItem } from '@/types/rpc-outputs';
import Link from 'next/link';
import { Users } from 'lucide-react';

export default function UsuariosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [, startTransition] = useTransition();

  const { filters, pagination, setFilters, resetFilters, setPage } = useUsersStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', filters, pagination.currentPage, pagination.pageSize],
    queryFn: () =>
      listUsersAction({
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
        search: filters.search,
        filterRole: filters.filterRole,
        filterStatus: filters.filterStatus,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
  });

  const columns: ColumnDef<RpcAdminListUsersOutputItem>[] = [
    {
      key: 'user',
      header: t('name'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar firstName={row.first_name} lastName={row.last_name} role={row.role} />
          <div>
            <p className="text-[18px] font-semibold text-[#191919] leading-tight">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-[13px] text-[#667085]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('role'),
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: 'devices',
      header: 'Dispositivos',
      render: (row) => (
        <span className="text-[15px] text-[#333]">{row.devices_installed_count}</span>
      ),
    },
    {
      key: 'stores',
      header: 'Tiendas',
      render: (row) => (
        <span className="text-[15px] text-[#333]">{row.stores_installed_count}</span>
      ),
    },
    {
      key: 'zone',
      header: 'Zona',
      render: (row) => (
        <span className="text-[15px] text-[#667085]">{row.city_name ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: tCommon('actions'),
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/${locale}/usuarios/${row.user_id}`}
            className="px-4 py-2 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors whitespace-nowrap"
          >
            Ampliar
          </Link>
        </div>
      ),
    },
  ];

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  return (
    <div>
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      <PageActionBar>
        <ActionButton
          icon={<Plus className="w-5 h-5" />}
          onClick={() => router.push(`/${locale}/usuarios/nuevo`)}
        >
          {t('newUser')}
        </ActionButton>

        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={(e) =>
            startTransition(() => setFilters({ search: e.target.value || undefined }))
          }
          icon={<Search className="w-4 h-4" />}
        />

        <FilterSelect
          value={filters.filterRole ?? ''}
          onChange={(e) => setFilters({ filterRole: e.target.value || undefined })}
        >
          <option value="">Todos los roles</option>
          <option value="owner">Propietario</option>
          <option value="admin">Administrador</option>
          <option value="manager">Gestor</option>
          <option value="installer">Instalador</option>
          <option value="viewer">Observador</option>
          <option value="store_owner">Dueño tienda</option>
        </FilterSelect>

        <FilterSelect
          value={filters.filterStatus ?? ''}
          onChange={(e) => setFilters({ filterStatus: e.target.value || undefined })}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="suspended">Suspendido</option>
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
            data={users}
            columns={columns}
            isEmpty={users.length === 0}
            emptyContent={
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="No hay usuarios registrados"
                description="Crea el primer usuario para comenzar"
                actionLabel={t('newUser')}
                onAction={() => router.push(`/${locale}/usuarios/nuevo`)}
              />
            }
            onRowClick={(row) => router.push(`/${locale}/usuarios/${row.user_id}`)}
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

function UserAvatar({
  firstName,
  lastName,
  role,
}: {
  firstName: string;
  lastName: string;
  role: string;
}) {
  const initial = (firstName?.[0] ?? '') + (lastName?.[0] ?? '');
  const bgColors: Record<string, string> = {
    owner: '#0000FF',
    admin: '#1E40AF',
    manager: '#7C3AED',
    installer: '#0891B2',
    viewer: '#9CA3AF',
    store_owner: '#228D70',
  };
  const bg = bgColors[role] ?? '#53009C';

  return (
    <div
      className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white text-[14px] font-semibold flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initial.toUpperCase()}
    </div>
  );
}
