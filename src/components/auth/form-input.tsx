import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-[50px] px-3 rounded-[10px] border-2 text-[14px] text-[#191919]',
        'placeholder-[#667085] transition-colors duration-200',
        'focus:outline-none focus:ring-0',
        error
          ? 'border-[#FF4163] bg-[#FFF5F8]'
          : 'border-[#D0D5DD] bg-white focus:border-[#0000FF]',
        className
      )}
      {...props}
    />
  )
);

FormInput.displayName = 'FormInput';
