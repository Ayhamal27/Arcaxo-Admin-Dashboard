'use client';

import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className={cn('flex items-center justify-center gap-1 mt-6', className)}>
      {/* Previous */}
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-3 py-2 text-[17px] text-[#414141] disabled:opacity-40 hover:text-[#0000FF] transition-colors disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {/* Page numbers */}
      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-[17px] text-[#414141]">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={cn(
              'min-w-[38px] h-[38px] px-[13px] py-[11px] rounded-[8px] text-[17px] transition-colors',
              'flex items-center justify-center',
              currentPage === page
                ? 'bg-[#0000FF] text-white'
                : 'text-[#414141] hover:bg-[#F0F0FF]'
            )}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-3 py-2 text-[17px] text-[#414141] disabled:opacity-40 hover:text-[#0000FF] transition-colors disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

function getVisiblePages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const delta = 2;
  const range: (number | '...')[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push('...');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('...');
  range.push(total);

  return range;
}
