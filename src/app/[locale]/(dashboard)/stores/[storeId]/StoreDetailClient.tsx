'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toggleStoreActiveAction } from '@/actions/stores/toggle-store-active';
import { updateStoreWifiAction } from '@/actions/stores/update-store-wifi';
import { updateStoreDevicesAction } from '@/actions/stores/update-store-devices';
import { uploadFacadePhotoAction } from '@/actions/stores/upload-facade-photo';
import { getWifiCredentialsAction } from '@/actions/stores/get-wifi-credentials';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { StoreToggleAction } from '@/types/database';
import { Wifi, Cpu, Camera, X, Upload, Pencil, Eye, EyeOff } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface StoreDetailClientProps {
  storeId: string;
  initialActive: boolean;
  installedDevicesCount: number;
  authorizedDevicesCount: number;
  wifiSsid: string | null;
  facadePhotoUrl: string | null;
  locale: string;
}

export function StoreDetailClient({
  storeId,
  installedDevicesCount,
  authorizedDevicesCount,
  wifiSsid,
  facadePhotoUrl,
}: StoreDetailClientProps) {
  const router = useRouter();
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);

  // Modal states
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showFacadeModal, setShowFacadeModal] = useState(false);

  // WiFi form
  const [wifiSsidInput, setWifiSsidInput] = useState(wifiSsid ?? '');
  const [wifiPasswordInput, setWifiPasswordInput] = useState('');
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiEditing, setWifiEditing] = useState(false);
  const [wifiFetching, setWifiFetching] = useState(false);
  const [wifiSsidDisplay, setWifiSsidDisplay] = useState<string | null>(null);
  const [wifiPasswordDisplay, setWifiPasswordDisplay] = useState<string | null>(null);
  const [wifiShowPassword, setWifiShowPassword] = useState(false);

  // Devices form
  const [devicesInput, setDevicesInput] = useState(String(authorizedDevicesCount));
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Facade form
  const [facadeFile, setFacadeFile] = useState<File | null>(null);
  const [facadePreview, setFacadePreview] = useState<string | null>(null);
  const [facadeLoading, setFacadeLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenWifiModal = async () => {
    setShowWifiModal(true);
    setWifiEditing(false);
    setWifiShowPassword(false);
    setWifiFetching(true);
    setWifiSsidDisplay(null);
    setWifiPasswordDisplay(null);

    try {
      const result = await getWifiCredentialsAction(storeId);
      if (result.success && result.ssid) {
        setWifiSsidDisplay(result.ssid);
        setWifiPasswordDisplay(result.password ?? null);
        setWifiSsidInput(result.ssid);
        setWifiPasswordInput(result.password ?? '');
        setWifiEditing(false);
      } else {
        // No credentials — go straight to edit mode
        setWifiSsidInput('');
        setWifiPasswordInput('');
        setWifiEditing(true);
      }
    } catch {
      setWifiEditing(true);
    } finally {
      setWifiFetching(false);
    }
  };

  const handleCloseWifiModal = () => {
    setShowWifiModal(false);
    setWifiEditing(false);
    setWifiShowPassword(false);
    setWifiPasswordInput('');
  };

  const handleWifiSubmit = async () => {
    if (!wifiSsidInput.trim() || !wifiPasswordInput.trim()) {
      toast.error('SSID y contraseña son requeridos');
      return;
    }
    setWifiLoading(true);
    try {
      const result = await updateStoreWifiAction(storeId, wifiSsidInput, wifiPasswordInput);
      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar WiFi');
        return;
      }
      toast.success('Credenciales WiFi actualizadas');
      setWifiSsidDisplay(wifiSsidInput);
      setWifiPasswordDisplay(wifiPasswordInput);
      setWifiEditing(false);
      setWifiShowPassword(false);
      router.refresh();
    } finally {
      setWifiLoading(false);
    }
  };

  const handleDevicesSubmit = async () => {
    const count = parseInt(devicesInput, 10);
    if (isNaN(count) || count < 0) {
      toast.error('Ingresa un número válido (0 o mayor)');
      return;
    }
    setDevicesLoading(true);
    try {
      const result = await updateStoreDevicesAction(storeId, count);
      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar dispositivos');
        return;
      }
      toast.success('Contrato de dispositivos actualizado');
      setShowDevicesModal(false);
      router.refresh();
    } finally {
      setDevicesLoading(false);
    }
  };

  // ─── Facade file handling ──────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Solo se aceptan imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('La imagen no debe superar 5 MB');
      return;
    }
    setFacadeFile(file);
    const url = URL.createObjectURL(file);
    setFacadePreview(url);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearFacadeSelection = () => {
    setFacadeFile(null);
    if (facadePreview) URL.revokeObjectURL(facadePreview);
    setFacadePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFacadeSubmit = async () => {
    if (!facadeFile) {
      toast.error('Selecciona una imagen');
      return;
    }
    setFacadeLoading(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(facadeFile);
      });

      const result = await uploadFacadePhotoAction(storeId, base64, facadeFile.name);
      if (!result.success) {
        toast.error(result.error ?? 'Error al subir imagen');
        return;
      }
      toast.success('Foto de fachada actualizada');
      clearFacadeSelection();
      setShowFacadeModal(false);
      router.refresh();
    } finally {
      setFacadeLoading(false);
    }
  };

  const handleCloseFacadeModal = () => {
    clearFacadeSelection();
    setShowFacadeModal(false);
  };

  return (
    <>
      {/* Action buttons */}
      <div className="space-y-3">
        {/* WiFi */}
        <button
          onClick={handleOpenWifiModal}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition-colors cursor-pointer text-left"
        >
          <Wifi className="w-4 h-4 text-[#0000FF] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">Credenciales WiFi</p>
            <p className="text-[12px] text-[#667085] truncate">
              {wifiSsid ? `SSID: ${wifiSsid}` : 'Sin configurar'}
            </p>
          </div>
        </button>

        {/* Devices */}
        <button
          onClick={() => setShowDevicesModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition-colors cursor-pointer text-left"
        >
          <Cpu className="w-4 h-4 text-[#7C3AED] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">Contrato de dispositivos</p>
            <p className="text-[12px] text-[#667085]">{authorizedDevicesCount} autorizados</p>
          </div>
        </button>

        {/* Facade */}
        <button
          onClick={() => setShowFacadeModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition-colors cursor-pointer text-left"
        >
          <Camera className="w-4 h-4 text-[#228D70] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">Foto de fachada</p>
            <p className="text-[12px] text-[#667085]">
              {facadePhotoUrl ? 'Configurada' : 'Sin foto'}
            </p>
          </div>
        </button>
      </div>

      {/* WiFi Modal */}
      {showWifiModal && (
        <div className={`fixed top-0 bottom-0 right-0 bg-black/40 flex items-center justify-center z-50 p-4 transition-[left] duration-300 left-0 ${
          sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[317px]'
        }`}>
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">Credenciales WiFi</h3>
              <button onClick={handleCloseWifiModal} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            {wifiFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-[14px] text-[#667085]">Cargando credenciales...</span>
              </div>
            ) : !wifiEditing && wifiSsidDisplay ? (
              /* ─── Read-only mode ─────────────────────────────────────── */
              <>
                <p className="text-[14px] text-[#667085] mb-5">
                  Credenciales configuradas para esta tienda.
                </p>

                <div className="space-y-4 mb-5">
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">Nombre de red (SSID)</p>
                    <div className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E5EA] bg-[#F9FAFB] text-[14px] text-[#191919] flex items-center">
                      {wifiSsidDisplay}
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">Contraseña</p>
                    <div className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E5EA] bg-[#F9FAFB] text-[14px] text-[#191919] flex items-center justify-between">
                      <span>
                        {wifiShowPassword
                          ? wifiPasswordDisplay
                          : '••••••••'}
                      </span>
                      <button
                        onClick={() => setWifiShowPassword(!wifiShowPassword)}
                        className="cursor-pointer p-1"
                      >
                        {wifiShowPassword ? (
                          <EyeOff className="w-4 h-4 text-[#667085]" />
                        ) : (
                          <Eye className="w-4 h-4 text-[#667085]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseWifiModal}
                    className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => setWifiEditing(true)}
                    className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </>
            ) : (
              /* ─── Edit mode ──────────────────────────────────────────── */
              <>
                <p className="text-[14px] text-[#667085] mb-5">
                  Configura las credenciales de la red WiFi de la tienda. La contraseña se almacena
                  encriptada.
                </p>

                <div className="space-y-4 mb-5">
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">Nombre de red (SSID)</p>
                    <input
                      type="text"
                      value={wifiSsidInput}
                      onChange={(e) => setWifiSsidInput(e.target.value)}
                      placeholder="Nombre de la red WiFi"
                      className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#0000FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">Contraseña</p>
                    <input
                      type="password"
                      value={wifiPasswordInput}
                      onChange={(e) => setWifiPasswordInput(e.target.value)}
                      placeholder="Contraseña de la red WiFi"
                      className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#0000FF] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={wifiSsidDisplay ? () => setWifiEditing(false) : handleCloseWifiModal}
                    className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleWifiSubmit}
                    disabled={wifiLoading}
                    className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {wifiLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Devices Modal */}
      {showDevicesModal && (
        <div className={`fixed top-0 bottom-0 right-0 bg-black/40 flex items-center justify-center z-50 p-4 transition-[left] duration-300 left-0 ${
          sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[317px]'
        }`}>
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">Contrato de dispositivos</h3>
              <button onClick={() => setShowDevicesModal(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-5">
              Modifica la cantidad de dispositivos autorizados para esta tienda. Actualmente hay{' '}
              {installedDevicesCount} dispositivo(s) instalado(s).
            </p>

            <div className="mb-5">
              <p className="text-[13px] text-[#667085] mb-1">Dispositivos autorizados</p>
              <input
                type="number"
                min="0"
                value={devicesInput}
                onChange={(e) => setDevicesInput(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#7C3AED] focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDevicesModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDevicesSubmit}
                disabled={devicesLoading}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#7C3AED] rounded-[8px] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {devicesLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facade Modal — Drag & Drop (offset left to sidebar edge on lg+) */}
      {showFacadeModal && (
        <div
          className={`fixed top-0 bottom-0 right-0 bg-black/40 flex items-center justify-center z-50 p-4 lg:p-6 transition-[left] duration-300 left-0 ${
            sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[317px]'
          }`}
        >
          <div
            className="bg-white rounded-[15px] p-6 flex flex-col w-full max-w-3xl max-h-[85vh]"
          >
            {/* Header — fixed */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-[18px] font-semibold text-[#191919]">Foto de fachada</h3>
              <button onClick={handleCloseFacadeModal} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-4 flex-shrink-0">
              Arrastra una imagen o haz clic para seleccionar desde tu equipo.
            </p>

            {/* Drop zone / Preview — scrollable area */}
            <div className="flex-1 min-h-0 mb-4">
              {facadePreview ? (
                <div className="h-full flex flex-col">
                  <div className="relative rounded-[10px] overflow-hidden border border-[#E5E5EA] flex-1 min-h-0 flex items-center justify-center bg-[#F9FAFB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={facadePreview}
                      alt="Vista previa"
                      className="max-w-full max-h-full object-contain"
                    />
                    <button
                      onClick={clearFacadeSelection}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <p className="mt-2 text-[12px] text-[#667085] truncate flex-shrink-0">
                    {facadeFile?.name} — {((facadeFile?.size ?? 0) / 1024).toFixed(0)} KB
                  </p>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`h-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-[10px] border-2 border-dashed transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-[#228D70] bg-[#F0FFF5]'
                      : 'border-[#D0D5DD] hover:border-[#228D70] hover:bg-[#FAFFFE]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#F0F0F5] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#667085]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-medium text-[#191919]">
                      {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen aquí'}
                    </p>
                    <p className="text-[12px] text-[#667085] mt-1">
                      o <span className="text-[#228D70] font-medium">haz clic para buscar</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-[#98A2B3]">JPG, PNG o WebP — máx. 5 MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Buttons — fixed at bottom */}
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={handleCloseFacadeModal}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleFacadeSubmit}
                disabled={facadeLoading || !facadeFile}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#228D70] rounded-[8px] hover:bg-[#1A6B55] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {facadeLoading ? 'Subiendo...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Toggle-only component for top-right ─────────────────────────────────── */

const TOGGLE_MESSAGES: Record<StoreToggleAction, string> = {
  [StoreToggleAction.ACTIVATED_NEW]: 'Tienda activada exitosamente',
  [StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST]:
    'Tienda activada — solicitud de mantenimiento creada',
  [StoreToggleAction.MAINTENANCE_ALREADY_OPEN]:
    'Ya existe una solicitud de mantenimiento abierta',
  [StoreToggleAction.MAINTENANCE_REQUEST_CREATED]: 'Solicitud de mantenimiento creada',
  [StoreToggleAction.CLOSED]: 'Tienda desactivada. Las sesiones abiertas continúan.',
};

export function StoreToggle({
  storeId,
  initialActive,
  installedDevicesCount,
}: {
  storeId: string;
  initialActive: boolean;
  installedDevicesCount: number;
}) {
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

      if (
        result.actionTaken === StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST ||
        result.actionTaken === StoreToggleAction.MAINTENANCE_REQUEST_CREATED
      ) {
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
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-[#667085]">{active ? 'Activa' : 'Inactiva'}</span>
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
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
  );
}
