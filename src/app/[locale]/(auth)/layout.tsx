import { redirect } from 'next/navigation';
import { isAuthenticatedAction } from '@/actions/auth/session';
import Link from 'next/link';
import { ArcaxoLogo } from '@/components/shared/ArcaxoLogo';

export const metadata = {
  title: 'Arcaxo — Acceso',
};

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const authenticated = await isAuthenticatedAction();

  if (authenticated) {
    redirect(`/${locale}/stores`);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FBFBFF]">
      {/* Logo — top-right corner */}
      <div className="absolute top-6 right-8">
        <Link href={`/${locale}/stores`} aria-label="Arcaxo">
          <ArcaxoLogo className="h-[22px] w-auto" />
        </Link>
      </div>

      {children}
    </div>
  );
}
