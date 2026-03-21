import { redirect } from 'next/navigation';
import { isAuthenticatedAction } from '@/actions/auth/session';

export const metadata = {
  title: 'Arcaxo — Acceso',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAuthenticatedAction();

  if (authenticated) {
    redirect('/tiendas');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFF]">
      {children}
    </div>
  );
}
