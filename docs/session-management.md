# Session Management

## Flujo de Tokens

```
[Login]
  ↓
[Supabase Auth retorna JWT + Refresh Token]
  ↓
[@supabase/ssr almacena en httpOnly cookies]
  ↓
[proxy.ts refresca token antes de expirar]
  ↓
[Componentes usan useAuth() para estado]
```

## httpOnly Cookies (Seguridad)

Los tokens de sesión se almacenan en httpOnly cookies:

✅ **SEGURO:**
- No accesible desde JavaScript (previene XSS)
- Automáticamente incluido en requests
- Supabase maneja refresh automáticamente
- Almacenado encriptado en el navegador

❌ **INSEGURO (estos NO se hacen):**
- localStorage: vulnerable a XSS
- sessionStorage: vulnerable a XSS
- Variables en memoria: se pierden al refresh
- Exponer en URL parameters

## Token Refresh

`proxy.ts` llama `updateSession(request)` en cada request, lo que:

1. Lee el token actual de las cookies
2. Verifica si está cerca de expirar
3. Si expira en < 60 segundos: solicita refresh token
4. Si refresh token también expiró: sesión termina, redirect a login
5. Actualiza cookies con nuevo token

## Logout

Al hacer logout:
```typescript
await supabase.auth.signOut();
// Esto:
// 1. Invalida el refresh token en Supabase
// 2. Limpia las cookies httpOnly
```

## Validación de Sesión

En server actions o server components:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  redirect('/login');
}
```

## Timeline de Expiración

- **Access Token:** Expira en ~1 hora (configurable en Supabase)
- **Refresh Token:** Expira en ~7 días (configurable)
- **proxy.ts Check:** Cada request (refresca si necesario)
- **Inactividad:** Sesión activa mientras haya actividad

## Seguridad

- El `SUPABASE_SERVICE_ROLE_KEY` NUNCA se envía al cliente
- Solo se usa en server actions y API routes
- El cliente solo recibe `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Todos los datos se acceden vía RPCs (controlados en backend)
- Next.js 16 usa `proxy.ts` en lugar de `middleware.ts` (mismo modelo de seguridad)
