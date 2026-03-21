'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  locale: string;
  items: BreadcrumbItem[];
}

export function Breadcrumb({ locale, items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 mb-5" aria-label="Breadcrumb">
      {/* Logo mini */}
      <Link
        href={`/${locale}/tiendas`}
        className="text-[15px] font-semibold text-[#0000FF] hover:opacity-80 transition-opacity tracking-tight"
      >
        Arcaxo
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-[#667085]" />
          {item.href ? (
            <Link
              href={item.href}
              className="text-[19px] font-semibold text-[#101820] hover:text-[#0000FF] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[19px] font-semibold text-[#101820]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
