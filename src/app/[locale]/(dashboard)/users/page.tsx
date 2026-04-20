'use client';

import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Plus, Search, Pencil, Phone, Cpu, Store, MapPin, Copy, Check } from 'lucide-react';

import { listUsersAction } from '@/actions/users/list-users';
import { useUsersStore } from '@/lib/stores/users-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { Pagination } from '@/components/shared/Pagination';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import Link from 'next/link';
import { Users } from 'lucide-react';

interface PhoneModalUser {
  full_name: string;
  city_name?: string | null;
  phone_country_code?: string | null;
  phone_number?: string | null;
}

function PhoneModal({ user, onClose }: { user: PhoneModalUser; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const phone =
    user.phone_country_code && user.phone_number
      ? `${user.phone_country_code} ${user.phone_number}`
      : user.phone_number ?? null;

  const handleCopy = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[15px] p-6 w-full max-w-[380px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-[40px] h-[40px] rounded-full bg-[#0000FF] flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[16px] font-semibold text-[#191919]">{t('contactUser')}</p>
            {user.city_name && (
              <p className="text-[13px] text-[#667085]">{user.city_name}</p>
            )}
          </div>
        </div>

        {/* User info */}
        <div className="bg-[#F9F9FF] rounded-[10px] px-4 py-3 mb-4">
          <p className="text-[15px] font-semibold text-[#191919]">{user.full_name}</p>
          {user.city_name && (
            <p className="text-[13px] text-[#667085]">{user.city_name}</p>
          )}
        </div>

        {/* Phone number */}
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
                {copied ? tCommon('copied') : tCommon('copy')}
              </button>
            </div>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-2 w-full h-[44px] bg-[#0000FF] text-white text-[15px] font-medium rounded-[10px] hover:bg-[#0000CC] transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t('call')}
            </a>
          </>
        ) : (
          <div className="text-center py-3 mb-1">
            <p className="text-[14px] text-[#9CA3AF]">{t('phoneNotAvailable')}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-3 w-full h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[10px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
        >
          {tCommon('close')}
        </button>
      </div>
    </div>
  );
}

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
  const [phoneModal, setPhoneModal] = useState<PhoneModalUser | null>(null);

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
    <div className="flex flex-col flex-1 min-w-0">
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
          <table className="table-fixed w-full">
            <thead>
              <tr className="border-b border-[#E5E5EA]">
                <th className="text-left pl-[21px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[26%]">
                  {t('userColumn')}
                </th>
                <th className="text-left pl-[41px] pr-[10px] py-[10px] text-[18px] font-semibold text-[#161616] w-[23%]">
                  {t('role')}
                </th>
                <th
                  className="text-center px-[10px] py-[10px] w-[7%]"
                  title={t('devicesInstalled')}
                >
                  <div className="flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-[#161616]" />
                  </div>
                </th>
                <th
                  className="text-center px-[10px] py-[10px] w-[7%]"
                  title={t('storesInstalled')}
                >
                  <div className="flex items-center justify-center">
                    <Store className="w-5 h-5 text-[#161616]" />
                  </div>
                </th>
                <th
                  className="text-center px-[10px] py-[10px] w-[13%]"
                  title={tCommon('zone')}
                >
                  <div className="flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#161616]" />
                  </div>
                </th>
                <th className="text-center p-[10px] text-[18px] font-semibold text-[#161616] w-[24%]">
                  {tCommon('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  className="border-b border-[#E5E5EA] last:border-b-0 hover:bg-[#FAFAFF] transition-colors cursor-pointer"
                  onClick={() => router.push(`/${locale}/users/${user.user_id}`)}
                >
                  {/* Usuario */}
                  <td className="pl-[22px] pr-[10px] overflow-hidden">
                    <div className="flex gap-[12px] items-center">
                      <UserAvatar
                        firstName={user.first_name}
                        lastName={user.last_name}
                        role={user.role}
                      />
                      <span className="text-[18px] text-[#404D61] truncate">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="px-[15px] overflow-hidden">
                    <div className="flex justify-center">
                      <RoleBadge role={user.role} />
                    </div>
                  </td>

                  {/* Dispositivos instalados */}
                  <td className="px-[10px] py-[15px] text-center">
                    <span className="text-[18px] text-[#404D61]">
                      {user.devices_installed_count}
                    </span>
                  </td>

                  {/* Tiendas instaladas */}
                  <td className="px-[10px] py-[15px] text-center">
                    <span className="text-[18px] text-[#404D61]">
                      {user.stores_installed_count}
                    </span>
                  </td>

                  {/* Zona */}
                  <td className="px-[10px] py-[15px] text-center">
                    <span className="text-[18px] text-[#404D61] break-words">
                      {user.city_name ?? '—'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="p-[10px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-[12px] items-center justify-center">
                      <Link
                        href={`/${locale}/users/${user.user_id}`}
                        className="flex items-center justify-center h-[34px] w-[80px] border border-[#0000FF] rounded-[8px] text-[15px] font-medium text-[#0000FF] hover:bg-[#F0F0FF] transition-colors shrink-0"
                      >
                        {tCommon('expand')}
                      </Link>
                      <Link
                        href={`/${locale}/users/${user.user_id}/edit`}
                        className="flex items-center justify-center h-[34px] w-[38px] border border-[#D0D5DD] rounded-[8px] text-[#667085] hover:bg-[#F9F9F9] transition-colors shrink-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        className="flex items-center justify-center h-[34px] w-[38px] bg-[#0000FF] rounded-[8px] text-white hover:bg-[#0000CC] transition-colors shrink-0"
                        title={t('contactUser')}
                        onClick={() =>
                          setPhoneModal({
                            full_name: `${user.first_name} ${user.last_name}`,
                            city_name: user.city_name,
                            phone_country_code: user.phone_country_code,
                            phone_number: user.phone_number,
                          })
                        }
                      >
                        <Phone className="w-5 h-5" />
                      </button>
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

      {/* Phone modal */}
      {phoneModal && (
        <PhoneModal user={phoneModal} onClose={() => setPhoneModal(null)} />
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
