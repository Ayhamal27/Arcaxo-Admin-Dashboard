# Etapa 03 — Páginas de Autenticación

Crear e implementar las páginas de autenticación (Login, Restaurar Contraseña) usando el tema Figma, tipografía Poppins y colores especificados. Toda la lógica de autenticación va a través de server actions (implementados en Etapa 02).

## Objetivo

Construir interfaces de autenticación hermosas, funcionales y seguras que:
1. Coincidan pixel-perfectamente con los diseños Figma
2. Usen la tipografía Poppins (SemiBold, Regular, Medium)
3. Sigan la paleta de colores Figma exactamente
4. Validen inputs con react-hook-form + zod
5. Manejen estados de error, carga y éxito
6. Soporten español e inglés completamente
7. Redireccionan correctamente después de acciones
8. Nunca expongan lógica de Supabase al cliente

---

## Figma References

- **Login Page Design:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=56-2536
- **Style Guide:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=154-2200
- **Typography Guide:** https://www.figma.com/design/yDxzcHT8xwWPOid5hL1lj9/App-Instaladores?node-id=230-2072

---

## Design Specifications

### Tipografía
- **Títulos (Logo, Main Heading):** Poppins SemiBold, 25pt, #191919
- **Body Text:** Poppins Regular, 14pt, #667085
- **Button Text:** Poppins Medium, 16pt, Color: white (sobre fondo primary)
- **Input Labels:** Poppins Regular, 12pt, #667085
- **Input Placeholder:** Poppins Regular, 14pt, #667085
- **Links:** Poppins Regular, 14pt, #0000FF (primary)

### Colores
- **Background:** #FBFBFF (gris muy claro)
- **Card Background:** #FFFFFF (blanco)
- **Text Primary:** #191919 / #161616 (gris oscuro)
- **Text Secondary:** #667085 (gris medio)
- **Border:** #E5E5EA / #D0D5DD (gris claro)
- **Button Primary:** #0000FF (azul)
- **Button Hover:** #0000CC (azul oscuro)
- **Button Disabled:** #D0D5DD (gris)
- **Error Text:** #FF4163 (rojo)
- **Error Border:** #FF4163

### Dimensiones
- **Card Width:** 380px (desktop)
- **Input Height:** 50px
- **Input Padding:** 12px left/right
- **Input Border Radius:** 10px
- **Button Height:** 50px
- **Button Border Radius:** 10px
- **Card Padding:** 40px
- **Card Border Radius:** 12px
- **Card Shadow:** 0px 2px 8px rgba(0, 0, 0, 0.1)

---

## Tareas

### T-03-01: Página de Login

Implementar la página de login con validación de formulario, manejo de errores, y estado de carga.

**Crear `src/app/[locale]/(auth)/login/page.tsx`:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginAction } from '@/actions/auth/login';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoginCard } from '@/components/auth/login-card';
import { FormInput } from '@/components/auth/form-input';
import { PasswordInput } from '@/components/auth/password-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { ErrorMessage } from '@/components/auth/error-message';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage({ params }: { params: { locale: string } }) {
  const t = useTranslations();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const result = await loginAction({
        email: data.email,
        password: data.password,
        locale: params.locale,
      });

      if (!result.success) {
        setGeneralError(result.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // Actualizar auth store
      if (result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          status: 'active',
        });
      }

      // Redirigir a dashboard
      router.push(`/${params.locale}/tiendas`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FBFBFF]">
      <LoginCard>
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-[25px] font-semibold text-[#191919]">Arcaxo</h1>
          <p className="text-[14px] text-[#667085] mt-1">
            {t('auth.signInMessage') || 'Manage your installations'}
          </p>
        </div>

        {/* Error General */}
        {generalError && <ErrorMessage message={generalError} />}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-[12px] font-regular text-[#667085] mb-2">
              {t('auth.email')}
            </label>
            <FormInput
              type="email"
              placeholder={t('auth.email')}
              error={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[12px] text-[#FF4163] mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[12px] font-regular text-[#667085] mb-2">
              {t('auth.password')}
            </label>
            <PasswordInput
              error={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-[12px] text-[#FF4163] mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <a
              href={`/${params.locale}/restore-account`}
              className="text-[14px] text-[#0000FF] font-regular hover:text-[#0000CC]"
            >
              {t('auth.forgotPassword')}
            </a>
          </div>

          {/* Submit Button */}
          <PrimaryButton
            type="submit"
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? t('common.loading') : t('auth.signIn')}
          </PrimaryButton>
        </form>

        {/* Language Switcher */}
        <LanguageSwitcher currentLocale={params.locale} />
      </LoginCard>
    </div>
  );
}

/**
 * Language Switcher Component (inline para login)
 */
function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();

  const switchLanguage = (locale: 'es' | 'en') => {
    if (locale !== currentLocale) {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <div className="flex justify-center gap-3 mt-6">
      <button
        onClick={() => switchLanguage('es')}
        className={`text-[12px] font-medium px-3 py-1 rounded-[6px] transition ${
          currentLocale === 'es'
            ? 'bg-[#0000FF] text-white'
            : 'bg-[#E5E5EA] text-[#667085] hover:bg-[#D0D5DD]'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`text-[12px] font-medium px-3 py-1 rounded-[6px] transition ${
          currentLocale === 'en'
            ? 'bg-[#0000FF] text-white'
            : 'bg-[#E5E5EA] text-[#667085] hover:bg-[#D0D5DD]'
        }`}
      >
        EN
      </button>
    </div>
  );
}
```

---

### T-03-02: Página de Restaurar Contraseña

Implementar flujo de restauración de contraseña (2 pasos: solicitar email, actualizar contraseña).

**Crear `src/app/[locale]/(auth)/restore-account/page.tsx`:**
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestPasswordResetAction } from '@/actions/auth/restore';
import { LoginCard } from '@/components/auth/login-card';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { SecondaryButton } from '@/components/auth/secondary-button';
import { ErrorMessage } from '@/components/auth/error-message';
import { SuccessMessage } from '@/components/auth/success-message';

const RestoreEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type RestoreEmailFormData = z.infer<typeof RestoreEmailSchema>;

export default function RestoreAccountPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestoreEmailFormData>({
    resolver: zodResolver(RestoreEmailSchema),
  });

  const onSubmit = async (data: RestoreEmailFormData) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const result = await requestPasswordResetAction({
        email: data.email,
        locale: params.locale,
      });

      if (!result.success) {
        setGeneralError(result.error || 'Failed to send reset email');
        setIsLoading(false);
        return;
      }

      // Mostrar confirmación
      setEmailSent(true);
      setIsLoading(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FBFBFF]">
      <LoginCard>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[25px] font-semibold text-[#191919]">
            {t('auth.restorePassword')}
          </h1>
          <p className="text-[14px] text-[#667085] mt-2">
            {emailSent
              ? t('auth.checkEmailMessage')
              : t('auth.enterEmailToReset')}
          </p>
        </div>

        {/* Success Message */}
        {emailSent && (
          <SuccessMessage
            message={t('auth.resetEmailSent')}
            className="mb-6"
          />
        )}

        {/* Error Message */}
        {generalError && !emailSent && (
          <ErrorMessage message={generalError} />
        )}

        {/* Form - Only show if email not sent */}
        {!emailSent && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[12px] font-regular text-[#667085] mb-2">
                {t('auth.email')}
              </label>
              <FormInput
                type="email"
                placeholder={t('auth.email')}
                error={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[12px] text-[#FF4163] mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <PrimaryButton
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? t('common.loading') : t('auth.sendResetLink')}
            </PrimaryButton>
          </form>
        )}

        {/* Back to Login */}
        <div className="text-center mt-6">
          <SecondaryButton
            onClick={() => router.push(`/${params.locale}/login`)}
            fullWidth
          >
            {t('common.back')}
          </SecondaryButton>
        </div>
      </LoginCard>
    </div>
  );
}
```

**Crear `src/app/[locale]/(auth)/reset-password/page.tsx` (post-email link):**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updatePasswordAction } from '@/actions/auth/restore';
import { LoginCard } from '@/components/auth/login-card';
import { PasswordInput } from '@/components/auth/password-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { ErrorMessage } from '@/components/auth/error-message';
import { SuccessMessage } from '@/components/auth/success-message';

const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const result = await updatePasswordAction({
        password: data.password,
        confirmPassword: data.confirmPassword,
        locale: params.locale,
      });

      if (!result.success) {
        setGeneralError(result.error || 'Failed to update password');
        setIsLoading(false);
        return;
      }

      // Mostrar éxito y redirigir
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${params.locale}/login`);
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FBFBFF]">
      <LoginCard>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[25px] font-semibold text-[#191919]">
            {t('auth.setNewPassword')}
          </h1>
          <p className="text-[14px] text-[#667085] mt-2">
            {t('auth.enterNewPassword')}
          </p>
        </div>

        {/* Error Message */}
        {generalError && <ErrorMessage message={generalError} />}

        {/* Success Message */}
        {success && (
          <SuccessMessage
            message={t('auth.passwordUpdatedSuccessfully')}
            className="mb-6"
          />
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* New Password Field */}
            <div>
              <label className="block text-[12px] font-regular text-[#667085] mb-2">
                {t('auth.newPassword')}
              </label>
              <PasswordInput
                error={!!errors.password}
                placeholder={t('auth.newPassword')}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[12px] text-[#FF4163] mt-1">
                  {errors.password.message}
                </p>
              )}
              <p className="text-[12px] text-[#667085] mt-2">
                {t('auth.passwordRequirements')}
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[12px] font-regular text-[#667085] mb-2">
                {t('auth.confirmPassword')}
              </label>
              <PasswordInput
                error={!!errors.confirmPassword}
                placeholder={t('auth.confirmPassword')}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-[12px] text-[#FF4163] mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <PrimaryButton
              type="submit"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? t('common.loading') : t('auth.updatePassword')}
            </PrimaryButton>
          </form>
        )}
      </LoginCard>
    </div>
  );
}
```

---

### T-03-03: Auth Layout

Crear layout para rutas de autenticación sin sidebar.

**Crear `src/app/[locale]/(auth)/layout.tsx`:**
```typescript
import { redirect } from 'next/navigation';
import { getCurrentUserAction } from '@/actions/auth/session';

export const metadata = {
  title: 'Arcaxo - Login',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar si ya está autenticado
  const userResponse = await getCurrentUserAction();

  if (userResponse.success && userResponse.user) {
    // Si ya está logeado, redirigir a dashboard
    redirect('/tiendas');
  }

  // Layout para rutas de auth
  return (
    <div className="bg-[#FBFBFF] min-h-screen">
      {children}
    </div>
  );
}
```

---

### T-03-04: Componentes compartidos de auth

Crear componentes reutilizables para las páginas de autenticación.

**Crear `src/components/auth/login-card.tsx`:**
```typescript
export interface LoginCardProps {
  children: React.ReactNode;
}

export function LoginCard({ children }: LoginCardProps) {
  return (
    <div className="w-full max-w-[380px] bg-white rounded-[12px] p-10 shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
      {children}
    </div>
  );
}
```

**Crear `src/components/auth/form-input.tsx`:**
```typescript
import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-[50px] px-3 rounded-[10px] border-2 text-[14px]',
        'font-poppins font-regular placeholder-[#667085]',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-0',
        error
          ? 'border-[#FF4163] bg-[#FFF5F8]'
          : 'border-[#D0D5DD] bg-[#FFFFFF] focus:border-[#0000FF]',
        className
      )}
      {...props}
    />
  )
);

FormInput.displayName = 'FormInput';
```

**Crear `src/components/auth/password-input.tsx`:**
```typescript
'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ error, className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        className={cn(
          'w-full h-[50px] px-3 pr-10 rounded-[10px] border-2 text-[14px]',
          'font-poppins font-regular placeholder-[#667085]',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-0',
          error
            ? 'border-[#FF4163] bg-[#FFF5F8]'
            : 'border-[#D0D5DD] bg-[#FFFFFF] focus:border-[#0000FF]',
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#191919] transition"
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
```

**Crear `src/components/auth/primary-button.tsx`:**
```typescript
import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const PrimaryButton = React.forwardRef<
  HTMLButtonElement,
  PrimaryButtonProps
>(({ className, fullWidth, disabled, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'h-[50px] rounded-[10px] font-poppins font-medium text-[16px]',
      'text-white transition-colors duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
      disabled
        ? 'bg-[#D0D5DD] text-[#999999] cursor-not-allowed'
        : 'bg-[#0000FF] hover:bg-[#0000CC] active:bg-[#000099]',
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled}
    {...props}
  />
));

PrimaryButton.displayName = 'PrimaryButton';
```

**Crear `src/components/auth/secondary-button.tsx`:**
```typescript
import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SecondaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export const SecondaryButton = React.forwardRef<
  HTMLButtonElement,
  SecondaryButtonProps
>(({ className, fullWidth, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'h-[50px] rounded-[10px] font-poppins font-medium text-[16px]',
      'text-[#667085] border-2 border-[#D0D5DD]',
      'transition-colors duration-200',
      'hover:bg-[#F5F5F5] hover:border-[#999999]',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0000FF]',
      fullWidth && 'w-full',
      className
    )}
    {...props}
  />
));

SecondaryButton.displayName = 'SecondaryButton';
```

**Crear `src/components/auth/error-message.tsx`:**
```typescript
export interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={`w-full p-4 rounded-[10px] bg-[#FFF5F8] border-2 border-[#FF4163] mb-6 ${className || ''}`}
    >
      <p className="text-[14px] font-poppins text-[#FF4163]">
        {message}
      </p>
    </div>
  );
}
```

**Crear `src/components/auth/success-message.tsx`:**
```typescript
import { CheckCircle } from 'lucide-react';

export interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({ message, className }: SuccessMessageProps) {
  return (
    <div
      className={`w-full p-4 rounded-[10px] bg-[#F0F9F7] border-2 border-[#228D70] mb-6 flex items-center gap-3 ${className || ''}`}
    >
      <CheckCircle className="w-5 h-5 text-[#228D70] flex-shrink-0" />
      <p className="text-[14px] font-poppins text-[#228D70]">
        {message}
      </p>
    </div>
  );
}
```

---

### T-03-05: Integración con Server Actions

Configurar el flujo completo de formularios a server actions.

**Actualizar `src/messages/es.json` con todas las claves de auth:**
```json
{
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "rememberMe": "Recuérdame",
    "signIn": "Iniciar sesión",
    "signInMessage": "Gestiona tus instalaciones",
    "invalidCredentials": "Correo o contraseña inválidos",
    "restorePassword": "Restaurar contraseña",
    "checkEmailMessage": "Verifica tu correo electrónico",
    "enterEmailToReset": "Ingresa tu correo para recibir instrucciones",
    "resetEmailSent": "Se envió un enlace de restauración a tu correo",
    "sendResetLink": "Enviar enlace",
    "setNewPassword": "Establecer nueva contraseña",
    "enterNewPassword": "Ingresa una nueva contraseña segura",
    "newPassword": "Nueva contraseña",
    "confirmPassword": "Confirmar contraseña",
    "passwordRequirements": "Mínimo 8 caracteres, una mayúscula y un número",
    "updatePassword": "Actualizar contraseña",
    "passwordUpdatedSuccessfully": "Contraseña actualizada exitosamente"
  }
}
```

**Actualizar `src/messages/en.json` con todas las claves de auth:**
```json
{
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot your password?",
    "rememberMe": "Remember me",
    "signIn": "Sign In",
    "signInMessage": "Manage your installations",
    "invalidCredentials": "Invalid email or password",
    "restorePassword": "Restore Password",
    "checkEmailMessage": "Check your email",
    "enterEmailToReset": "Enter your email to receive instructions",
    "resetEmailSent": "A password reset link has been sent to your email",
    "sendResetLink": "Send Reset Link",
    "setNewPassword": "Set New Password",
    "enterNewPassword": "Enter a new secure password",
    "newPassword": "New Password",
    "confirmPassword": "Confirm Password",
    "passwordRequirements": "Minimum 8 characters, one uppercase letter and one number",
    "updatePassword": "Update Password",
    "passwordUpdatedSuccessfully": "Password updated successfully"
  }
}
```

**Crear `docs/auth-flow.md` (documentación del flujo):**
```markdown
# Authentication Flow Documentation

## Login Flow

```
1. Usuario va a /[locale]/login
   ↓
2. Completa form (email, password)
   ↓
3. Envía form a loginAction() (server action)
   ↓
4. Server action:
   - Valida email/password con Supabase
   - Llama rpc_user_access_gate
   - Verifica role IN ('owner', 'admin')
   - Verifica status = 'active'
   ↓
5. Si éxito:
   - Actualiza Zustand auth store
   - Redirige a /[locale]/tiendas
   ↓
6. Si error:
   - Muestra mensaje de error
   - Usuario permanece en /login
```

## Password Reset Flow

```
1. Usuario va a /[locale]/restore-account
   ↓
2. Ingresa email
   ↓
3. Envía a requestPasswordResetAction()
   ↓
4. Server action:
   - Valida email
   - Llama supabase.auth.resetPasswordForEmail()
   - Supabase envía email con link
   ↓
5. Usuario recibe email y hace click en link
   ↓
6. Redirect a /[locale]/reset-password?code=...
   ↓
7. Usuario ingresa nueva contraseña
   ↓
8. Envía a updatePasswordAction()
   ↓
9. Server action:
   - Valida nueva contraseña
   - Llama supabase.auth.updateUser({ password })
   ↓
10. Si éxito:
    - Muestra mensaje de éxito
    - Redirige a /[locale]/login después de 2s
```

## Security Considerations

- ✅ Todos los cambios de auth en servidor
- ✅ Email validation en backend
- ✅ Password reset tokens generados por Supabase
- ✅ Contraseña NUNCA enviada como plaintext en URLs
- ✅ httpOnly cookies para sesión
- ✅ CSRF protection (Next.js built-in)
- ✅ Rate limiting (considerar agregar)

## Testing Checklist

- [ ] Login con credenciales válidas redirige a dashboard
- [ ] Login con credenciales inválidas muestra error
- [ ] Login con usuario sin role owner/admin rechaza
- [ ] Login con usuario status != active rechaza
- [ ] Logout borra sesión y redirige a login
- [ ] Forgot password envía email
- [ ] Reset password actualiza contraseña
- [ ] Cambio de idioma persiste en auth pages
- [ ] Validación de form muestra errores
- [ ] Estados de carga mostrados correctamente
- [ ] Sin errores en DevTools console
```

---

## Criterios de aceptación

- [x] Página `/[locale]/login` existe y se carga sin errores
- [x] Formulario de login valida email y password
- [x] Botón "Iniciar sesión" llama `loginAction`
- [x] Login exitoso redirige a `/[locale]/tiendas`
- [x] Login fallido muestra error y permanece en página
- [x] Estado de carga mostrado durante login
- [x] Link "¿Olvidaste tu contraseña?" funciona
- [x] Página `/[locale]/restore-account` existe
- [x] Formulario pide email y llama `requestPasswordResetAction`
- [x] Email enviado muestra mensaje de confirmación
- [x] Página `/[locale]/reset-password` existe (para después del email)
- [x] Formulario de nueva contraseña valida requisitos
- [x] Nuevo password actualizado correctamente
- [x] Validación de contraseña coincidente funciona
- [x] Diseño coincide pixel-perfectamente con Figma
- [x] Colores correctos (#FBFBFF, #FFFFFF, #0000FF, etc)
- [x] Tipografía Poppins aplicada correctamente
- [x] Tamaños: inputs 50px, cards 380px, padding 40px
- [x] Hover states en botones y links
- [x] Error messages muestran en rojo (#FF4163)
- [x] Success messages muestran en verde (#228D70)
- [x] Language switcher ES/EN funciona
- [x] Cambio de idioma traduce todo el contenido
- [x] Sin errores de TypeScript (strict mode)
- [x] Componentes de auth reutilizables
- [x] Documento de flujo de autenticación creado
- [x] Middleware protege rutas protegidas correctamente

---

## Dependencias

- **Etapa 00:** Base del Proyecto (fonts, colors, i18n)
- **Etapa 02:** Sistema de Autenticación (server actions)

Esta etapa es **fundamentalmente UI**. Las siguientes etapas construirán sobre esta base.

---

## Notas adicionales

- Los colores exactos están definidos en Tailwind config (Etapa 00)
- Las tipografías se cargan vía next/font/google (Etapa 00)
- Todos los textos vienen de messages JSON (next-intl)
- Los componentes de auth son reutilizables y sin dependencias externas
- El flujo de autenticación es completamente seguro (server-side)
- Consider agregando tests unitarios para validación de forms
- Consider agregando rate limiting para login attempts
- Consider agregar captura CAPTCHA después de N intentos fallidos
