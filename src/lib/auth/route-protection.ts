import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

/**
 * Verificar si una ruta está protegida (requiere autenticación)
 *
 * Rutas públicas: /login, /restore-account, /reset-password
 * Todas las demás rutas requieren autenticación
 */
export const isProtectedRoute = (pathname: string): boolean => {
  const publicRoutes = ['/login', '/restore-account', '/reset-password'];
  const basePathname = pathname.replace(/^\/(es|en)/, '');
  return !publicRoutes.some((route) => basePathname.startsWith(route));
};

/**
 * Verificar autenticación desde las cookies del request
 *
 * Usado en proxy.ts para proteger rutas sin overhead adicional
 */
export const checkAuthInProxy = async (
  request: NextRequest
): Promise<boolean> => {
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
