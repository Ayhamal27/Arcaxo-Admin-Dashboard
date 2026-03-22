'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { Settings } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('nav');

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb locale={locale} items={[{ label: t('settings') }]} />
      <ComingSoon />
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white rounded-[15px] border border-[#E5E5EA]">
      <div className="flex flex-col items-center gap-5 py-16 px-8 text-center max-w-[420px]">
        {/* Icon */}
        <div className="relative">
          <div className="w-[72px] h-[72px] rounded-[18px] bg-[#F0F0FF] flex items-center justify-center">
            <Settings className="w-8 h-8 text-[#0000FF]" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 text-[18px]">🚧</span>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className="text-[20px] font-semibold text-[#191919] leading-snug">
            Sección en construcción
          </p>
          <p className="text-[14px] text-[#667085] leading-relaxed">
            Pronto estará disponible. Estamos trabajando para traerte esta sección.
          </p>
        </div>

        {/* Status pill */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9E6] border border-[#FADC45] text-[12px] font-medium text-[#8B7200]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#F59E0B]" />
          Próximamente
        </span>
      </div>
    </div>
  );
}
