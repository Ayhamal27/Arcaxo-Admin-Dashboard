'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStoreAction } from '@/actions/stores/create-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { StepProgress } from '@/components/shared/StepProgress';
import { GeographySelects } from '@/components/shared/GeographySelects';
import { FormInput } from '@/components/auth/form-input';
import { PrimaryButton } from '@/components/auth/primary-button';
import { SecondaryButton } from '@/components/auth/secondary-button';

// ─── Step 1 Schema ────────────────────────────────────────────────────────────

const Step1Schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  phone_country_code: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().min(5, 'Dirección requerida'),
  latitude: z
    .string()
    .min(1, 'Latitud requerida')
    .refine((v) => !isNaN(parseFloat(v)), 'Latitud inválida'),
  longitude: z
    .string()
    .min(1, 'Longitud requerida')
    .refine((v) => !isNaN(parseFloat(v)), 'Longitud inválida'),
});

type Step1FormData = z.infer<typeof Step1Schema>;

// ─── Step 2 Schema ────────────────────────────────────────────────────────────

const Step2Schema = z.object({
  responsible_first_name: z.string().min(1, 'Nombre requerido'),
  responsible_last_name: z.string().min(1, 'Apellido requerido'),
  responsible_email: z.string().email('Email inválido'),
  responsible_phone_country_code: z.string().optional(),
  responsible_phone_number: z.string().optional(),
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

export default function NuevaTiendaPage({
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
    // Validate geography
    const newGeoErrors: typeof geoErrors = {};
    if (!geoData.countryId) newGeoErrors.country = 'País requerido';
    if (!geoData.stateId) newGeoErrors.state = 'Estado requerido';
    if (!geoData.cityId) newGeoErrors.city = 'Ciudad requerida';

    if (Object.keys(newGeoErrors).length > 0) {
      setGeoErrors(newGeoErrors);
      return;
    }

    setGeoErrors({});
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2 = async (data: Step2FormData) => {
    if (!step1Data || !geoData.cityId) return;

    setIsSubmitting(true);
    try {
      const result = await createStoreAction({
        name: step1Data.name,
        city_id: geoData.cityId,
        address: step1Data.address,
        latitude: parseFloat(step1Data.latitude),
        longitude: parseFloat(step1Data.longitude),
        phone_country_code: step1Data.phone_country_code || null,
        phone_number: step1Data.phone_number || null,
        responsible_first_name: data.responsible_first_name,
        responsible_last_name: data.responsible_last_name,
        responsible_email: data.responsible_email,
        responsible_phone_country_code: data.responsible_phone_country_code || null,
        responsible_phone_number: data.responsible_phone_number || null,
        authorized_devices_count: 0,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al crear la tienda');
        setIsSubmitting(false);
        return;
      }

      toast.success('Tienda creada exitosamente');
      router.push(
        result.store_id ? `/${locale}/stores/${result.store_id}` : `/${locale}/stores`
      );
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
          { label: 'Tiendas', href: `/${locale}/stores` },
          { label: 'Crear nueva tienda' },
        ]}
      />

      <div className="max-w-[760px]">
        <StepProgress currentStep={currentStep} totalSteps={2} />

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="bg-white rounded-[15px] border border-[#E5E5EA] p-8">
            <h2 className="text-[20px] font-semibold text-[#161616] mb-6">
              Datos generales de la tienda
            </h2>

            <form onSubmit={hs1(handleStep1)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left column */}
                <div className="space-y-5">
                  <FormField label="Nombre de la tienda" error={err1.name?.message} required>
                    <FormInput
                      placeholder="Ej: Tienda Centro"
                      error={!!err1.name}
                      {...reg1('name')}
                    />
                  </FormField>

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

                  <FormField label="Latitud" error={err1.latitude?.message} required>
                    <FormInput
                      placeholder="Ej: 19.4326"
                      error={!!err1.latitude}
                      {...reg1('latitude')}
                    />
                  </FormField>

                  <FormField label="Longitud" error={err1.longitude?.message} required>
                    <FormInput
                      placeholder="Ej: -99.1332"
                      error={!!err1.longitude}
                      {...reg1('longitude')}
                    />
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

                  <FormField label="Dirección exacta" error={err1.address?.message} required>
                    <FormInput
                      placeholder="Calle, número, colonia"
                      error={!!err1.address}
                      {...reg1('address')}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <SecondaryButton
                  type="button"
                  onClick={() => router.push(`/${locale}/stores`)}
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
              Datos del responsable de la tienda
            </h2>

            <form onSubmit={hs2(handleStep2)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left column */}
                <div className="space-y-5">
                  <FormField label="Nombre" error={err2.responsible_first_name?.message} required>
                    <FormInput
                      placeholder="Nombre"
                      error={!!err2.responsible_first_name}
                      {...reg2('responsible_first_name')}
                    />
                  </FormField>

                  <FormField label="Apellido" error={err2.responsible_last_name?.message} required>
                    <FormInput
                      placeholder="Apellido"
                      error={!!err2.responsible_last_name}
                      {...reg2('responsible_last_name')}
                    />
                  </FormField>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  <FormField label="Teléfono" error={err2.responsible_phone_number?.message}>
                    <div className="flex gap-2">
                      <FormInput
                        placeholder="+1"
                        className="w-[80px]"
                        {...reg2('responsible_phone_country_code')}
                      />
                      <FormInput
                        placeholder="Número"
                        className="flex-1"
                        type="tel"
                        {...reg2('responsible_phone_number')}
                      />
                    </div>
                  </FormField>

                  <FormField label="Correo electrónico" error={err2.responsible_email?.message} required>
                    <FormInput
                      type="email"
                      placeholder="correo@ejemplo.com"
                      error={!!err2.responsible_email}
                      {...reg2('responsible_email')}
                    />
                  </FormField>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <SecondaryButton
                  type="button"
                  onClick={() => router.push(`/${locale}/stores`)}
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
                  {isSubmitting ? 'Creando...' : 'Crear tienda'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
