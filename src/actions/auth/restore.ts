'use server';

import { createServerAuthClient } from '@/lib/supabase/server';
import { z } from 'zod';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const RequestResetSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .refine((v) => EMAIL_REGEX.test(v), 'Enter a valid email (e.g. user@domain.com)'),
  locale: z.enum(['es', 'en']).default('es'),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  locale: z.enum(['es', 'en']).default('es'),
});

export interface RestoreResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function requestPasswordResetAction(formData: unknown): Promise<RestoreResponse> {
  try {
    const { email, locale } = RequestResetSchema.parse(formData);
    const supabase = await createServerAuthClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password`,
    });

    if (error) {
      console.error('[Password Reset Error]', error);
    }

    // Always return success — don't reveal if email exists
    return {
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent',
    };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.issues[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred';

    console.error('[Request Password Reset Error]', error);
    return { success: false, error: errorMessage };
  }
}

export async function updatePasswordAction(formData: unknown): Promise<RestoreResponse> {
  try {
    const { password, confirmPassword } = ResetPasswordSchema.parse(formData);

    if (password !== confirmPassword) {
      return { success: false, error: 'Passwords do not match' };
    }

    const supabase = await createServerAuthClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        success: false,
        error: 'Reset session expired. Please request a new password reset link.',
      };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, error: error.message || 'Failed to update password' };
    }

    return { success: true, message: 'Password updated successfully. You can now log in.' };
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? error.issues[0]?.message || 'Validation error'
        : error instanceof Error
          ? error.message
          : 'An error occurred';

    console.error('[Update Password Error]', error);
    return { success: false, error: errorMessage };
  }
}
