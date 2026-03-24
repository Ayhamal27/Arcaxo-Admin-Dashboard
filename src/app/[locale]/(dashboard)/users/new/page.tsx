'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Loader2, Copy, Check, X } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber as libIsValid,
  type CountryCode,
} from 'libphonenumber-js';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listCountriesAction, CountryOption } from '@/actions/geography/list-countries';
import { listStatesAction, StateOption } from '@/actions/geography/list-states';
import { listCitiesAction, CityOption } from '@/actions/geography/list-cities';
import { useTranslations } from 'next-intl';

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

interface CreatedCredentials {
  userId: string;
  email: string;
  password: string;
}

interface CreateUserApiSuccess {
  ok: true;
  data: {
    user_id: string;
    email: string;
    profile: {
      role: string;
      status: string;
      city_id: number;
    };
  };
}

interface CreateUserApiError {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
}

function generateTemporaryPassword() {
  return Math.random().toString(36).slice(-8) + 'A1!';
}

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

// ─── Credentials Modal ──────────────────────────────────────────────────────

function CredentialsModal({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'all' | null>(null);

  const copyWithFallback = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  };

  const copyToClipboard = async (text: string, field: 'email' | 'password' | 'all') => {
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof window !== 'undefined' &&
        window.isSecureContext &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(text);
      } else {
        const copied = copyWithFallback(text);
        if (!copied) {
          throw new Error('copy_failed');
        }
      }

      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('No se pudo copiar automáticamente. Copia manualmente el texto.');
    }
  };

  const copyAll = () => {
    copyToClipboard(`Email: ${email}\nContraseña: ${password}`, 'all');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[15px] p-6 max-w-[440px] w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-semibold text-[#191919]">Credenciales del usuario</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-[#667085]" />
          </button>
        </div>

        <div className="p-3 bg-[#E6F9F1] rounded-[8px] mb-5">
          <p className="text-[13px] text-[#228D70] font-medium">
            Usuario creado exitosamente. Copia las credenciales para compartirlas con el usuario.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-5">
          <div>
            <p className="text-[13px] text-[#667085] mb-1">Email</p>
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-[8px] px-3 py-2.5">
              <span className="flex-1 text-[14px] font-mono text-[#191919] break-all">
                {email}
              </span>
              <button
                onClick={() => copyToClipboard(email, 'email')}
                className="flex-shrink-0 p-1 hover:bg-[#E5E5EA] rounded transition-colors"
              >
                {copiedField === 'email' ? (
                  <Check className="w-4 h-4 text-[#228D70]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#667085]" />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[13px] text-[#667085] mb-1">Contraseña</p>
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-[8px] px-3 py-2.5">
              <span className="flex-1 text-[14px] font-mono text-[#191919] break-all">
                {password}
              </span>
              <button
                onClick={() => copyToClipboard(password, 'password')}
                className="flex-shrink-0 p-1 hover:bg-[#E5E5EA] rounded transition-colors"
              >
                {copiedField === 'password' ? (
                  <Check className="w-4 h-4 text-[#228D70]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#667085]" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyAll}
            className="flex-1 h-[44px] text-[14px] font-medium text-[#0000FF] border border-[#0000FF] rounded-[8px] hover:bg-[#F0F0FF] transition-colors"
          >
            {copiedField === 'all' ? 'Copiado!' : 'Copiar todo'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-[44px] text-[14px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] transition-colors"
          >
            Continuar
          </button>
        </div>
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

export default function NuevoUsuarioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
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
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

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

  const phoneCountry = w1('phoneCountry');
  const phoneNumber = w1('phoneNumber');

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

    // Build phone dial code
    const dialCode = step1Data.phoneCountry
      ? `+${getCountryCallingCode(step1Data.phoneCountry as CountryCode)}`
      : null;
    const tempPassword = generateTemporaryPassword();

    try {
      const payload = {
        first_name: step1Data.first_name,
        last_name: step1Data.last_name,
        email: step1Data.email,
        password: tempPassword,
        send_invite: false,
        phone_country_code: step1Data.phoneNumber ? dialCode : null,
        phone_number: step1Data.phoneNumber || null,
        identity_document: step1Data.identity_document || null,
        address: step1Data.address || null,
        role: data.role,
        status: 'active' as const,
        city_id: geoData.cityId!,
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let responseJson: CreateUserApiSuccess | CreateUserApiError | null = null;
      try {
        responseJson = (await response.json()) as CreateUserApiSuccess | CreateUserApiError;
      } catch {
        responseJson = null;
      }

      if (!response.ok) {
        const message = responseJson && !responseJson.ok ? responseJson.error?.message : null;
        toast.error(message ?? 'Error al crear el usuario');
        return;
      }

      if (!responseJson || !responseJson.ok) {
        toast.error('Respuesta inválida del servidor');
        return;
      }

      setCredentials({
        userId: responseJson.data.user_id,
        email: responseJson.data.email,
        password: tempPassword,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Breadcrumb
        locale={locale}
        items={[
          { label: t('title'), href: `/${locale}/users` },
          { label: 'Crear nuevo usuario' },
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
                onClick={() => router.push(`/${locale}/users`)}
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
                onClick={() => router.push(`/${locale}/users`)}
                className="h-[50px] w-[205px] border border-[#0000FF] rounded-[12px] text-[20px] font-semibold text-[#0000FF] hover:bg-[#F0F0FF] transition-colors cursor-pointer"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[50px] w-[205px] bg-[#0000FF] rounded-[12px] text-[20px] font-semibold text-white hover:bg-[#0000CC] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? tCommon('loading') : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}
      </div>

      {credentials?.email && credentials?.password && (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          onClose={() =>
            router.push(
              credentials.userId
                ? `/${locale}/users/${credentials.userId}`
                : `/${locale}/users`
            )
          }
        />
      )}
    </div>
  );
}
