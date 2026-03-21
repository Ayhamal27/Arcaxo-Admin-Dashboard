'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toggleStoreActiveAction } from '@/actions/stores/toggle-store-active';
import { StoreToggleAction } from '@/types/database';

interface StoreDetailClientProps {
  storeId: string;
  initialActive: boolean;
  installedDevicesCount: number;
  locale: string;
}

const TOGGLE_MESSAGES: Record<StoreToggleAction, string> = {
  [StoreToggleAction.ACTIVATED_NEW]: 'Tienda activada exitosamente',
  [StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST]: 'Tienda activada — solicitud de mantenimiento creada',
  [StoreToggleAction.MAINTENANCE_ALREADY_OPEN]: 'Ya existe una solicitud de mantenimiento abierta',
  [StoreToggleAction.MAINTENANCE_REQUEST_CREATED]: 'Solicitud de mantenimiento creada',
  [StoreToggleAction.CLOSED]: 'Tienda desactivada. Las sesiones abiertas continúan.',
};

export function StoreDetailClient({
  storeId,
  initialActive,
  installedDevicesCount,
  locale,
}: StoreDetailClientProps) {
  const [active, setActive] = useState(initialActive);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    const newActive = !active;
    setIsLoading(true);

    try {
      const result = await toggleStoreActiveAction({
        storeId,
        active: newActive,
        requiredDevicesCount:
          newActive && installedDevicesCount > 0 ? installedDevicesCount : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al cambiar estado');
        return;
      }

      setActive(newActive);

      const msg = result.actionTaken
        ? TOGGLE_MESSAGES[result.actionTaken]
        : newActive
        ? 'Tienda activada'
        : 'Tienda desactivada';

      if (result.actionTaken === StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST || result.actionTaken === StoreToggleAction.MAINTENANCE_REQUEST_CREATED) {
        toast.success(msg, {
          description: result.maintenanceRequestId
            ? `Solicitud: ${result.maintenanceRequestId}`
            : undefined,
        });
      } else {
        toast.success(msg);
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-2 border-t border-[#E5E5EA]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-[#191919]">Estado de tienda</p>
          <p className="text-[12px] text-[#667085]">{active ? 'Activa' : 'Inactiva'}</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
            active ? 'bg-[#228D70]' : 'bg-[#D0D5DD]'
          }`}
          aria-label={active ? 'Desactivar tienda' : 'Activar tienda'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
