'use client';

import { useState } from 'react';
import { Bell, Menu, X, LogOut, User, ChevronDown, Check } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/stores/auth-store';
import { logoutAction } from '@/actions/auth/logout';
import Link from 'next/link';

interface NavbarProps {
  locale: string;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

const LOCALES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

function LocaleDropdown({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  const switchLocale = (targetLocale: string) => {
    setOpen(false);
    if (targetLocale === locale) return;

    // Persist preference so the root / loader can read it
    localStorage.setItem('locale', targetLocale);

    // Strip any existing locale prefix (handles both /es/... and /en/... cases)
    const strippedPath = pathname.replace(/^\/(es|en)(\/|$)/, '/').replace(/\/$/, '') || '/';
    const newPath = `/${targetLocale}${strippedPath}`;

    // Hard navigation so the server fully reloads next-intl messages for the new locale
    window.location.href = newPath;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-[34px] px-2.5 rounded-[8px] border border-[#E5E5EA] bg-white hover:bg-[#F5F5F5] transition-colors text-[#191919] focus:outline-none"
        aria-label="Change language"
      >
        <span className="text-[18px] leading-none">{current.flag}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#667085] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] w-[148px] bg-white rounded-[10px] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] border border-[#E5E5EA] z-50 overflow-hidden">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => switchLocale(l.code)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-[14px] text-[#191919] hover:bg-[#F5F5FF] transition-colors"
              >
                <span className="text-[18px] leading-none">{l.flag}</span>
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === locale && (
                  <Check className="w-3.5 h-3.5 text-[#0000FF]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Navbar({ locale, onMenuToggle, sidebarOpen }: NavbarProps) {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'A';

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logoutAction();
    clearUser();
    router.push(`/${locale}/login`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-[80px] bg-white border-b border-[#E2DFDF] z-50 flex items-center px-6 gap-4">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-[#333] hover:text-[#0000FF] transition-colors p-1"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <Link href={`/${locale}/stores`} className="flex items-center">
          <span className="text-[22px] font-semibold text-[#191919] tracking-tight leading-none">
            Arcaxo
          </span>
        </Link>
      </div>

      {/* Right: locale switcher + bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <LocaleDropdown locale={locale} />

        {/* Bell */}
        <button className="relative text-[#667085] hover:text-[#191919] transition-colors p-1">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0.5 right-0.5 w-[8px] h-[8px] bg-[#FF4163] rounded-full" />
        </button>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-[35px] h-[35px] rounded-full bg-[#53009C] flex items-center justify-center text-white text-[14px] font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#53009C] focus:ring-offset-2"
            aria-label="User menu"
          >
            {initial}
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-[calc(100%+8px)] w-[180px] bg-white rounded-[10px] shadow-[0px_4px_16px_rgba(0,0,0,0.12)] border border-[#E5E5EA] z-50 overflow-hidden">
                <Link
                  href={`/${locale}/perfil`}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-[14px] text-[#191919] hover:bg-[#F5F5F5] transition-colors"
                >
                  <User className="w-4 h-4 text-[#667085]" />
                  {t('profile')}
                </Link>
                <div className="border-t border-[#F0F0F0]" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-[#FF4163] hover:bg-[#FFF5F8] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {tAuth('logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
