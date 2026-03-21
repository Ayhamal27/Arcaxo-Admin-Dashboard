import { updateSession } from '@/lib/supabase/middleware';
import { isProtectedRoute, checkAuthInProxy } from '@/lib/auth/route-protection';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  // Actualizar sesión (refresh de tokens si necesario)
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Extraer locale del pathname
  const localeMatch = pathname.match(/^\/(es|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'es';

  if (isProtectedRoute(pathname)) {
    const authenticated = await checkAuthInProxy(request);
    if (!authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  } else if (pathname.includes('/login')) {
    const authenticated = await checkAuthInProxy(request);
    if (authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/tiendas`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
