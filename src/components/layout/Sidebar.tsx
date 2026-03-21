'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  FileText,
  Map,
  Store,
  Cpu,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  locale: string;
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'reports', href: '/reports', icon: FileText },
  { key: 'aerial', href: '/aerial', icon: Map },
  { key: 'stores', href: '/stores', icon: Store },
  { key: 'devices', href: '/devices', icon: Cpu },
  { key: 'users', href: '/users', icon: Users },
];

const bottomNavItems: NavItem[] = [
  { key: 'settings', href: '/settings', icon: Settings },
];

export function Sidebar({ locale, open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const isActive = (href: string) => {
    const fullPath = `/${locale}${href}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  const labels: Record<string, string> = {
    dashboard: t('dashboard'),
    reports: t('reports'),
    aerial: t('aerial'),
    stores: t('stores'),
    devices: t('devices'),
    users: t('users'),
    settings: t('settings'),
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-[80px] bottom-0 w-[317px] bg-white border-r border-[#E2DFDF] z-40',
          'flex flex-col overflow-y-auto transition-transform duration-300',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Main nav */}
        <nav className="flex-1 pt-6 pb-4">
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                locale={locale}
                active={isActive(item.href)}
                label={labels[item.key] ?? item.key}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </nav>

        {/* Spacer + bottom nav */}
        <div className="pb-6 border-t border-[#F0F0F0] pt-4">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavItem
                key={item.key}
                item={item}
                locale={locale}
                active={isActive(item.href)}
                label={labels[item.key] ?? item.key}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

interface NavItemProps {
  item: NavItem;
  locale: string;
  active: boolean;
  label: string;
  onNavigate?: () => void;
}

function NavItem({ item, locale, active, label, onNavigate }: NavItemProps) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={`/${locale}${item.href}`}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-[41px] px-6 py-3 relative transition-colors',
          'text-[21.5px] leading-tight',
          active
            ? 'text-[#0000FF] font-semibold before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[7px] before:bg-[#0000FF] before:rounded-r-[4px]'
            : 'text-[#191919] font-normal hover:bg-[#F5F5FF]'
        )}
      >
        <Icon
          className={cn('w-6 h-6 flex-shrink-0', active ? 'text-[#0000FF]' : 'text-[#82A2C2]')}
        />
        <span>{label}</span>
      </Link>
    </li>
  );
}
