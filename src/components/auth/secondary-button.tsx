import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, fullWidth, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'h-[50px] rounded-[10px] font-medium text-[16px] text-[#667085]',
        'border-2 border-[#D0D5DD] bg-white transition-colors duration-200',
        'hover:bg-[#F5F5F5] hover:border-[#999999]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

SecondaryButton.displayName = 'SecondaryButton';
