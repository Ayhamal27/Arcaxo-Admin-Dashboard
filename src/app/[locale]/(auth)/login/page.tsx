'use client';

import { useState, use, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/actions/auth/login';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoginCard } from '@/components/auth/login-card';
import { FormInput } from '@/components/auth/form-input';
import { PasswordInput } from '@/components/auth/password-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { ErrorMessage } from '@/components/auth/error-message';
import { ProfileRole, ProfileStatus } from '@/types/database';
import Link from 'next/link';
import { ArcaxoLogo } from '@/components/shared/ArcaxoLogo';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const LoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Correo requerido')
    .email('Formato de correo inválido')
    .refine((v) => EMAIL_REGEX.test(v), 'Ingrese un correo válido (ej: usuario@dominio.com)'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

export default function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const setUser = useAuthStore((state) => state.setUser);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const result = await loginAction({ email: data.email, password: data.password, locale });

      if (!result.success) {
        setGeneralError(result.error ?? 'Error al iniciar sesión');
        setIsLoading(false);
        return;
      }

      if (result.user) {
        setUser({
          id: result.user.id,
          email: result.user.email,
          role: result.user.role as ProfileRole,
          status: ProfileStatus.ACTIVE,
        });
      }

      localStorage.setItem('locale', locale);
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = `/${locale}/stores`;
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Error inesperado');
      setIsLoading(false);
    }
  };

  return (
    <LoginCard>
      {/* Logo / Header */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <ArcaxoLogo className="h-[28px] w-auto" />
        <p className="text-[14px] text-[#667085]">{t('signInMessage')}</p>
      </div>

      <Suspense>
        <ExpiredSessionBanner />
      </Suspense>

      {generalError && <ErrorMessage message={generalError} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label className="block text-[12px] text-[#667085] mb-1.5">
            {t('email')}
          </label>
          <FormInput
            type="email"
            placeholder={t('email')}
            error={!!errors.email}
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-[12px] text-[#FF4163] mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[12px] text-[#667085] mb-1.5">
            {t('password')}
          </label>
          <PasswordInput
            placeholder={t('password')}
            error={!!errors.password}
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-[12px] text-[#FF4163] mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Forgot password */}
        <div className="text-right">
          <Link
            href={`/${locale}/restore-account`}
            className="text-[14px] text-[#0000FF] hover:text-[#0000CC] transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        <PrimaryButton type="submit" disabled={isLoading} fullWidth>
          {isLoading ? tCommon('loading') : t('signIn')}
        </PrimaryButton>
      </form>

      {/* Language switcher */}
      <LanguageSwitcher locale={locale} />
    </LoginCard>
  );
}

function ExpiredSessionBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('expired') !== 'true') return null;
  return (
    <div className="mb-4 rounded-[8px] border border-[#FF4163]/30 bg-[#FFF0F3] px-4 py-3 text-[13px] text-[#FF4163]">
      Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
    </div>
  );
}

function LanguageSwitcher({ locale }: { locale: string }) {
  return (
    <div className="flex justify-center gap-2 mt-6">
      {(['es', 'en'] as const).map((lang) => (
        <Link
          key={lang}
          href={`/${lang}/login`}
          className={`text-[12px] font-medium px-3 py-1 rounded-[6px] transition-colors ${
            locale === lang
              ? 'bg-[#0000FF] text-white'
              : 'bg-[#F0F0F5] text-[#667085] hover:bg-[#E5E5EA]'
          }`}
        >
          {lang.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
