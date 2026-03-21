# Authentication Flow

## Login Flow

```
1. /[locale]/login
2. Usuario completa email + password → react-hook-form + zod valida
3. onSubmit llama loginAction() (server action)
4. loginAction:
   - Valida con Zod
   - supabase.auth.signInWithPassword()
   - rpc_user_access_gate({ p_required_scope: 'web_panel' })
   - Verifica role IN ('owner', 'admin') y status = 'active'
5. Éxito → setUser() en Zustand → redirect /[locale]/tiendas
6. Error → muestra mensaje en página
```

## Password Reset Flow

```
1. /[locale]/restore-account
2. Usuario ingresa email → requestPasswordResetAction()
3. Supabase envía email con link a /[locale]/reset-password?code=...
4. /[locale]/reset-password
5. Usuario ingresa nueva contraseña → updatePasswordAction()
6. Éxito → redirect /[locale]/login (2s delay)
```

## Rutas

| Ruta | Descripción | Protegida |
|------|-------------|-----------|
| `/[locale]/login` | Inicio de sesión | No (redirige a tiendas si autenticado) |
| `/[locale]/restore-account` | Solicitar reset de contraseña | No |
| `/[locale]/reset-password` | Establecer nueva contraseña | No |
| `/[locale]/tiendas` | Dashboard principal | Sí |

## Seguridad

- Toda la lógica de auth en server actions (nunca en cliente)
- httpOnly cookies para tokens de sesión
- proxy.ts refresca tokens en cada request
- rpc_user_access_gate verifica rol + estado antes de permitir acceso
- Mensajes de error no revelan si el email existe (password reset)
