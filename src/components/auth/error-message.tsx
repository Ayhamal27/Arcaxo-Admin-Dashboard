export interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={`w-full px-4 py-3 rounded-[10px] bg-[#FFF5F8] border-2 border-[#FF4163] mb-5 ${className ?? ''}`}
    >
      <p className="text-[14px] text-[#FF4163]">{message}</p>
    </div>
  );
}
