'use client';

import { useState, use } from 'react';
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

const RestoreSchema = z.object({
  email: z.string().email('Correo inválido'),
});

type RestoreFormData = z.infer<typeof RestoreSchema>;

export default function RestoreAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [emailSent, setEmailSent] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestoreFormData>({
    resolver: zodResolver(RestoreSchema),
  });

  const onSubmit = async (data: RestoreFormData) => {
    setIsLoading(true);
    setGeneralError(null);

    try {
      const result = await requestPasswordResetAction({ email: data.email, locale });

      if (!result.success) {
        setGeneralError(result.error ?? 'Error al enviar el enlace');
        setIsLoading(false);
        return;
      }

      setEmailSent(true);
      setIsLoading(false);
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
          {t('restorePassword')}
        </h1>
        <p className="text-[14px] text-[#667085] mt-2">
          {emailSent ? t('checkEmailMessage') : t('enterEmailToReset')}
        </p>
      </div>

      {emailSent && <SuccessMessage message={t('resetEmailSent')} />}
      {generalError && !emailSent && <ErrorMessage message={generalError} />}

      {!emailSent && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

          <PrimaryButton type="submit" disabled={isLoading} fullWidth>
            {isLoading ? tCommon('loading') : t('sendResetLink')}
          </PrimaryButton>
        </form>
      )}

      <div className="mt-5">
        <SecondaryButton
          type="button"
          onClick={() => router.push(`/${locale}/login`)}
          fullWidth
        >
          {tCommon('back')}
        </SecondaryButton>
      </div>
    </LoginCard>
  );
}
