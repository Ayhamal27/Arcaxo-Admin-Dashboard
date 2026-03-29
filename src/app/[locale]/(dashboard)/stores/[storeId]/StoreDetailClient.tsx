'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { toggleStoreActiveAction } from '@/actions/stores/toggle-store-active';
import { updateStoreWifiAction } from '@/actions/stores/update-store-wifi';
import { updateStoreDevicesAction } from '@/actions/stores/update-store-devices';
import { uploadFacadePhotoAction } from '@/actions/stores/upload-facade-photo';
import { getWifiCredentialsAction } from '@/actions/stores/get-wifi-credentials';
import { openMaintenanceAction } from '@/actions/stores/maintenance';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { MaintenanceRequestCause, StoreToggleAction } from '@/types/database';
import { Wifi, Cpu, Camera, X, Upload, Pencil, Eye, EyeOff, Wrench } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', ''];
const LG_BREAKPOINT = 1024;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

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
  const isDesktop = useIsDesktop();
  const overlayLeft = isDesktop ? (sidebarCollapsed ? 72 : 317) : 0;
  const t = useTranslations('storeDetail');

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
      toast.error(t('wifiSsidRequired'));
      return;
    }
    setWifiLoading(true);
    try {
      const result = await updateStoreWifiAction(storeId, wifiSsidInput, wifiPasswordInput);
      if (!result.success) {
        toast.error(result.error ?? t('wifiUpdateError'));
        return;
      }
      toast.success(t('wifiUpdateSuccess'));
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
      toast.error(t('devicesInvalidNumber'));
      return;
    }
    setDevicesLoading(true);
    try {
      const result = await updateStoreDevicesAction(storeId, count);
      if (!result.success) {
        toast.error(result.error ?? t('devicesUpdateError'));
        return;
      }
      toast.success(t('devicesUpdateSuccess'));
      setShowDevicesModal(false);
      router.refresh();
    } finally {
      setDevicesLoading(false);
    }
  };

  // ─── Facade file handling ──────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const heicByExt = ['heic', 'heif'].includes(ext);
    if (!ACCEPTED_TYPES.includes(file.type) && !heicByExt) {
      toast.error(t('facadeOnlyImages'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('facadeMaxSizeError'));
      return;
    }
    setFacadeFile(file);
    const url = URL.createObjectURL(file);
    setFacadePreview(url);
  }, [t]);

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
      toast.error(t('facadeSelectImage'));
      return;
    }
    setFacadeLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', facadeFile);
      formData.append('storeId', storeId);
      formData.append('fileName', facadeFile.name);

      const result = await uploadFacadePhotoAction(formData);
      if (!result.success) {
        toast.error(result.error ?? t('facadeUploadError'));
        return;
      }
      toast.success(t('facadeUploadSuccess'));
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
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition active:scale-[0.98] cursor-pointer text-left"
        >
          <Wifi className="w-4 h-4 text-[#0000FF] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">{t('wifiCredentials')}</p>
            <p className="text-[12px] text-[#667085] truncate">
              {wifiSsid ? t('wifiSsidLabel', { ssid: wifiSsid }) : t('wifiNotConfigured')}
            </p>
          </div>
        </button>

        {/* Devices */}
        <button
          onClick={() => setShowDevicesModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition active:scale-[0.98] cursor-pointer text-left"
        >
          <Cpu className="w-4 h-4 text-[#7C3AED] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">{t('deviceContract')}</p>
            <p className="text-[12px] text-[#667085]">{t('devicesAuthorized', { count: authorizedDevicesCount })}</p>
          </div>
        </button>

        {/* Facade */}
        <button
          onClick={() => setShowFacadeModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] transition active:scale-[0.98] cursor-pointer text-left"
        >
          <Camera className="w-4 h-4 text-[#228D70] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#191919]">{t('facadePhoto')}</p>
            <p className="text-[12px] text-[#667085]">
              {facadePhotoUrl ? t('facadeConfigured') : t('facadeNotConfigured')}
            </p>
          </div>
        </button>
      </div>

      {/* WiFi Modal */}
      {showWifiModal && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-150"
          style={{ left: overlayLeft, padding: 16 }}
        >
          <div className="bg-white rounded-[15px] p-6 w-full animate-in fade-in zoom-in-95 duration-200 ease-out" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">{t('wifiModalTitle')}</h3>
              <button onClick={handleCloseWifiModal} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            {wifiFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#0000FF] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-[14px] text-[#667085]">{t('wifiLoading')}</span>
              </div>
            ) : !wifiEditing && wifiSsidDisplay ? (
              /* ─── Read-only mode ─────────────────────────────────────── */
              <>
                <p className="text-[14px] text-[#667085] mb-5">
                  {t('wifiConfigured')}
                </p>

                <div className="space-y-4 mb-5">
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">{t('wifiNetworkName')}</p>
                    <div className="w-full h-[44px] px-3 rounded-[8px] border border-[#E5E5EA] bg-[#F9FAFB] text-[14px] text-[#191919] flex items-center">
                      {wifiSsidDisplay}
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">{t('wifiPassword')}</p>
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
                    {t('wifiClose')}
                  </button>
                  <button
                    onClick={() => setWifiEditing(true)}
                    className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Pencil className="w-4 h-4" />
                    {t('wifiEdit')}
                  </button>
                </div>
              </>
            ) : (
              /* ─── Edit mode ──────────────────────────────────────────── */
              <>
                <p className="text-[14px] text-[#667085] mb-5">
                  {t('wifiEditDescription')}
                </p>

                <div className="space-y-4 mb-5">
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">{t('wifiNetworkName')}</p>
                    <input
                      type="text"
                      value={wifiSsidInput}
                      onChange={(e) => setWifiSsidInput(e.target.value)}
                      placeholder={t('wifiNetworkPlaceholder')}
                      className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#0000FF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#667085] mb-1">{t('wifiPassword')}</p>
                    <input
                      type="password"
                      value={wifiPasswordInput}
                      onChange={(e) => setWifiPasswordInput(e.target.value)}
                      placeholder={t('wifiPasswordPlaceholder')}
                      className="w-full h-[44px] px-3 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#0000FF] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={wifiSsidDisplay ? () => setWifiEditing(false) : handleCloseWifiModal}
                    className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
                  >
                    {t('wifiCancel')}
                  </button>
                  <button
                    onClick={handleWifiSubmit}
                    disabled={wifiLoading}
                    className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {wifiLoading ? t('wifiSaving') : t('wifiSave')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Devices Modal */}
      {showDevicesModal && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-150"
          style={{ left: overlayLeft, padding: 16 }}
        >
          <div className="bg-white rounded-[15px] p-6 w-full animate-in fade-in zoom-in-95 duration-200 ease-out" style={{ maxWidth: 440 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">{t('devicesModalTitle')}</h3>
              <button onClick={() => setShowDevicesModal(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-5">
              {t('devicesModalDescription', { count: installedDevicesCount })}
            </p>

            <div className="mb-5">
              <p className="text-[13px] text-[#667085] mb-1">{t('devicesAuthorizedLabel')}</p>
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
                {t('devicesCancel')}
              </button>
              <button
                onClick={handleDevicesSubmit}
                disabled={devicesLoading}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#7C3AED] rounded-[8px] hover:bg-[#6D28D9] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {devicesLoading ? t('devicesSaving') : t('devicesSave')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Facade Modal — Drag & Drop (portal to body, inline styles for Safari compat) */}
      {showFacadeModal && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-150"
          style={{ left: overlayLeft, padding: 24 }}
        >
          <div
            className="bg-white rounded-[15px] p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200 ease-out"
            style={{ maxWidth: 768, width: '100%', height: '85vh', maxHeight: 700 }}
          >
            {/* Header — fixed */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-[18px] font-semibold text-[#191919]">{t('facadeModalTitle')}</h3>
              <button onClick={handleCloseFacadeModal} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <p className="text-[14px] text-[#667085] mb-4 flex-shrink-0">
              {t('facadeModalDescription')}
            </p>

            {/* Drop zone / Preview — scrollable area */}
            <div className="flex-1 min-h-0 mb-4">
              {facadePreview ? (
                <div className="h-full flex flex-col">
                  <div className="relative rounded-[10px] overflow-hidden border border-[#E5E5EA] flex-1 min-h-0 flex items-center justify-center bg-[#F9FAFB]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={facadePreview}
                      alt={t('facadePreviewAlt')}
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
                      {isDragging ? t('facadeDragHere') : t('facadeDragOrClick')}
                    </p>
                    <p className="text-[12px] text-[#667085] mt-1">
                      {t('facadeOr')} <span className="text-[#228D70] font-medium">{t('facadeClickToSearch')}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-[#98A2B3]">{t('facadeMaxSize')}</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Buttons — fixed at bottom */}
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={handleCloseFacadeModal}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
              >
                {t('facadeCancel')}
              </button>
              <button
                onClick={handleFacadeSubmit}
                disabled={facadeLoading || !facadeFile}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#228D70] rounded-[8px] hover:bg-[#1A6B55] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {facadeLoading ? t('facadeUploading') : t('facadeSave')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/* ─── Toggle-only component for top-right ─────────────────────────────────── */

export function StoreToggle({
  storeId,
  initialActive,
  installedDevicesCount,
  hasOpenSession,
  openSessionType,
}: {
  storeId: string;
  initialActive: boolean;
  installedDevicesCount: number;
  hasOpenSession: boolean;
  openSessionType: string | null;
}) {
  const [active, setActive] = useState(initialActive);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [understoodCheckbox, setUnderstoodCheckbox] = useState(false);
  const router = useRouter();
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const t = useTranslations('storeDetail');

  const hasDevices = installedDevicesCount > 0;
  const blockingSessionType =
    openSessionType === 'install'
      ? t('sessionInstall')
      : openSessionType === 'maintenance'
      ? t('sessionMaintenance')
      : t('sessionActive');
  const blockedByOpenSessionMessage = hasOpenSession
    ? t('toggleBlockedSession', { type: blockingSessionType })
    : null;

  const TOGGLE_MESSAGES: Record<StoreToggleAction, string> = {
    [StoreToggleAction.ACTIVATED_NEW]: t('toggleActivated'),
    [StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST]: t('toggleActivatedMaintenance'),
    [StoreToggleAction.MAINTENANCE_ALREADY_OPEN]: t('toggleMaintenanceOpen'),
    [StoreToggleAction.MAINTENANCE_REQUEST_CREATED]: t('toggleMaintenanceCreated'),
    [StoreToggleAction.CLOSED]: t('toggleClosed'),
  };

  const executeToggle = async (newActive: boolean) => {
    setIsLoading(true);
    try {
      const result = await toggleStoreActiveAction({
        storeId,
        active: newActive,
        requiredDevicesCount:
          newActive && installedDevicesCount > 0 ? installedDevicesCount : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? t('toggleError'));
        return;
      }

      // After maintenance request created/exists, set device contract to 0
      console.log('[StoreToggle] actionTaken:', result.actionTaken);
      if (
        result.actionTaken === StoreToggleAction.MAINTENANCE_REQUEST_CREATED ||
        result.actionTaken === StoreToggleAction.MAINTENANCE_ALREADY_OPEN
      ) {
        console.log('[StoreToggle] Setting devices to 0...');
        const devResult = await updateStoreDevicesAction(storeId, 0);
        console.log('[StoreToggle] updateStoreDevices result:', devResult);
      }

      setActive(newActive);

      const msg = result.actionTaken
        ? TOGGLE_MESSAGES[result.actionTaken]
        : newActive
        ? t('toggleStoreActivated')
        : t('toggleStoreDeactivated');

      if (
        result.actionTaken === StoreToggleAction.ACTIVATED_WITH_MAINTENANCE_REQUEST ||
        result.actionTaken === StoreToggleAction.MAINTENANCE_REQUEST_CREATED
      ) {
        toast.success(msg, {
          description: result.maintenanceRequestId
            ? t('toggleRequest', { id: result.maintenanceRequestId })
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

  const handleToggle = () => {
    if (hasOpenSession) {
      toast.error(blockedByOpenSessionMessage ?? t('toggleOpenSessionError'));
      return;
    }

    if (active) {
      setUnderstoodCheckbox(false);
      setShowDeactivateModal(true);
      return;
    }
    executeToggle(true);
  };

  const handleConfirmDeactivate = async () => {
    setShowDeactivateModal(false);
    await executeToggle(false);
  };

  const canConfirm = !hasDevices || understoodCheckbox;

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-[#667085]">{active ? t('active') : t('inactive')}</span>
        <button
          onClick={handleToggle}
          disabled={isLoading || hasOpenSession}
          title={blockedByOpenSessionMessage ?? undefined}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
            active ? 'bg-[#228D70]' : 'bg-[#D0D5DD]'
          }`}
          aria-label={active ? t('toggleDeactivateLabel') : t('toggleActivateLabel')}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {showDeactivateModal && (
        <div
          className={`fixed top-0 bottom-0 right-0 bg-black/40 flex items-center justify-center z-50 p-4 transition-[left] duration-300 left-0 animate-in fade-in duration-150 ${
            sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[317px]'
          }`}
        >
          <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full animate-in fade-in zoom-in-95 duration-200 ease-out">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">
                {hasDevices ? t('toggleStartClose') : t('toggleDeactivate')}
              </h3>
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="cursor-pointer"
              >
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            {hasDevices ? (
              <>
                <p
                  className="text-[14px] text-[#667085] mb-5"
                  dangerouslySetInnerHTML={{
                    __html: t.raw('toggleDevicesWarning').replace('{count}', String(installedDevicesCount)),
                  }}
                />

                <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={understoodCheckbox}
                    onChange={(e) => setUnderstoodCheckbox(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#DC2626]"
                  />
                  <span className="text-[13px] text-[#667085]">
                    {t('toggleUnderstoodCheckbox')}
                  </span>
                </label>
              </>
            ) : (
              <p className="text-[14px] text-[#667085] mb-5">
                {t('toggleNoDevicesWarning')}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmDeactivate}
                disabled={isLoading || !canConfirm}
                className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isLoading ? t('toggleProcessing') : hasDevices ? t('toggleStartCloseBtn') : t('toggleDeactivateBtn')}
              </button>
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] transition-colors cursor-pointer"
              >
                {t('toggleCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Maintenance button + modal for header ─────────────────────────────── */

export function MaintenanceButton({
  storeId,
  storeStatus,
}: {
  storeId: string;
  storeStatus: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const isDesktop = useIsDesktop();
  const overlayLeft = isDesktop ? (sidebarCollapsed ? 72 : 317) : 0;
  const t = useTranslations('storeDetail');

  // Only show for operational stores
  if (storeStatus !== 'operational') return null;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error(t('maintenanceReasonRequired'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await openMaintenanceAction({
        storeId,
        cause: MaintenanceRequestCause.ADMIN_MANUAL,
        reason: reason.trim(),
      });

      if (!result.success) {
        toast.error(result.error ?? t('maintenanceError'));
        return;
      }

      toast.success(t('maintenanceSuccess'), {
        description: result.maintenanceRequestId
          ? t('toggleRequest', { id: result.maintenanceRequestId })
          : undefined,
      });
      setShowModal(false);
      setReason('');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-1.5 text-[14px] font-medium text-[#D97706] border border-[#D97706] rounded-[8px] hover:bg-[#FFFBEB] transition active:scale-[0.97] cursor-pointer"
      >
        <Wrench className="w-4 h-4" />
        {t('maintenance')}
      </button>

      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in duration-150"
            style={{ left: overlayLeft, padding: 16 }}
          >
            <div className="bg-white rounded-[15px] p-6 w-full animate-in fade-in zoom-in-95 duration-200 ease-out" style={{ maxWidth: 440 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-semibold text-[#191919]">
                  {t('maintenanceModalTitle')}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setReason('');
                  }}
                  className="cursor-pointer"
                >
                  <X className="w-5 h-5 text-[#667085]" />
                </button>
              </div>

              <p className="text-[14px] text-[#667085] mb-5">
                {t('maintenanceModalDescription')}
              </p>

              <div className="mb-5">
                <p className="text-[13px] text-[#667085] mb-1">{t('maintenanceReason')}</p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('maintenanceReasonPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-[8px] border border-[#D0D5DD] text-[14px] text-[#191919] focus:border-[#D97706] focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setReason('');
                  }}
                  className="flex-1 h-[44px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
                >
                  {t('maintenanceCancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !reason.trim()}
                  className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isLoading ? t('maintenanceCreating') : t('maintenanceCreate')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
