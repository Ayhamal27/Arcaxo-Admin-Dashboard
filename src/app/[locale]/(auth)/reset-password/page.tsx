'use client';

import { useState, use } from 'react';
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
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
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
        locale,
      });

      if (!result.success) {
        setGeneralError(result.error ?? 'Error al actualizar la contraseña');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Error inesperado');
      setIsLoading(false);
    }
  };

  return (
    <LoginCard>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[25px] font-semibold text-[#191919] tracking-tight">
          {t('setNewPassword')}
        </h1>
        <p className="text-[14px] text-[#667085] mt-2">{t('enterNewPassword')}</p>
      </div>

      {generalError && <ErrorMessage message={generalError} />}
      {success && <SuccessMessage message={t('passwordUpdatedSuccessfully')} />}

      {!success && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* New Password */}
          <div>
            <label className="block text-[12px] text-[#667085] mb-1.5">
              {t('newPassword')}
            </label>
            <PasswordInput
              placeholder={t('newPassword')}
              error={!!errors.password}
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-[12px] text-[#FF4163] mt-1">{errors.password.message}</p>
            ) : (
              <p className="text-[12px] text-[#667085] mt-1">{t('passwordRequirements')}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[12px] text-[#667085] mb-1.5">
              {t('confirmPassword')}
            </label>
            <PasswordInput
              placeholder={t('confirmPassword')}
              error={!!errors.confirmPassword}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-[12px] text-[#FF4163] mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <PrimaryButton type="submit" disabled={isLoading} fullWidth>
            {isLoading ? tCommon('loading') : t('updatePassword')}
          </PrimaryButton>
        </form>
      )}
    </LoginCard>
  );
}
