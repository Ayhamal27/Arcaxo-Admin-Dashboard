import { updateSession } from '@/lib/supabase/middleware';
import { isProtectedRoute } from '@/lib/auth/route-protection';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  // Actualizar sesión (refresh de tokens si necesario)
  const { response, authenticated } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // API routes handle auth/authorization explicitly and must return JSON errors.
  if (pathname.startsWith('/api/')) {
    return response;
  }

  // Extraer locale del pathname
  const localeMatch = pathname.match(/^\/(es|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'es';

  if (isProtectedRoute(pathname)) {
    if (!authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  } else if (pathname.includes('/login')) {
    if (authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/stores`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
