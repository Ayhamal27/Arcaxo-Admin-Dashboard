import React from 'react';
import { cn } from '@/lib/utils/cn';

interface PageActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function PageActionBar({ children, className }: PageActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 mb-6',
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Slots ───────────────────────────────────────────────────────────────────

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export function ActionButton({ icon, children, className, ...props }: ActionButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center gap-2 h-[50px] px-5 bg-[#0000FF] text-white rounded-[10px]',
        'font-medium text-[16px] transition-colors hover:bg-[#0000CC] active:bg-[#000099]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
        'disabled:bg-[#D0D5DD] disabled:text-[#999] disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export function SearchInput({ icon, className, ...props }: SearchInputProps) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-[400px]">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]">
          {icon}
        </span>
      )}
      <input
        className={cn(
          'w-full h-[50px] bg-white border border-[#D0D5DD] rounded-[10px]',
          'text-[14px] text-[#191919] placeholder-[#667085]',
          'focus:outline-none focus:border-[#0000FF] transition-colors',
          icon ? 'pl-10 pr-4' : 'px-4',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  label?: string;
}

export function FilterSelect({ icon, children, className, ...props }: FilterSelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none">
          {icon}
        </span>
      )}
      <select
        className={cn(
          'h-[50px] bg-white border border-[#BDC2C5] rounded-[10px]',
          'text-[14px] text-[#191919] appearance-none',
          'focus:outline-none focus:border-[#0000FF] transition-colors',
          icon ? 'pl-10 pr-8' : 'px-4 pr-8',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

interface ResetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export function ResetButton({ icon, className, ...props }: ResetButtonProps) {
  return (
    <button
      className={cn(
        'h-[50px] w-[64px] bg-white border border-[#BDC2C5] rounded-[10px]',
        'flex items-center justify-center text-[#667085]',
        'hover:bg-[#F5F5F5] hover:border-[#999] transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
        className
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
