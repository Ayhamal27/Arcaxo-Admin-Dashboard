import { notFound } from 'next/navigation';
import { getUserDetailAction } from '@/actions/users/get-user';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { RoleBadge } from '@/components/shared/RoleBadge';
import { MapPin, Phone, Mail, Cpu, Store, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { UserActionsClient } from './UserActionsClient';

interface UserDetailPageProps {
  params: Promise<{ locale: string; userId: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { locale, userId } = await params;

  let user;
  try {
    user = await getUserDetailAction(userId);
  } catch {
    notFound();
  }

  if (!user) notFound();

  const initial = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase();

  const bgColors: Record<string, string> = {
    owner: '#0000FF',
    admin: '#1E40AF',
    manager: '#7C3AED',
    installer: '#0891B2',
    viewer: '#9CA3AF',
    store_owner: '#228D70',
  };
  const avatarBg = bgColors[user.role] ?? '#53009C';

  return (
    <div>
      <Breadcrumb
        locale={locale}
        items={[
          { label: 'Usuarios', href: `/${locale}/usuarios` },
          { label: `${user.first_name} ${user.last_name}` },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info card */}
        <div className="lg:col-span-2 bg-white rounded-[15px] border border-[#E5E5EA] p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div
              className="w-[80px] h-[80px] rounded-full flex items-center justify-center text-white text-[28px] font-semibold flex-shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {initial}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-[24px] font-semibold text-[#191919]">
                  {user.first_name} {user.last_name}
                </h1>
                <RoleBadge role={user.role} />
              </div>

              <div className="flex items-center gap-2 text-[14px] text-[#667085] mb-1">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>{user.auth_email ?? user.first_name}</span>
              </div>

              {user.phone_number && (
                <div className="flex items-center gap-2 text-[14px] text-[#667085] mb-1">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {user.phone_country_code} {user.phone_number}
                  </span>
                </div>
              )}

              {user.city_id && (
                <div className="flex items-center gap-2 text-[14px] text-[#667085]">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>Ciudad ID: {user.city_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional data */}
          <div className="mt-6 pt-6 border-t border-[#E5E5EA] grid grid-cols-1 md:grid-cols-2 gap-4">
            {user.identity_document && (
              <div>
                <p className="text-[12px] text-[#667085]">Documento de identidad</p>
                <p className="text-[15px] font-medium text-[#191919]">{user.identity_document}</p>
              </div>
            )}

            {user.address && (
              <div>
                <p className="text-[12px] text-[#667085]">Dirección</p>
                <p className="text-[15px] font-medium text-[#191919]">{user.address}</p>
              </div>
            )}

            <div>
              <p className="text-[12px] text-[#667085]">Estado</p>
              <p className="text-[15px] font-medium text-[#191919] capitalize">{user.status}</p>
            </div>

            <div>
              <p className="text-[12px] text-[#667085]">Alcance</p>
              <p className="text-[15px] font-medium text-[#191919]">{user.agent_scope}</p>
            </div>
          </div>
        </div>

        {/* Stats + Auth card */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-6 space-y-4">
            <h2 className="text-[18px] font-semibold text-[#161616]">Estadísticas</h2>

            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-[#82A2C2]" />
              <div>
                <p className="text-[12px] text-[#667085]">Dispositivos instalados</p>
                <p className="text-[18px] font-semibold text-[#191919]">
                  {user.devices_installed_count ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-[#82A2C2]" />
              <div>
                <p className="text-[12px] text-[#667085]">Tiendas visitadas</p>
                <p className="text-[18px] font-semibold text-[#191919]">
                  {user.stores_installed_count ?? 0}
                </p>
              </div>
            </div>

            {user.active_session_store_id && (
              <div className="mt-4 p-3 bg-[#FFF9E6] border border-[#FADC45] rounded-[8px]">
                <p className="text-[13px] font-medium text-[#8B7200]">
                  Sesión activa: {user.active_session_type ?? 'desconocida'}
                </p>
                <p className="text-[12px] text-[#8B7200]">
                  Tienda: {user.active_session_store_id}
                </p>
              </div>
            )}
          </div>

          {/* Auth info */}
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-6 space-y-3">
            <h2 className="text-[18px] font-semibold text-[#161616]">Información de acceso</h2>

            {user.auth_created_at && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Registrado</p>
                  <p className="text-[13px] text-[#191919]">
                    {format(new Date(user.auth_created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            )}

            {user.auth_last_sign_in_at && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-[#82A2C2] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-[#667085]">Último acceso</p>
                  <p className="text-[13px] text-[#191919]">
                    {format(new Date(user.auth_last_sign_in_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            )}

            {user.auth_email_confirmed_at ? (
              <p className="text-[13px] text-[#228D70] font-medium">Email verificado</p>
            ) : (
              <p className="text-[13px] text-[#FF4163]">Email no verificado</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <UserActionsClient
          userId={userId}
          userEmail={user.auth_email ?? ''}
          currentStatus={user.status}
          locale={locale}
        />
      </div>

      {/* Back link */}
      <div className="mt-4">
        <Link href={`/${locale}/usuarios`} className="text-[14px] text-[#0000FF] hover:underline">
          ← Volver a usuarios
        </Link>
      </div>
    </div>
  );
}
