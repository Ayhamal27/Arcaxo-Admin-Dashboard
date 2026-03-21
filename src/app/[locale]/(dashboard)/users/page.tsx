'use client';

import { use, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Search, Pencil, Phone } from 'lucide-react';

import { listUsersAction } from '@/actions/users/list-users';
import { useUsersStore } from '@/lib/stores/users-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
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

  const { filters, pagination, setFilters, setPage } = useUsersStore();

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

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pagination.pageSize);

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb locale={locale} items={[{ label: t('title') }]} />

      {/* Action bar: Nueva Usuario + Search */}
      <div className="flex gap-[18px] items-center mb-[44px]">
        <button
          onClick={() => router.push(`/${locale}/users/new`)}
          className="flex gap-[15px] items-center justify-center h-[50px] w-[205px] bg-[#000AFF] border border-[#0000FF] rounded-[10px] text-white text-[16px] font-medium shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-[#0000CC] transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('newUserBtn')}
        </button>

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
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] p-12 text-center flex items-center justify-center">
          <p className="text-[16px] text-[#FF4163]">{t('errorLoading')}</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex-1 bg-white rounded-[15px] border border-[#E5E5EA] flex items-center justify-center">
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title={t('noUsers')}
            description={t('noUsersDesc')}
            actionLabel={t('newUserBtn')}
            onAction={() => router.push(`/${locale}/users/new`)}
          />
        </div>
      ) : (
        <div className="bg-white rounded-[15px] border border-[#E5E5EA] px-[20px] py-[25px]">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pl-[21px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[260px]">
                  {t('userColumn')}
                </th>
                <th className="text-left pl-[41px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[219px]">
                  {t('role')}
                </th>
                <th className="text-center px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[141px]">
                  {t('devicesInstalled')}
                </th>
                <th className="text-left px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[141px]">
                  {t('storesInstalled')}
                </th>
                <th className="text-left pl-[15px] pr-[10px] py-[10px] text-[18px] font-bold text-[#161616] w-[161px]">
                  {t('phone')}
                </th>
                <th className="text-left px-[15px] py-[10px] text-[18px] font-semibold text-[#161616] w-[197px]">
                  {tCommon('zone')}
                </th>
                <th className="text-center p-[10px] text-[18px] font-semibold text-[#161616] w-[198px]">
                  {tCommon('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  className="h-[74px] hover:bg-[#FAFAFF] transition-colors"
                >
                  {/* Usuario */}
                  <td className="pl-[22px] pr-[30px]">
                    <div className="flex gap-[20px] items-center">
                      <UserAvatar
                        firstName={user.first_name}
                        lastName={user.last_name}
                        role={user.role}
                      />
                      <span className="text-[18px] text-[#404D61] whitespace-nowrap">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="px-[15px]">
                    <div className="flex justify-center">
                      <RoleBadge role={user.role} />
                    </div>
                  </td>

                  {/* Dispositivos instalados */}
                  <td className="p-[15px]">
                    <span className="text-[18px] text-[#404D61]">
                      {user.devices_installed_count}
                    </span>
                  </td>

                  {/* Tiendas instaladas */}
                  <td className="p-[15px]">
                    <span className="text-[18px] text-[#404D61]">
                      {user.stores_installed_count}
                    </span>
                  </td>

                  {/* Telefono */}
                  <td className="p-[15px]">
                    <span className="text-[18px] text-[#404D61] whitespace-nowrap">
                      {user.phone_country_code && user.phone_number
                        ? `${user.phone_country_code} ${user.phone_number}`
                        : '—'}
                    </span>
                  </td>

                  {/* Zona */}
                  <td className="p-[15px]">
                    <span className="text-[18px] text-[#404D61]">
                      {user.city_name ?? '—'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="p-[10px]">
                    <div className="flex gap-[20px] items-center justify-center">
                      <Link
                        href={`/${locale}/users/${user.user_id}`}
                        className="flex items-center justify-center h-[34px] w-[80px] border border-[#0000FF] rounded-[8px] text-[15px] font-medium text-[#0000FF] hover:bg-[#F0F0FF] transition-colors"
                      >
                        {tCommon('expand')}
                      </Link>
                      <Link
                        href={`/${locale}/users/${user.user_id}`}
                        className="flex items-center justify-center h-[34px] w-[40px] border border-[#D0D5DD] rounded-[8px] text-[#667085] hover:bg-[#F9F9F9] transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <a
                        href={
                          user.phone_number
                            ? `tel:${user.phone_country_code ?? ''}${user.phone_number}`
                            : undefined
                        }
                        className="flex items-center justify-center h-[34px] w-[40px] bg-[#0000FF] rounded-[8px] text-white hover:bg-[#0000CC] transition-colors"
                        onClick={(e) => !user.phone_number && e.preventDefault()}
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination inside the card */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
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
  const initial = ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase();
  const bgColors: Record<string, string> = {
    owner: '#53009C',
    admin: '#11978c',
    manager: '#bb069d',
    installer: '#0000FF',
    viewer: '#c86f0a',
    store_owner: '#228D70',
  };
  const bg = bgColors[role] ?? '#53009C';

  return (
    <div
      className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[12px] font-semibold flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}
