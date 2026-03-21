export interface LoginCardProps {
  children: React.ReactNode;
}

export function LoginCard({ children }: LoginCardProps) {
  return (
    <div className="w-full max-w-[380px] bg-white rounded-[12px] p-10 shadow-[0px_2px_8px_rgba(0,0,0,0.10)]">
      {children}
    </div>
  );
}
