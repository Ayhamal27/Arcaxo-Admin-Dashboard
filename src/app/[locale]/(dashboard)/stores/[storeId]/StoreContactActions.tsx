'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Phone, Map, X, Copy } from 'lucide-react';

interface StoreContactActionsProps {
  phone: string | null;
  address: string;
  googleMapsUrl: string | null;
}

export function StoreContactActions({ phone, address, googleMapsUrl }: StoreContactActionsProps) {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const t = useTranslations('storeDetail');

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('contactCopied', { label }));
    } catch {
      toast.error(t('contactCopyError'));
    }
  };

  const handleMapsClick = () => {
    if (googleMapsUrl) {
      window.open(googleMapsUrl, '_blank', 'noopener');
    } else {
      const q = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
    }
  };

  return (
    <>
      {/* Phone button */}
      <button
        onClick={() => setShowPhoneModal(true)}
        className="flex items-center justify-center w-[40px] h-[40px] rounded-[8px] border border-[#E5E5EA] hover:bg-[#F8F8FF] hover:border-[#0000FF] transition-colors cursor-pointer bg-white"
        title={t('contactPhoneTitle')}
      >
        <Phone className="w-4 h-4 text-[#0000FF]" />
      </button>

      {/* Maps button */}
      <button
        onClick={handleMapsClick}
        className="flex items-center justify-center w-[40px] h-[40px] rounded-[8px] border border-[#E5E5EA] hover:bg-[#F0FFF5] hover:border-[#228D70] transition-colors cursor-pointer bg-white"
        title={t('contactMapsTitle')}
      >
        <Map className="w-4 h-4 text-[#228D70]" />
      </button>

      {/* Phone/Contact Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[15px] p-6 max-w-[400px] w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#191919]">{t('contactTitle')}</h3>
              <button onClick={() => setShowPhoneModal(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#667085]" />
              </button>
            </div>

            <div className="space-y-3">
              {phone && (
                <div className="flex items-center justify-between p-3 rounded-[8px] border border-[#E5E5EA]">
                  <div>
                    <p className="text-[11px] text-[#667085]">{t('contactPhone')}</p>
                    <p className="text-[14px] font-medium text-[#191919]">{phone}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(phone, t('contactPhone'))}
                    className="p-2 rounded-[6px] hover:bg-[#F0F0F5] transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-[#667085]" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-[8px] border border-[#E5E5EA]">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[11px] text-[#667085]">{t('contactAddress')}</p>
                  <p className="text-[14px] font-medium text-[#191919]">{address}</p>
                </div>
                <button
                  onClick={() => handleCopy(address, t('contactAddress'))}
                  className="p-2 rounded-[6px] hover:bg-[#F0F0F5] transition-colors cursor-pointer flex-shrink-0"
                >
                  <Copy className="w-4 h-4 text-[#667085]" />
                </button>
              </div>

              {!phone && (
                <p className="text-[13px] text-[#667085] text-center py-2">
                  {t('contactNoPhone')}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowPhoneModal(false)}
              className="w-full mt-4 h-[40px] text-[14px] font-medium text-[#667085] border border-[#D0D5DD] rounded-[8px] hover:bg-[#F9F9F9] transition-colors cursor-pointer"
            >
              {t('contactClose')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
