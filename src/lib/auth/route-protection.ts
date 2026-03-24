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
