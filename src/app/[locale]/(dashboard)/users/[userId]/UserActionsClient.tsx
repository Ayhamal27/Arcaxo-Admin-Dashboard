'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toggleUserStatusAction } from '@/actions/users/toggle-user-status';
import { deleteUserAction } from '@/actions/users/delete-user';
import { resetPasswordAction } from '@/actions/users/reset-password';
import { ProfileStatus } from '@/types/database';
import { UserX, Trash2, CheckCircle, X, Pencil, KeyRound, Copy, Check } from 'lucide-react';
import Link from 'next/link';

interface UserActionsClientProps {
  userId: string;
  userEmail: string;
  currentStatus: string;
  locale: string;
}

export function UserActionsClient({
  userId,
  userEmail,
  currentStatus,
  locale,
}: UserActionsClientProps) {
  const router = useRouter();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordCredentials, setPasswordCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [newStatus, setNewStatus] = useState<ProfileStatus>(ProfileStatus.INACTIVE);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'all' | null>(null);

  const copyToClipboard = async (text: string, field: 'email' | 'password' | 'all') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const result = await resetPasswordAction(userId);

      if (!result.success) {
        toast.error(result.error ?? 'Error al restablecer contraseña');
        return;
      }

      setPasswordCredentials({ email: userEmail, password: result.temp_password! });
      setShowPasswordModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    setIsLoading(true);
    try {
      const result = await toggleUserStatusAction({
        userId,
        newStatus,
        closeActiveSessions: true,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al cambiar estado');
        return;
      }

      const msg =
        newStatus === ProfileStatus.ACTIVE
          ? 'Usuario activado'
          : newStatus === ProfileStatus.SUSPENDED
          ? 'Usuario suspendido'
          : 'Usuario desactivado';

      toast.success(msg, {
        description:
          result.sessionsClosedCount
            ? `${result.sessionsClosedCount} sesión(es) cerrada(s)`
            : undefined,
      });

      setShowStatusModal(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmEmail !== userEmail) {
      toast.error('El email no coincide');
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteUserAction({ userId });

      if (!result.success) {
        toast.error(result.error ?? 'Error al eliminar usuario');
        return;
      }

      toast.success('Usuario eliminado');
      router.push(`/${locale}/users`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <Link
          href={`/${locale}/users/${userId}/edit`}
          className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </Link>

        <button
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#7C3AED] border border-[#7C3AED] rounded-[8px] hover:bg-[#F5F0FF] transition-colors"
        >
          <KeyRound className="w-4 h-4" />
          Asignar contraseña
        </button>

        {currentStatus !== 'active' && (
          <button
            onClick={() => {
              setNewStatus(ProfileStatus.ACTIVE);
              setShowStatusModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#228D70] border border-[#228D70] rounded-[8px] hover:bg-[#E6F9F1] transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Activar
          </button>
        )}

        {currentStatus === 'active' && (
          <button
            onClick={() => {
              setNewStatus(ProfileStatus.INACTIVE);
              setShowStatusModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
          >
            <UserX className="w-4 h-4" />
            Desactivar
          </button>
        )}

        {currentStatus !== 'suspended' && (
          <button
            onClick={() => {
              setNewStatus(ProfileStatus.SUSPENDED);
              setShowStatusModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#FF4163] border border-[#FF4163] rounded-[8px] hover:bg-[#FFE8EC] transition-colors"
          >
            <UserX className="w-4 h-4" />
            Suspender
          </button>
        )}

        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#FF4163] border border-[#FF4163] rounded-[8px] hover:bg-[#FFE8EC] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">
                {newStatus === ProfileStatus.ACTIVE
                  ? 'Activar usuario'
                  : newStatus === ProfileStatus.SUSPENDED
                  ? 'Suspender usuario'
                  : 'Desactivar usuario'}
              </h3>
              <button onClick={() => setShowStatusModal(false)}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-6">
              {newStatus === ProfileStatus.SUSPENDED
                ? 'El usuario no podrá iniciar sesión mientras esté suspendido. Las sesiones activas serán cerradas.'
                : newStatus === ProfileStatus.INACTIVE
                ? 'El usuario quedará inactivo. Las sesiones activas serán cerradas.'
                : 'El usuario podrá iniciar sesión nuevamente.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleStatusChange}
                disabled={isLoading}
                className={`flex-1 h-[44px] text-[14px] font-medium text-white rounded-[8px] disabled:opacity-50 transition-colors ${
                  newStatus === ProfileStatus.ACTIVE
                    ? 'bg-[#228D70] hover:bg-[#1A6B55]'
                    : 'bg-[#FF4163] hover:bg-[#E03355]'
                }`}
              >
                {isLoading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Confirm Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">Asignar nueva contraseña</h3>
              <button onClick={() => setShowPasswordModal(false)}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-6">
              Se generará una nueva contraseña aleatoria para{' '}
              <span className="font-medium text-[#191919]">{userEmail}</span>. La contraseña
              anterior dejará de funcionar.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isLoading}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#7C3AED] rounded-[8px] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Generando...' : 'Generar contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {passwordCredentials && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">
                Credenciales del usuario
              </h3>
              <button onClick={() => { setPasswordCredentials(null); setCopiedField(null); }}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <div className="p-3 bg-[#E6F9F1] rounded-[8px] mb-5">
              <p className="text-[13px] text-[#228D70] font-medium">
                Contraseña asignada exitosamente. Copia las credenciales para compartirlas con el
                usuario.
              </p>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              <div>
                <p className="text-[13px] text-[#667085] mb-1">Email</p>
                <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-[8px] px-3 py-2.5">
                  <span className="flex-1 text-[14px] font-mono text-[#191919] break-all">
                    {passwordCredentials.email}
                  </span>
                  <button
                    onClick={() => copyToClipboard(passwordCredentials.email, 'email')}
                    className="flex-shrink-0 p-1 hover:bg-[#E5E5EA] rounded transition-colors"
                  >
                    {copiedField === 'email' ? (
                      <Check className="w-4 h-4 text-[#228D70]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#667085]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[13px] text-[#667085] mb-1">Contraseña</p>
                <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-[8px] px-3 py-2.5">
                  <span className="flex-1 text-[14px] font-mono text-[#191919] break-all">
                    {passwordCredentials.password}
                  </span>
                  <button
                    onClick={() => copyToClipboard(passwordCredentials.password, 'password')}
                    className="flex-shrink-0 p-1 hover:bg-[#E5E5EA] rounded transition-colors"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-4 h-4 text-[#228D70]" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#667085]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  copyToClipboard(
                    `Email: ${passwordCredentials.email}\nContraseña: ${passwordCredentials.password}`,
                    'all'
                  )
                }
                className="flex-1 h-[44px] text-[14px] font-medium text-[#7C3AED] border border-[#7C3AED] rounded-[8px] hover:bg-[#F5F0FF] transition-colors"
              >
                {copiedField === 'all' ? 'Copiado!' : 'Copiar todo'}
              </button>
              <button
                onClick={() => { setPasswordCredentials(null); setCopiedField(null); }}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#7C3AED] rounded-[8px] hover:bg-[#6D28D9] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#FF4163]">Eliminar usuario</h3>
              <button onClick={() => setShowDeleteModal(false)}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <div className="p-3 bg-[#FFE8EC] rounded-[8px] mb-4">
              <p className="text-[13px] text-[#FF4163] font-medium">
                Esta acción es irreversible. El usuario y todos sus datos de acceso serán eliminados.
              </p>
            </div>

            <p className="text-[14px] text-[#667085] mb-3">
              Para confirmar, escribe el email del usuario:
            </p>
            <p className="text-[13px] font-mono text-[#191919] bg-[#F5F5F5] px-3 py-1.5 rounded-[6px] mb-4">
              {userEmail}
            </p>

            <input
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder="Escribe el email para confirmar"
              className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#FF4163] focus:outline-none mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmEmail('');
                }}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading || deleteConfirmEmail !== userEmail}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#FF4163] rounded-[8px] hover:bg-[#E03355] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
