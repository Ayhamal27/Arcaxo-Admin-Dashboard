'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, ChevronDown, Loader2, Navigation } from 'lucide-react';
import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber as libIsValid,
  type CountryCode,
} from 'libphonenumber-js';
import { getStoreDetailAction } from '@/actions/stores/get-store';
import { updateStoreAction } from '@/actions/stores/update-store';
import { reverseGeocodeAction } from '@/actions/geography/reverse-geocode';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { listCountriesAction, CountryOption } from '@/actions/geography/list-countries';
import { listStatesAction, StateOption } from '@/actions/geography/list-states';
import { listCitiesAction, CityOption } from '@/actions/geography/list-cities';
import { useTranslations } from 'next-intl';
import { RpcAdminGetStoreDetailOutput } from '@/types/rpc-outputs';
import { StoreResponsible } from '@/types/entities';

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

/** Reverse-map a dial code like "+58" to an ISO country code like "VE" */
function dialCodeToIso(dialCode?: string | null): string {
  if (!dialCode) return '';
  const match = PHONE_COUNTRIES.find((c) => c.dialCode === dialCode);
  return match?.iso ?? '';
}

/** Detects "lat, lng" format like "10.245141129088811, -68.00875269101005" */
function parseLatLng(value: string): { lat: number; lng: number } | null {
  const match = value.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Normalize string for fuzzy matching */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const Step1Schema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
    phoneCountry: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().min(3, 'Dirección requerida'),
    latitude: z.number().refine((v) => v !== 0, 'Coordenadas requeridas'),
    longitude: z.number().refine((v) => v !== 0, 'Coordenadas requeridas'),
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

export default function EditarTiendaPage({
  params,
}: {
  params: Promise<{ locale: string; storeId: string }>;
}) {
  const { locale, storeId } = use(params);
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
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<RpcAdminGetStoreDetailOutput | null>(null);

  // Location input state
  const [locationInput, setLocationInput] = useState('');
  const [isFillingGeo, setIsFillingGeo] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');

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
    defaultValues: { phoneCountry: '', phoneNumber: '', address: '', latitude: 0, longitude: 0 },
  });

  const phoneCountry1 = w1('phoneCountry');
  const phoneNumber1 = w1('phoneNumber');
  const latValue = w1('latitude');
  const lngValue = w1('longitude');

  // Step 2 form
  const {
    register: reg2,
    handleSubmit: hs2,
    setValue: sv2,
    watch: w2,
    reset: reset2,
    formState: { errors: err2 },
  } = useForm<Step2FormData>({
    resolver: zodResolver(Step2Schema),
    defaultValues: { respPhoneCountry: '', respPhoneNumber: '' },
  });

  const respPhoneCountry = w2('respPhoneCountry');
  const respPhoneNumber = w2('respPhoneNumber');

  // ─── Load store data + countries ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getStoreDetailAction(storeId), listCountriesAction()])
      .then(([storeData, countriesData]) => {
        setStore(storeData);
        setCountries(countriesData);

        // Pre-fill step 1
        const storePhoneIso = dialCodeToIso(storeData.phone_country_code);
        const storeLat = storeData.latitude ?? 0;
        const storeLng = storeData.longitude ?? 0;
        reset1({
          name: storeData.name,
          phoneCountry: storePhoneIso,
          phoneNumber: storeData.phone_number ?? '',
          address: storeData.address || '',
          latitude: storeLat,
          longitude: storeLng,
        });
        // Pre-fill location input with existing coordinates
        if (storeLat !== 0 && storeLng !== 0) {
          setLocationInput(`${storeLat}, ${storeLng}`);
          setResolvedAddress(storeData.address || '');
        } else if (storeData.address) {
          setLocationInput(storeData.address);
        }

        // Pre-fill step 2 from responsible
        const resp = storeData.responsible as StoreResponsible | null;
        if (resp) {
          const respPhoneIso = dialCodeToIso(resp.phone_country_code);
          reset2({
            responsible_first_name: resp.first_name ?? '',
            responsible_last_name: resp.last_name ?? '',
            responsible_email: resp.email ?? '',
            respPhoneCountry: respPhoneIso,
            respPhoneNumber: resp.phone_number ?? '',
          });
        }

        // Pre-fill geography: find country_id from country_code
        const countryMatch = countriesData.find(
          (c) => c.country_code === storeData.country_code
        );
        if (countryMatch) {
          setGeoData({
            countryId: countryMatch.country_id,
            stateId: storeData.state_id,
            cityId: storeData.city_id,
          });
        }

        setLoadingCountries(false);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Error al cargar los datos de la tienda');
        router.push(`/${locale}/stores`);
      });
  }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // On initial load, also fetch cities for the pre-selected state
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

  // ─── Location handlers ─────────────────────────────────────────────────────

  // Handle location input: detects coords and updates form, no auto-geocoding
  const handleLocationChange = useCallback(
    (value: string) => {
      setLocationInput(value);
      setResolvedAddress('');

      sv1('latitude', 0);
      sv1('longitude', 0);
      sv1('address', '');

      const coords = parseLatLng(value);
      if (!coords) {
        if (value.trim().length >= 5) {
          sv1('address', value.trim(), { shouldValidate: true });
          setResolvedAddress(value.trim());
        }
        return;
      }

      sv1('latitude', coords.lat, { shouldValidate: true });
      sv1('longitude', coords.lng, { shouldValidate: true });
    },
    [sv1]
  );

  // Button handler: geocode coords, show address, then fill País/Estado/Ciudad
  const handleFillGeoFromCoords = useCallback(async () => {
    if (!latValue || !lngValue) return;
    setIsFillingGeo(true);

    try {
      const geo = await reverseGeocodeAction(latValue, lngValue);
      if (!geo) {
        toast.error('No se pudo obtener la dirección. Verifica la clave de Google Maps o completa los campos manualmente.');
        return;
      }

      sv1('address', geo.address, { shouldValidate: true });
      setResolvedAddress(geo.address);

      if (!geo.country || !geo.state || !geo.city) {
        toast.info('Dirección calculada. Selecciona el país, estado y ciudad manualmente.');
        return;
      }

      const matchedCountry = countries.find(
        (c) =>
          normalize(c.country_name) === normalize(geo.country) ||
          c.country_code.toUpperCase() === geo.countryCode.toUpperCase()
      );
      if (!matchedCountry) {
        toast.info(`País "${geo.country}" no encontrado en la lista`);
        return;
      }

      setGeoData({ countryId: matchedCountry.country_id, stateId: undefined, cityId: undefined });
      setGeoInitialized(true);

      const statesList = await listStatesAction(matchedCountry.country_id);
      setStates(statesList);

      const matchedState = statesList.find(
        (s) =>
          normalize(s.state_name) === normalize(geo.state) ||
          normalize(s.state_name).includes(normalize(geo.state)) ||
          normalize(geo.state).includes(normalize(s.state_name))
      );
      if (!matchedState) {
        toast.info(`Estado "${geo.state}" no encontrado. Selecciónalo manualmente.`);
        return;
      }

      setGeoData((prev) => ({ ...prev, stateId: matchedState.state_id, cityId: undefined }));

      const citiesList = await listCitiesAction(matchedCountry.country_id, matchedState.state_id);
      setCities(citiesList);

      const matchedCity = citiesList.find(
        (c) =>
          normalize(c.city_name) === normalize(geo.city) ||
          normalize(c.city_name).includes(normalize(geo.city)) ||
          normalize(geo.city).includes(normalize(c.city_name))
      );
      if (matchedCity) {
        setGeoData((prev) => ({ ...prev, cityId: matchedCity.city_id }));
        setGeoErrors({});
        toast.success('Ubicación autocompletada');
      } else {
        toast.info(`Ciudad "${geo.city}" no encontrada. Selecciónala manualmente.`);
      }
    } catch {
      toast.error('Error al calcular la dirección');
    } finally {
      setIsFillingGeo(false);
    }
  }, [latValue, lngValue, sv1, countries]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

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

    // Build phone dial codes from ISO
    const storeDialCode = step1Data.phoneCountry
      ? `+${getCountryCallingCode(step1Data.phoneCountry as CountryCode)}`
      : null;
    const respDialCode = data.respPhoneCountry
      ? `+${getCountryCallingCode(data.respPhoneCountry as CountryCode)}`
      : null;

    try {
      const result = await updateStoreAction({
        store_id: storeId,
        name: step1Data.name,
        city_id: geoData.cityId,
        address: step1Data.address,
        latitude: step1Data.latitude,
        longitude: step1Data.longitude,
        phone_country_code: step1Data.phoneNumber ? storeDialCode : null,
        phone_number: step1Data.phoneNumber || null,
        responsible_first_name: data.responsible_first_name,
        responsible_last_name: data.responsible_last_name,
        responsible_email: data.responsible_email,
        responsible_phone_country_code: data.respPhoneNumber ? respDialCode : null,
        responsible_phone_number: data.respPhoneNumber || null,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Error al actualizar la tienda');
        setIsSubmitting(false);
        return;
      }

      toast.success('Tienda actualizada exitosamente');
      router.push(`/${locale}/stores/${storeId}`);
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
            { label: t('title'), href: `/${locale}/stores` },
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
          { label: t('title'), href: `/${locale}/stores` },
          { label: store?.name ?? '' },
          { label: 'Editar' },
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
                  <FigmaLabel>Ubicación de la tienda</FigmaLabel>
                  <div
                    className={`flex items-center gap-[10px] w-full h-[52px] bg-[#F0F0F3] rounded-[8px] px-[16px] ${
                      err1.address || err1.latitude ? 'ring-1 ring-[#FF4163]' : ''
                    }`}
                  >
                    <Navigation className="w-[24px] h-[24px] text-[#838383] flex-shrink-0" />
                    <input
                      className="flex-1 bg-transparent text-[18px] text-[#1D1D1D] placeholder:text-[#838383] outline-none h-full"
                      placeholder="10.2451, -68.0087"
                      value={locationInput}
                      onChange={(e) => handleLocationChange(e.target.value)}
                    />
                  </div>
                  {/* Helper text OR resolved address */}
                  {resolvedAddress ? (
                    <p className="text-[13px] text-[#228D70] mt-1 px-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {resolvedAddress}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#9CA3AF] mt-1 px-1">
                      Pega las coordenadas de Google Maps (click derecho en el mapa → copiar coordenadas) o escribe la dirección manualmente
                    </p>
                  )}
                  <FieldError
                    message={err1.address?.message || err1.latitude?.message}
                  />

                  {/* Button: visible when valid coords are entered */}
                  {latValue !== 0 && (
                    <button
                      type="button"
                      onClick={handleFillGeoFromCoords}
                      disabled={isFillingGeo}
                      className="mt-2 h-[36px] px-4 text-[13px] font-medium text-white bg-[#0000FF] rounded-[8px] hover:bg-[#0000CC] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
                    >
                      {isFillingGeo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Completando ubicación...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          Calcular dirección desde coordenadas
                        </>
                      )}
                    </button>
                  )}
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
                onClick={() => router.push(`/${locale}/stores/${storeId}`)}
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
                onClick={() => router.push(`/${locale}/stores/${storeId}`)}
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
