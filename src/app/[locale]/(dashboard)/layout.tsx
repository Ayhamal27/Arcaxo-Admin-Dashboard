'use client';

import { useState, use, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useAuthStore } from '@/lib/stores/auth-store';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = use(params);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearUser();
        window.location.href = `/${locale}/login`;
      }
    });

    // Catch UnrecognizedActionError (stale server action IDs after deployment)
    // and AUTH_EXPIRED errors that escape React Query (direct server action calls).
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      if (
        err?.name === 'UnrecognizedActionError' ||
        (err instanceof Error && err.message.includes('was not found on the server'))
      ) {
        event.preventDefault();
        window.location.reload();
      } else if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
        event.preventDefault();
        supabase.auth.signOut().then(() => {
          clearUser();
          window.location.href = `/${locale}/login?expired=true`;
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [locale, clearUser]);

  return (
    <div className="min-h-screen bg-[#FBFBFF]">
      <Navbar
        locale={locale}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <Sidebar
        locale={locale}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content area */}
      <main
        className={`pt-[80px] min-h-screen flex flex-col min-w-0 transition-[padding] duration-300 ease-out-quart ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[317px]'
        }`}
      >
        <div className="p-6 flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
