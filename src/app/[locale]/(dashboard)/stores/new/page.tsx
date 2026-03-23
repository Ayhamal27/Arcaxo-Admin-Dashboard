'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, ChevronDown, Loader2 } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber as libIsValid,
  type CountryCode,
} from 'libphonenumber-js';
import { createStoreAction } from '@/actions/stores/create-store';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listCountriesAction, CountryOption } from '@/actions/geography/list-countries';
import { listStatesAction, StateOption } from '@/actions/geography/list-states';
import { listCitiesAction, CityOption } from '@/actions/geography/list-cities';
import { useTranslations } from 'next-intl';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCoordsFromGoogleMapsUrl(url: string): {
  lat: number;
  lng: number;
} | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  return null;
}

function countryCodeToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

// Build sorted list of phone countries once
const PHONE_COUNTRIES = getCountries()
  .map((cc) => ({
    iso: cc,
    dialCode: `+${getCountryCallingCode(cc)}`,
    flag: countryCodeToFlag(cc),
  }))
  .sort((a, b) => a.iso.localeCompare(b.iso));

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function makePhoneSchema() {
  return z
    .object({
      phoneCountry: z.string().optional(),
      phoneNumber: z.string().optional(),
    })
    .refine(
      (data) => {
        if (!data.phoneNumber) return true; // optional
        if (!data.phoneCountry) return false;
        return libIsValid(data.phoneNumber, data.phoneCountry as CountryCode);
      },
      { message: 'Número de teléfono inválido para el país seleccionado', path: ['phoneNumber'] }
    );
}

const Step1Schema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
    phoneCountry: z.string().optional(),
    phoneNumber: z.string().optional(),
    google_maps_url: z.string().min(5, 'Dirección requerida'),
  })
  .refine(
    (data) => {
      if (!data.phoneNumber) return true;
      if (!data.phoneCountry) return false;
      return libIsValid(data.phoneNumber, data.phoneCountry as CountryCode);
    },
    { message: 'Número de teléfono inválido para el país seleccionado', path: ['phoneNumber'] }
  );

type Step1FormData = z.infer<typeof Step1Schema>;

const Step2Schema = z
  .object({
    responsible_first_name: z.string().min(1, 'Nombre requerido'),
    responsible_last_name: z.string().min(1, 'Apellido requerido'),
    responsible_email: z
      .string()
      .min(1, 'Correo requerido')
      .email('Formato de correo inválido')
      .refine((v) => EMAIL_REGEX.test(v), 'Ingrese un correo válido (ej: usuario@dominio.com)'),
    respPhoneCountry: z.string().optional(),
    respPhoneNumber: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.respPhoneNumber) return true;
      if (!data.respPhoneCountry) return false;
      return libIsValid(data.respPhoneNumber, data.respPhoneCountry as CountryCode);
    },
    {
      message: 'Número de teléfono inválido para el país seleccionado',
      path: ['respPhoneNumber'],
    }
  );

type Step2FormData = z.infer<typeof Step2Schema>;

// ─── Figma-style UI components ──────────────────────────────────────────────

function FigmaInput({
  placeholder,
  error,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-[10px] w-full h-[52px] bg-[#F0F0F3] rounded-[8px] px-[16px] ${
        error ? 'ring-1 ring-[#FF4163]' : ''
      }`}
    >
      {icon}
      <input
        className="flex-1 bg-transparent text-[18px] text-[#1D1D1D] placeholder:text-[#838383] outline-none h-full"
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}

function FigmaSelect({
  children,
  error,
  loading,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="relative">
      <select
        className={`w-full h-[52px] bg-[#F0F0F3] rounded-[8px] px-[16px] text-[18px] appearance-none outline-none ${
          props.value ? 'text-[#1D1D1D]' : 'text-[#838383]'
        } ${error ? 'ring-1 ring-[#FF4163]' : ''}`}
        {...props}
      >
        {children}
      </select>
      {loading ? (
        <Loader2 className="absolute right-[16px] top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-[#838383]" />
      ) : (
        <ChevronDown className="absolute right-[16px] top-1/2 -translate-y-1/2 w-5 h-5 text-[#838383] pointer-events-none" />
      )}
    </div>
  );
}

function FigmaLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-[#1D1D1D] px-[4px] mb-[4px]">{children}</p>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-[#FF4163] mt-1 px-1">{message}</p>;
}

// ─── Split phone field: Country code dropdown + number input ────────────────

function PhoneField({
  countryValue,
  numberValue,
  onCountryChange,
  onNumberChange,
  error,
}: {
  countryValue: string;
  numberValue: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (num: string) => void;
  error?: boolean;
}) {
  const selected = PHONE_COUNTRIES.find((c) => c.iso === countryValue);

  return (
    <div className="flex gap-[6px]">
      {/* Country code dropdown */}
      <div
        className={`relative w-[142px] h-[52px] bg-[#F0F0F3] rounded-[8px] flex-shrink-0 ${
          error ? 'ring-1 ring-[#FF4163]' : ''
        }`}
      >
        <div className="absolute inset-0 flex items-center px-[12px] gap-[6px] pointer-events-none">
          <span className="text-[18px] leading-none">{selected?.flag ?? '🌐'}</span>
          <span className="text-[16px] text-[#1D1D1D]">{selected?.dialCode ?? ''}</span>
        </div>
        <select
          className="w-full h-full opacity-0 cursor-pointer absolute inset-0"
          value={countryValue}
          onChange={(e) => onCountryChange(e.target.value)}
        >
          <option value="">Código</option>
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dialCode} ({c.iso})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#838383] pointer-events-none" />
      </div>

      {/* Phone number input */}
      <div
        className={`flex-1 h-[52px] bg-[#F0F0F3] rounded-[8px] px-[16px] flex items-center ${
          error ? 'ring-1 ring-[#FF4163]' : ''
        }`}
      >
        <input
          type="tel"
          className="w-full bg-transparent text-[16px] text-[#1D1D1D] placeholder:text-[#838383] outline-none h-full"
          placeholder="8023456789"
          value={numberValue}
          onChange={(e) => onNumberChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Step progress (Figma style) ────────────────────────────────────────────

function FigmaStepProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const progress = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="flex flex-col items-end gap-[20px] w-full">
      <p className="text-[15px] text-[#1D1D1D]">
        Paso{' '}
        <span className="font-bold text-[#0000FF]">
          {currentStep}/{totalSteps}
        </span>
      </p>
      <div className="w-full h-[8px] bg-[#E5E5EA] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0000FF] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
  const t = useTranslations('stores');
  const tCommon = useTranslations('common');

  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [geoData, setGeoData] = useState<GeoData>({});
  const [geoErrors, setGeoErrors] = useState<{ country?: string; state?: string; city?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Geography data
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    listCountriesAction()
      .then(setCountries)
      .finally(() => setLoadingCountries(false));
  }, []);

  useEffect(() => {
    if (!geoData.countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    setLoadingStates(true);
    setStates([]);
    setCities([]);
    listStatesAction(geoData.countryId)
      .then(setStates)
      .finally(() => setLoadingStates(false));
  }, [geoData.countryId]);

  useEffect(() => {
    if (!geoData.countryId || !geoData.stateId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    setCities([]);
    listCitiesAction(geoData.countryId, geoData.stateId)
      .then(setCities)
      .finally(() => setLoadingCities(false));
  }, [geoData.countryId, geoData.stateId]);

  // Step 1 form
  const {
    register: reg1,
    handleSubmit: hs1,
    setValue: sv1,
    watch: w1,
    formState: { errors: err1 },
  } = useForm<Step1FormData>({
    resolver: zodResolver(Step1Schema),
    defaultValues: { phoneCountry: 'VE', phoneNumber: '' },
  });

  const phoneCountry1 = w1('phoneCountry');
  const phoneNumber1 = w1('phoneNumber');

  // Step 2 form
  const {
    register: reg2,
    handleSubmit: hs2,
    setValue: sv2,
    watch: w2,
    formState: { errors: err2 },
  } = useForm<Step2FormData>({
    resolver: zodResolver(Step2Schema),
    defaultValues: { respPhoneCountry: 'VE', respPhoneNumber: '' },
  });

  const respPhoneCountry = w2('respPhoneCountry');
  const respPhoneNumber = w2('respPhoneNumber');

  const handleStep1 = (data: Step1FormData) => {
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

    const coords = extractCoordsFromGoogleMapsUrl(step1Data.google_maps_url);

    // Build phone with dial code
    const storeDialCode = step1Data.phoneCountry
      ? `+${getCountryCallingCode(step1Data.phoneCountry as CountryCode)}`
      : null;
    const respDialCode = data.respPhoneCountry
      ? `+${getCountryCallingCode(data.respPhoneCountry as CountryCode)}`
      : null;

    try {
      const result = await createStoreAction({
        name: step1Data.name,
        city_id: geoData.cityId,
        address: step1Data.google_maps_url,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
        phone_country_code: step1Data.phoneNumber ? storeDialCode : null,
        phone_number: step1Data.phoneNumber || null,
        responsible_first_name: data.responsible_first_name,
        responsible_last_name: data.responsible_last_name,
        responsible_email: data.responsible_email,
        responsible_phone_country_code: data.respPhoneNumber ? respDialCode : null,
        responsible_phone_number: data.respPhoneNumber || null,
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
    <div className="flex flex-col flex-1">
      <Breadcrumb
        locale={locale}
        items={[
          { label: t('title'), href: `/${locale}/stores` },
          { label: 'Crear nueva tienda' },
        ]}
      />

      {/* Form card */}
      <div className="bg-white border border-[#DDE2E5] rounded-[20px] px-[45px] py-[30px] flex flex-col">
        <FigmaStepProgress currentStep={currentStep} totalSteps={2} />

        {/* Step 1 */}
        {currentStep === 1 && (
          <form
            onSubmit={hs1(handleStep1)}
            noValidate
            className="flex flex-col flex-1 mt-[24px]"
          >
            <h2 className="text-[20px] font-semibold text-[#1D1D1D] mb-[16px]">
              Datos generales de la tienda
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[44px] gap-y-[24px]">
              {/* Left column */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Nombre de la tienda</FigmaLabel>
                  <FigmaInput
                    placeholder="Nombre de la tienda"
                    error={!!err1.name}
                    {...reg1('name')}
                  />
                  <FieldError message={err1.name?.message} />
                </div>

                <div>
                  <FigmaLabel>Numero Telefonico</FigmaLabel>
                  <PhoneField
                    countryValue={phoneCountry1 ?? ''}
                    numberValue={phoneNumber1 ?? ''}
                    onCountryChange={(iso) => sv1('phoneCountry', iso, { shouldValidate: true })}
                    onNumberChange={(num) => sv1('phoneNumber', num, { shouldValidate: true })}
                    error={!!err1.phoneNumber}
                  />
                  <FieldError message={err1.phoneNumber?.message} />
                </div>

                <div>
                  <FigmaLabel>Direccion exacta con google maps</FigmaLabel>
                  <FigmaInput
                    placeholder="Introduce el enlace de google maps"
                    icon={<MapPin className="w-[24px] h-[24px] text-[#838383] flex-shrink-0" />}
                    error={!!err1.google_maps_url}
                    {...reg1('google_maps_url')}
                  />
                  <FieldError message={err1.google_maps_url?.message} />
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Pais</FigmaLabel>
                  <FigmaSelect
                    value={geoData.countryId ?? ''}
                    onChange={(e) =>
                      setGeoData({
                        countryId: Number(e.target.value) || undefined,
                        stateId: undefined,
                        cityId: undefined,
                      })
                    }
                    disabled={loadingCountries}
                    loading={loadingCountries}
                    error={!!geoErrors.country}
                  >
                    <option value="">Selecciona el pais</option>
                    {countries.map((c) => (
                      <option key={c.country_id} value={c.country_id}>
                        {c.country_name}
                      </option>
                    ))}
                  </FigmaSelect>
                  <FieldError message={geoErrors.country} />
                </div>

                <div>
                  <FigmaLabel>Estado</FigmaLabel>
                  <FigmaSelect
                    value={geoData.stateId ?? ''}
                    onChange={(e) =>
                      setGeoData((prev) => ({
                        ...prev,
                        stateId: Number(e.target.value) || undefined,
                        cityId: undefined,
                      }))
                    }
                    disabled={loadingStates || !geoData.countryId}
                    loading={loadingStates}
                    error={!!geoErrors.state}
                  >
                    <option value="">Selecciona el Estado</option>
                    {states.map((s) => (
                      <option key={s.state_id} value={s.state_id}>
                        {s.state_name}
                      </option>
                    ))}
                  </FigmaSelect>
                  <FieldError message={geoErrors.state} />
                </div>

                <div>
                  <FigmaLabel>Ciudad</FigmaLabel>
                  <FigmaSelect
                    value={geoData.cityId ?? ''}
                    onChange={(e) =>
                      setGeoData((prev) => ({
                        ...prev,
                        cityId: Number(e.target.value) || undefined,
                      }))
                    }
                    disabled={loadingCities || !geoData.stateId}
                    loading={loadingCities}
                    error={!!geoErrors.city}
                  >
                    <option value="">Selecciona la ciudad</option>
                    {cities.map((c) => (
                      <option key={c.city_id} value={c.city_id}>
                        {c.city_name}
                      </option>
                    ))}
                  </FigmaSelect>
                  <FieldError message={geoErrors.city} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-[25px] mt-auto pt-[24px]">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/stores`)}
                className="h-[50px] w-[205px] border border-[#0000FF] rounded-[12px] text-[20px] font-semibold text-[#0000FF] hover:bg-[#F0F0FF] transition-colors cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                className="h-[50px] w-[205px] bg-[#0000FF] rounded-[12px] text-[20px] font-semibold text-white hover:bg-[#0000CC] transition-colors cursor-pointer"
              >
                {tCommon('next')}
              </button>
            </div>
          </form>
        )}

        {/* Step 2 */}
        {currentStep === 2 && (
          <form
            onSubmit={hs2(handleStep2)}
            noValidate
            className="flex flex-col flex-1 mt-[24px]"
          >
            <h2 className="text-[20px] font-semibold text-[#1D1D1D] mb-[16px]">
              Datos generales del Responsable de la tienda
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[44px] gap-y-[24px]">
              {/* Left column */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Nombre</FigmaLabel>
                  <FigmaInput
                    placeholder="Nombre del responsable de la tienda"
                    error={!!err2.responsible_first_name}
                    {...reg2('responsible_first_name')}
                  />
                  <FieldError message={err2.responsible_first_name?.message} />
                </div>

                <div>
                  <FigmaLabel>Apellido</FigmaLabel>
                  <FigmaInput
                    placeholder="Apellido del responsable de la tienda"
                    error={!!err2.responsible_last_name}
                    {...reg2('responsible_last_name')}
                  />
                  <FieldError message={err2.responsible_last_name?.message} />
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Numero Telefonico</FigmaLabel>
                  <PhoneField
                    countryValue={respPhoneCountry ?? ''}
                    numberValue={respPhoneNumber ?? ''}
                    onCountryChange={(iso) =>
                      sv2('respPhoneCountry', iso, { shouldValidate: true })
                    }
                    onNumberChange={(num) =>
                      sv2('respPhoneNumber', num, { shouldValidate: true })
                    }
                    error={!!err2.respPhoneNumber}
                  />
                  <FieldError message={err2.respPhoneNumber?.message} />
                </div>

                <div>
                  <FigmaLabel>Correo Electronico</FigmaLabel>
                  <FigmaInput
                    type="email"
                    placeholder="Correo Electronico"
                    error={!!err2.responsible_email}
                    {...reg2('responsible_email')}
                  />
                  <FieldError message={err2.responsible_email?.message} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-[25px] mt-auto pt-[24px]">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/stores`)}
                className="h-[50px] w-[205px] border border-[#0000FF] rounded-[12px] text-[20px] font-semibold text-[#0000FF] hover:bg-[#F0F0FF] transition-colors cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[50px] w-[205px] bg-[#0000FF] rounded-[12px] text-[20px] font-semibold text-white hover:bg-[#0000CC] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? tCommon('loading') : 'Crear tienda'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
