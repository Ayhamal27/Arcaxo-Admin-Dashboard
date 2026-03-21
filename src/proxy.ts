import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Verificar si la ruta está protegida (requiere autenticación)
 */
const isProtectedRoute = (pathname: string): boolean => {
  const publicRoutes = ['/login', '/restore-account', '/reset-password'];
  const basePathname = pathname.replace(/^\/(es|en)/, '');
  return !publicRoutes.some((route) => basePathname.startsWith(route));
};

/**
 * Verificar autenticación desde las cookies del request
 */
const isAuthenticated = async (request: NextRequest): Promise<boolean> => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return !!session;
};

export async function proxy(request: NextRequest) {
  // Actualizar sesión (refresh de tokens si necesario)
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Extraer locale del pathname
  const localeMatch = pathname.match(/^\/(es|en)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'es';

  if (isProtectedRoute(pathname)) {
    const authenticated = await isAuthenticated(request);
    if (!authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  } else if (pathname.includes('/login')) {
    const authenticated = await isAuthenticated(request);
    if (authenticated) {
      return NextResponse.redirect(new URL(`/${locale}/tiendas`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
