'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { unlinkSensorAction } from '@/actions/sensors/unlink-sensor';
import { decommissionSensorAction } from '@/actions/sensors/decommission-sensor';
import { DecommissionReason } from '@/types/database';
import { Unlink, Trash2, X } from 'lucide-react';

interface SensorActionsClientProps {
  sensorId: string;
  currentStatus: string;
  isActive: boolean;
  locale: string;
}

export function SensorActionsClient({
  sensorId,
  currentStatus,
  isActive,
  locale,
}: SensorActionsClientProps) {
  const router = useRouter();
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [showDecommissionModal, setShowDecommissionModal] = useState(false);
  const [unlinkReason, setUnlinkReason] = useState('manual_correction');
  const [decommissionReason, setDecommissionReason] = useState<DecommissionReason>(
    DecommissionReason.DAMAGED_PERMANENT
  );
  const [decommissionNote, setDecommissionNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canUnlink = currentStatus === 'installed' && isActive;
  const canDecommission = currentStatus !== 'decommissioned';

  const handleUnlink = async () => {
    setIsLoading(true);
    try {
      const result = await unlinkSensorAction({
        sensorId,
        reason: unlinkReason,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al desvincular');
        return;
      }

      toast.success('Sensor desvinculado exitosamente');
      setShowUnlinkModal(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecommission = async () => {
    setIsLoading(true);
    try {
      const result = await decommissionSensorAction({
        sensorId,
        reason: decommissionReason,
        note: decommissionNote || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al decomisionar');
        return;
      }

      toast.success('Sensor decomisionado');
      setShowDecommissionModal(false);
      router.push(`/${locale}/devices`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        {canUnlink && (
          <button
            onClick={() => setShowUnlinkModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
          >
            <Unlink className="w-4 h-4" />
            Desvincular
          </button>
        )}

        {canDecommission && (
          <button
            onClick={() => setShowDecommissionModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[14px] font-medium text-[#FF4163] border border-[#FF4163] rounded-[8px] hover:bg-[#FFE8EC] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Decomisionar
          </button>
        )}
      </div>

      {/* Unlink Modal */}
      {showUnlinkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">Desvincular sensor</h3>
              <button onClick={() => setShowUnlinkModal(false)}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-4">
              El sensor se desvinculará de la tienda actual. Podrá ser reasignado posteriormente.
            </p>

            <div className="mb-5">
              <label className="block text-[12px] text-[#667085] mb-1.5">Motivo</label>
              <select
                value={unlinkReason}
                onChange={(e) => setUnlinkReason(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] bg-white focus:border-[#0000FF] focus:outline-none"
              >
                <option value="manual_correction">Corrección manual</option>
                <option value="transfer">Transferencia</option>
                <option value="return_from_store">Devolución de tienda</option>
                <option value="misassigned">Mal asignado</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnlinkModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={isLoading}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Procesando...' : 'Desvincular'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decommission Modal */}
      {showDecommissionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#FF4163]">Decomisionar sensor</h3>
              <button onClick={() => setShowDecommissionModal(false)}>
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <div className="p-3 bg-[#FFE8EC] rounded-[8px] mb-4">
              <p className="text-[13px] text-[#FF4163] font-medium">
                Esta acción es irreversible. El sensor quedará permanentemente fuera de servicio.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-[12px] text-[#667085] mb-1.5">Motivo</label>
              <select
                value={decommissionReason}
                onChange={(e) => setDecommissionReason(e.target.value as DecommissionReason)}
                className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] bg-white focus:border-[#FF4163] focus:outline-none"
              >
                <option value={DecommissionReason.DAMAGED_PERMANENT}>Dañado permanentemente</option>
                <option value={DecommissionReason.STOLEN}>Robado</option>
                <option value={DecommissionReason.LOST}>Perdido</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="block text-[12px] text-[#667085] mb-1.5">Nota (opcional)</label>
              <textarea
                value={decommissionNote}
                onChange={(e) => setDecommissionNote(e.target.value)}
                rows={3}
                placeholder="Describe el estado del sensor..."
                className="w-full px-3 py-2 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] resize-none focus:border-[#FF4163] focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDecommissionModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDecommission}
                disabled={isLoading}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#FF4163] rounded-[8px] hover:bg-[#E03355] disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Procesando...' : 'Decomisionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
