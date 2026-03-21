'use client';

import { useState, use } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = use(params);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <main className="pt-[80px] lg:pl-[317px] min-h-screen flex flex-col min-w-0">
        <div className="p-6 flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
