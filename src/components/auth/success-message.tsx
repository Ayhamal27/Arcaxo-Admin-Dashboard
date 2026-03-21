import { CheckCircle } from 'lucide-react';

export interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  return (
    <div
      className={`w-full px-4 py-3 rounded-[10px] bg-[#F0F9F7] border-2 border-[#228D70] mb-5 flex items-center gap-3 ${className ?? ''}`}
    >
      <CheckCircle className="w-5 h-5 text-[#228D70] flex-shrink-0" />
      <p className="text-[14px] text-[#228D70]">{message}</p>
    </div>
  );
}
