import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, fullWidth, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'h-[50px] rounded-[10px] font-semibold text-[16px] transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
        disabled
          ? 'bg-[#D0D5DD] text-[#999999] cursor-not-allowed'
          : 'bg-[#0000FF] text-white hover:bg-[#0000CC] active:bg-[#000099]',
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

PrimaryButton.displayName = 'PrimaryButton';
