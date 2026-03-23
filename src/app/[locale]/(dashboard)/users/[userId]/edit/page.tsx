'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Loader2 } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber as libIsValid,
  type CountryCode,
} from 'libphonenumber-js';
import { getUserDetailAction } from '@/actions/users/get-user';
import { updateUserAction } from '@/actions/users/update-user';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listCountriesAction, CountryOption } from '@/actions/geography/list-countries';
import { listStatesAction, StateOption } from '@/actions/geography/list-states';
import { listCitiesAction, CityOption } from '@/actions/geography/list-cities';
import { useTranslations } from 'next-intl';
import { RpcAdminGetUserDetailOutput } from '@/types/rpc-outputs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countryCodeToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
}

const PHONE_COUNTRIES = getCountries()
  .map((cc) => ({
    iso: cc,
    dialCode: `+${getCountryCallingCode(cc)}`,
    flag: countryCodeToFlag(cc),
  }))
  .sort((a, b) => a.iso.localeCompare(b.iso));

function dialCodeToIso(dialCode?: string | null): string {
  if (!dialCode) return '';
  const match = PHONE_COUNTRIES.find((c) => c.dialCode === dialCode);
  return match?.iso ?? '';
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const Step1Schema = z
  .object({
    first_name: z.string().min(1, 'Nombre requerido').max(50),
    last_name: z.string().min(1, 'Apellido requerido').max(50),
    identity_document: z.string().optional(),
    phoneCountry: z.string().optional(),
    phoneNumber: z.string().optional(),
    email: z
      .string()
      .min(1, 'Correo requerido')
      .email('Formato de correo inválido')
      .refine((v) => EMAIL_REGEX.test(v), 'Ingrese un correo válido (ej: usuario@dominio.com)'),
    address: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.phoneNumber) return true;
      if (!data.phoneCountry) return false;
      return libIsValid(data.phoneNumber, data.phoneCountry as CountryCode);
    },
    { message: 'Número inválido para el país seleccionado', path: ['phoneNumber'] }
  );

type Step1FormData = z.infer<typeof Step1Schema>;

const Step2Schema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'viewer', 'store_owner', 'installer'], {
    error: 'Rol requerido',
  }),
});

type Step2FormData = z.infer<typeof Step2Schema>;

// ─── Figma-style UI components ──────────────────────────────────────────────

function FigmaInput({
  placeholder,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <div
      className={`flex items-center w-full h-[52px] bg-[#F0F0F3] rounded-[8px] px-[16px] ${
        error ? 'ring-1 ring-[#FF4163]' : ''
      }`}
    >
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

// ─── Split phone field ───────────────────────────────────────────────────────

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

// ─── Figma step progress ─────────────────────────────────────────────────────

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

export default function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = use(params);
  const router = useRouter();
  const t = useTranslations('users');
  const tCommon = useTranslations('common');

  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [geoData, setGeoData] = useState<GeoData>({});
  const [geoErrors, setGeoErrors] = useState<{ country?: string; state?: string; city?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<RpcAdminGetUserDetailOutput | null>(null);

  // Geography data
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [geoInitialized, setGeoInitialized] = useState(false);

  // Step 1 form
  const {
    register: reg1,
    handleSubmit: hs1,
    setValue: sv1,
    watch: w1,
    reset: reset1,
    formState: { errors: err1 },
  } = useForm<Step1FormData>({
    resolver: zodResolver(Step1Schema),
    defaultValues: { phoneCountry: '', phoneNumber: '' },
  });

  const phoneCountry = w1('phoneCountry');
  const phoneNumber = w1('phoneNumber');

  // Step 2 form
  const {
    register: reg2,
    handleSubmit: hs2,
    reset: reset2,
    formState: { errors: err2 },
  } = useForm<Step2FormData>({ resolver: zodResolver(Step2Schema) });

  // ─── Load user data + countries ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getUserDetailAction(userId), listCountriesAction()])
      .then(([userData, countriesData]) => {
        setUser(userData);
        setCountries(countriesData);

        // Pre-fill step 1
        const phoneIso = dialCodeToIso(userData.phone_country_code);
        reset1({
          first_name: userData.first_name,
          last_name: userData.last_name,
          identity_document: userData.identity_document ?? '',
          phoneCountry: phoneIso,
          phoneNumber: userData.phone_number ?? '',
          email: userData.email,
          address: userData.address ?? '',
        });

        // Pre-fill step 2
        reset2({ role: userData.role as Step2FormData['role'] });

        // Pre-fill geography
        if (userData.country_id) {
          setGeoData({
            countryId: userData.country_id,
            stateId: userData.state_id ?? undefined,
            cityId: userData.city_id ?? undefined,
          });
        }

        setLoadingCountries(false);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Error al cargar los datos del usuario');
        router.push(`/${locale}/users`);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load states when country changes ──────────────────────────────────────
  useEffect(() => {
    if (!geoData.countryId) {
      setStates([]);
      setCities([]);
      return;
    }
    setLoadingStates(true);
    listStatesAction(geoData.countryId)
      .then((data) => {
        setStates(data);
        if (!geoInitialized && geoData.stateId && geoData.countryId) {
          setLoadingCities(true);
          listCitiesAction(geoData.countryId, geoData.stateId)
            .then(setCities)
            .finally(() => {
              setLoadingCities(false);
              setGeoInitialized(true);
            });
        }
      })
      .finally(() => setLoadingStates(false));
  }, [geoData.countryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load cities when state changes (after init) ──────────────────────────
  useEffect(() => {
    if (!geoInitialized) return;
    if (!geoData.countryId || !geoData.stateId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    setCities([]);
    listCitiesAction(geoData.countryId, geoData.stateId)
      .then(setCities)
      .finally(() => setLoadingCities(false));
  }, [geoData.stateId, geoInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleStep1 = (data: Step1FormData) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2 = async (data: Step2FormData) => {
    if (!step1Data) return;

    const newGeoErrors: typeof geoErrors = {};
    if (!geoData.countryId) newGeoErrors.country = 'País requerido';
    if (!geoData.stateId) newGeoErrors.state = 'Estado requerido';
    if (!geoData.cityId) newGeoErrors.city = 'Ciudad requerida';

    if (Object.keys(newGeoErrors).length > 0) {
      setGeoErrors(newGeoErrors);
      return;
    }

    setGeoErrors({});
    setIsSubmitting(true);

    const dialCode = step1Data.phoneCountry
      ? `+${getCountryCallingCode(step1Data.phoneCountry as CountryCode)}`
      : null;

    try {
      const result = await updateUserAction({
        user_id: userId,
        first_name: step1Data.first_name,
        last_name: step1Data.last_name,
        phone_country_code: step1Data.phoneNumber ? dialCode : null,
        phone_number: step1Data.phoneNumber || null,
        identity_document: step1Data.identity_document || null,
        address: step1Data.address || null,
        role: data.role,
        status: user?.status ?? 'active',
        city_id: geoData.cityId!,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar el usuario');
        setIsSubmitting(false);
        return;
      }

      toast.success('Usuario actualizado exitosamente');
      router.push(`/${locale}/users/${userId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado');
      setIsSubmitting(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <Breadcrumb
          locale={locale}
          items={[
            { label: t('title'), href: `/${locale}/users` },
            { label: '...' },
          ]}
        />
        <div className="bg-white border border-[#DDE2E5] rounded-[20px] px-[45px] py-[30px] flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-[#0000FF]" />
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb
        locale={locale}
        items={[
          { label: t('title'), href: `/${locale}/users` },
          { label: user ? `${user.first_name} ${user.last_name}` : '' },
          { label: 'Editar' },
        ]}
      />

      {/* Form card */}
      <div className="bg-white border border-[#DDE2E5] rounded-[20px] px-[45px] py-[30px] flex flex-col">
        <FigmaStepProgress currentStep={currentStep} totalSteps={2} />

        {/* Step 1: Datos generales del usuario */}
        {currentStep === 1 && (
          <form
            onSubmit={hs1(handleStep1)}
            noValidate
            className="flex flex-col flex-1 mt-[24px]"
          >
            <h2 className="text-[20px] font-semibold text-[#1D1D1D] mb-[16px]">
              Datos generales del usuario
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[44px] gap-y-[24px]">
              {/* Left column: Nombre, Apellido, Cedula */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Nombre</FigmaLabel>
                  <FigmaInput
                    placeholder="Nombre"
                    error={!!err1.first_name}
                    {...reg1('first_name')}
                  />
                  <FieldError message={err1.first_name?.message} />
                </div>

                <div>
                  <FigmaLabel>Apellido</FigmaLabel>
                  <FigmaInput
                    placeholder="Apellido"
                    error={!!err1.last_name}
                    {...reg1('last_name')}
                  />
                  <FieldError message={err1.last_name?.message} />
                </div>

                <div>
                  <FigmaLabel>Cedula de identidad</FigmaLabel>
                  <FigmaInput
                    placeholder="Ingrese la cedula"
                    {...reg1('identity_document')}
                  />
                </div>
              </div>

              {/* Right column: Telefono, Correo, Direccion */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Numero Telefonico</FigmaLabel>
                  <PhoneField
                    countryValue={phoneCountry ?? ''}
                    numberValue={phoneNumber ?? ''}
                    onCountryChange={(iso) => sv1('phoneCountry', iso, { shouldValidate: true })}
                    onNumberChange={(num) => sv1('phoneNumber', num, { shouldValidate: true })}
                    error={!!err1.phoneNumber}
                  />
                  <FieldError message={err1.phoneNumber?.message} />
                </div>

                <div>
                  <FigmaLabel>Correo Electronico</FigmaLabel>
                  <FigmaInput
                    type="email"
                    placeholder="Correo Electronico"
                    error={!!err1.email}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                    {...reg1('email')}
                  />
                  <FieldError message={err1.email?.message} />
                </div>

                <div>
                  <FigmaLabel>Direccion</FigmaLabel>
                  <FigmaInput
                    placeholder="Ingrese direccion del usuario"
                    {...reg1('address')}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-[25px] mt-auto pt-[24px]">
              <button
                type="button"
                onClick={() => router.push(`/${locale}/users/${userId}`)}
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

        {/* Step 2: Rol y zona */}
        {currentStep === 2 && (
          <form
            onSubmit={hs2(handleStep2)}
            noValidate
            className="flex flex-col flex-1 mt-[24px]"
          >
            <h2 className="text-[20px] font-semibold text-[#1D1D1D] mb-[16px]">
              Rol de usuario y asignacion de zona
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[44px] gap-y-[24px]">
              {/* Left column: Rol, Pais */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Rol</FigmaLabel>
                  <FigmaSelect error={!!err2.role} {...reg2('role')}>
                    <option value="">Selecciona el rol del usuario</option>
                    <option value="owner">{t('roles.owner')}</option>
                    <option value="admin">{t('roles.admin')}</option>
                    <option value="manager">{t('roles.manager')}</option>
                    <option value="installer">{t('roles.installer')}</option>
                    <option value="viewer">{t('roles.viewer')}</option>
                    <option value="store_owner">{t('roles.store_owner')}</option>
                  </FigmaSelect>
                  <FieldError message={err2.role?.message} />
                </div>

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
              </div>

              {/* Right column: Estado, Ciudad */}
              <div className="flex flex-col gap-[16px]">
                <div>
                  <FigmaLabel>Estado</FigmaLabel>
                  <FigmaSelect
                    value={geoData.stateId ?? ''}
                    onChange={(e) => {
                      setGeoInitialized(true);
                      setGeoData((prev) => ({
                        ...prev,
                        stateId: Number(e.target.value) || undefined,
                        cityId: undefined,
                      }));
                    }}
                    disabled={loadingStates || !geoData.countryId}
                    loading={loadingStates}
                    error={!!geoErrors.state}
                  >
                    <option value="">Selecciona el estado</option>
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
                onClick={() => router.push(`/${locale}/users/${userId}`)}
                className="h-[50px] w-[205px] border border-[#0000FF] rounded-[12px] text-[20px] font-semibold text-[#0000FF] hover:bg-[#F0F0FF] transition-colors cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[50px] w-[205px] bg-[#0000FF] rounded-[12px] text-[20px] font-semibold text-white hover:bg-[#0000CC] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? tCommon('loading') : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
