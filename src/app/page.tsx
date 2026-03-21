'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('locale');
    const locale =
      saved && SUPPORTED_LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
    router.replace(`/${locale}/stores`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFF]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-9 h-9 border-[3px] border-[#0000FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-[#667085] tracking-wide">Cargando...</p>
      </div>
    </div>
  );
}
