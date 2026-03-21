'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserAction } from '@/actions/users/create-user';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StepProgress } from '@/components/shared/StepProgress';
import { GeographySelects } from '@/components/shared/GeographySelects';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { SecondaryButton } from '@/components/auth/secondary-button';

// ─── Step 1 Schema ────────────────────────────────────────────────────────────

const Step1Schema = z.object({
  first_name: z.string().min(1, 'Nombre requerido').max(50),
  last_name: z.string().min(1, 'Apellido requerido').max(50),
  email: z.string().email('Email inválido'),
  phone_country_code: z.string().optional(),
  phone_number: z.string().optional(),
  identity_document: z.string().optional(),
  address: z.string().optional(),
});

type Step1FormData = z.infer<typeof Step1Schema>;

// ─── Step 2 Schema ────────────────────────────────────────────────────────────

const Step2Schema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer']),
});

type Step2FormData = z.infer<typeof Step2Schema>;

// ─── Shared FormField ─────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] text-[#667085] mb-1.5">
        {label} {required && <span className="text-[#FF4163]">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-[#FF4163] mt-1">{error}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface GeoData {
  countryId?: number;
  stateId?: number;
  cityId?: number;
}

export default function NuevoUsuarioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [geoData, setGeoData] = useState<GeoData>({});
  const [geoErrors, setGeoErrors] = useState<{ country?: string; state?: string; city?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 form
  const {
    register: reg1,
    handleSubmit: hs1,
    formState: { errors: err1 },
  } = useForm<Step1FormData>({ resolver: zodResolver(Step1Schema) });

  // Step 2 form
  const {
    register: reg2,
    handleSubmit: hs2,
    formState: { errors: err2 },
  } = useForm<Step2FormData>({ resolver: zodResolver(Step2Schema) });

  const handleStep1 = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2 = async (data: Step2FormData) => {
    if (!step1Data) return;

    const geoValidationErrors: typeof geoErrors = {};
    if (!geoData.cityId) geoValidationErrors.city = 'Ciudad requerida';

    if (Object.keys(geoValidationErrors).length > 0) {
      setGeoErrors(geoValidationErrors);
      return;
    }

    setGeoErrors({});
    setIsSubmitting(true);

    try {
      const result = await createUserAction({
        first_name: step1Data.first_name,
        last_name: step1Data.last_name,
        email: step1Data.email,
        phone_country_code: step1Data.phone_country_code || null,
        phone_number: step1Data.phone_number || null,
        identity_document: step1Data.identity_document || null,
        address: step1Data.address || null,
        role: data.role,
        city_id: geoData.cityId!,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al crear el usuario');
        setIsSubmitting(false);
        return;
      }

      toast.success('Usuario creado exitosamente');
      router.push(result.user_id ? `/${locale}/users/${result.user_id}` : `/${locale}/users`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Breadcrumb
        locale={locale}
        items={[
          { label: 'Usuarios', href: `/${locale}/users` },
          { label: 'Crear nuevo usuario' },
        ]}
      />

      <div className="max-w-[760px]">
        <StepProgress currentStep={currentStep} totalSteps={2} />

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-8">
            <h2 className="text-[20px] font-semibold text-[#161616] mb-6">
              Datos personales
            </h2>

            <form onSubmit={hs1(handleStep1)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left column */}
                <div className="space-y-5">
                  <FormField label="Nombre" error={err1.first_name?.message} required>
                    <FormInput
                      placeholder="Nombre"
                      error={!!err1.first_name}
                      {...reg1('first_name')}
                    />
                  </FormField>

                  <FormField label="Apellido" error={err1.last_name?.message} required>
                    <FormInput
                      placeholder="Apellido"
                      error={!!err1.last_name}
                      {...reg1('last_name')}
                    />
                  </FormField>

                  <FormField label="Correo electrónico" error={err1.email?.message} required>
                    <FormInput
                      type="email"
                      placeholder="correo@ejemplo.com"
                      error={!!err1.email}
                      {...reg1('email')}
                    />
                  </FormField>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <FormField label="Teléfono" error={err1.phone_number?.message}>
                    <div className="flex gap-2">
                      <FormInput
                        placeholder="+1"
                        className="w-[80px]"
                        {...reg1('phone_country_code')}
                      />
                      <FormInput
                        placeholder="Número"
                        className="flex-1"
                        type="tel"
                        {...reg1('phone_number')}
                      />
                    </div>
                  </FormField>

                  <FormField label="Documento de identidad" error={err1.identity_document?.message}>
                    <FormInput
                      placeholder="DNI / Pasaporte / etc."
                      {...reg1('identity_document')}
                    />
                  </FormField>

                  <FormField label="Dirección" error={err1.address?.message}>
                    <FormInput
                      placeholder="Calle, número, colonia"
                      {...reg1('address')}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <SecondaryButton
                  type="button"
                  onClick={() => router.push(`/${locale}/users`)}
                  className="px-8"
                >
                  Cancelar
                </SecondaryButton>
                <PrimaryButton type="submit" className="px-8">
                  Siguiente
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-8">
            <h2 className="text-[20px] font-semibold text-[#161616] mb-6">
              Rol y ubicación
            </h2>

            <form onSubmit={hs2(handleStep2)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left column */}
                <div className="space-y-5">
                  <FormField label="Rol" error={err2.role?.message} required>
                    <select
                      className="w-full h-[50px] px-4 rounded-[8px] border-2 border-[#D0D5DD] text-[15px] text-[#191919] bg-white focus:border-[#0000FF] focus:outline-none transition-colors"
                      {...reg2('role')}
                    >
                      <option value="">Seleccionar rol</option>
                      <option value="owner">Propietario</option>
                      <option value="admin">Administrador</option>
                      <option value="manager">Gestor</option>
                      <option value="installer">Instalador</option>
                      <option value="viewer">Observador</option>
                      <option value="store_owner">Dueño tienda</option>
                    </select>
                  </FormField>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <GeographySelects
                    countryId={geoData.countryId}
                    stateId={geoData.stateId}
                    cityId={geoData.cityId}
                    onChange={(data) =>
                      setGeoData({
                        countryId: data.countryId || undefined,
                        stateId: data.stateId || undefined,
                        cityId: data.cityId || undefined,
                      })
                    }
                    errors={geoErrors}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <SecondaryButton
                  type="button"
                  onClick={() => router.push(`/${locale}/users`)}
                  className="px-8"
                >
                  Cancelar
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-8"
                >
                  Atrás
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={isSubmitting} className="px-8">
                  {isSubmitting ? 'Creando...' : 'Crear usuario'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
