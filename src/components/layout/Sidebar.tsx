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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useSidebarStore } from '@/lib/stores/sidebar-store';

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
  const { collapsed, toggleCollapsed } = useSidebarStore();

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
          className="arcaxo-overlay-enter fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-[80px] bottom-0 bg-white border-r border-[#E2DFDF] z-40',
          'flex flex-col overflow-y-auto transition-[transform,width] duration-300 ease-out-quart',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-[72px]' : 'w-[317px]'
        )}
      >
        {/* Main nav */}
        <nav className="flex-1 pt-6 pb-4">
          <ul className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                locale={locale}
                active={isActive(item.href)}
                label={labels[item.key] ?? item.key}
                collapsed={collapsed}
                onNavigate={onClose}
              />
            ))}
          </ul>
        </nav>

        {/* Bottom nav + collapse toggle */}
        <div className="pb-6 border-t border-[#F0F0F0] pt-4">
          <ul className="space-y-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                locale={locale}
                active={isActive(item.href)}
                label={labels[item.key] ?? item.key}
                collapsed={collapsed}
                onNavigate={onClose}
              />
            ))}
          </ul>

          {/* Collapse / Expand toggle */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'arcaxo-pressable flex items-center w-full py-2.5 relative mt-1',
              'text-[15px] leading-tight text-[#191919] font-normal hover:bg-[#F5F5FF]',
              collapsed ? 'justify-center px-0' : 'gap-[25px] px-6'
            )}
            title={collapsed ? t('showPanel') : t('hidePanel')}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-5 h-5 flex-shrink-0 text-[#82A2C2]" />
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5 flex-shrink-0 text-[#82A2C2]" />
                <span>{t('hidePanel')}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

interface NavLinkProps {
  item: NavItem;
  locale: string;
  active: boolean;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavLink({ item, locale, active, label, collapsed, onNavigate }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={`/${locale}${item.href}`}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center py-2.5 relative transition-colors',
          'text-[15px] leading-tight',
          collapsed ? 'justify-center px-0' : 'gap-[25px] px-6',
          active
            ? 'text-[#0000FF] font-semibold before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[7px] before:bg-[#0000FF] before:rounded-r-[4px]'
            : 'text-[#191919] font-normal hover:bg-[#F5F5FF]'
        )}
      >
        <Icon
          className={cn('w-5 h-5 flex-shrink-0', active ? 'text-[#0000FF]' : 'text-[#82A2C2]')}
        />
        {!collapsed && <span>{label}</span>}
      </Link>
    </li>
  );
}
