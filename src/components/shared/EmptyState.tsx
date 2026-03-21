import React from 'react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[#D0D5DD]">
          {icon}
        </div>
      )}
      <p className="text-[18px] font-semibold text-[#191919] mb-2">{title}</p>
      {description && (
        <p className="text-[14px] text-[#667085] mb-6 max-w-[320px]">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="h-[50px] px-6 bg-[#0000FF] text-white rounded-[10px] font-medium text-[16px] hover:bg-[#0000CC] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
