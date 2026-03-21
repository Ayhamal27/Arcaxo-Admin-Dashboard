import { cn } from '@/lib/utils/cn';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 7, columns = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('bg-white rounded-[15px] border border-[#E5E5EA] px-5 py-6', className)}>
      {/* Header skeleton */}
      <div className="flex gap-4 pb-4 border-b border-[#F0F0F0] mb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-[22px] bg-[#F0F0F5] rounded-[6px] animate-pulse"
            style={{ flex: i === 0 ? 2 : 1 }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 h-[96px] border-b border-[#F8F8F8] last:border-0"
          >
            {/* Thumbnail */}
            <div className="w-[71px] h-[71px] bg-[#F0F0F5] rounded-[5px] animate-pulse flex-shrink-0" />
            {/* Columns */}
            {Array.from({ length: columns - 1 }).map((_, j) => (
              <div
                key={j}
                className="h-[18px] bg-[#F0F0F5] rounded-[6px] animate-pulse"
                style={{ flex: 1, animationDelay: `${j * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
