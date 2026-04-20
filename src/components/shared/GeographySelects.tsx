'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listCountriesAction, CountryOption } from '@/actions/geography/list-countries';
import { listStatesAction, StateOption } from '@/actions/geography/list-states';
import { listCitiesAction, CityOption } from '@/actions/geography/list-cities';
import { cn } from '@/lib/utils/cn';

interface GeographySelectsProps {
  countryId?: number;
  stateId?: number;
  cityId?: number;
  onChange: (data: { countryId: number; stateId: number; cityId: number }) => void;
  errors?: { country?: string; state?: string; city?: string };
  disabled?: boolean;
}

const selectClass = (error?: boolean) =>
  cn(
    'w-full h-[50px] px-3 bg-white border-2 rounded-[10px] text-[14px] text-[#191919]',
    'appearance-none focus:outline-none transition-colors',
    'disabled:bg-[#F5F5F5] disabled:text-[#999] disabled:cursor-not-allowed',
    error ? 'border-[#FF4163]' : 'border-[#D0D5DD] focus:border-[#0000FF]'
  );

export function GeographySelects({
  countryId,
  stateId,
  cityId,
  onChange,
  errors,
  disabled,
}: GeographySelectsProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Load countries on mount
  useEffect(() => {
    listCountriesAction()
      .then(setCountries)
      .finally(() => setLoadingCountries(false));
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!countryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStates([]);
      setCities([]);
      return;
    }
    setLoadingStates(true);
    setStates([]);
    setCities([]);
    listStatesAction(countryId)
      .then(setStates)
      .finally(() => setLoadingStates(false));
  }, [countryId]);

  // Load cities when state changes
  useEffect(() => {
    if (!countryId || !stateId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCities([]);
      return;
    }
    setLoadingCities(true);
    setCities([]);
    listCitiesAction(countryId, stateId)
      .then(setCities)
      .finally(() => setLoadingCities(false));
  }, [countryId, stateId]);

  return (
    <div className="space-y-4">
      {/* Country */}
      <div>
        <label className="block text-[12px] text-[#667085] mb-1.5">País *</label>
        <div className="relative">
          <select
            disabled={disabled || loadingCountries}
            value={countryId ?? ''}
            onChange={(e) =>
              onChange({ countryId: Number(e.target.value), stateId: 0, cityId: 0 })
            }
            className={selectClass(!!errors?.country)}
          >
            <option value="">
              {loadingCountries ? 'Cargando países...' : 'Seleccionar país'}
            </option>
            {countries.map((c) => (
              <option key={c.country_id} value={c.country_id}>
                {c.country_name}
              </option>
            ))}
          </select>
          {loadingCountries && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#667085]" />
          )}
        </div>
        {errors?.country && <p className="text-[12px] text-[#FF4163] mt-1">{errors.country}</p>}
      </div>

      {/* State */}
      <div>
        <label className="block text-[12px] text-[#667085] mb-1.5">Estado / Provincia *</label>
        <div className="relative">
          <select
            disabled={disabled || loadingStates || !countryId}
            value={stateId ?? ''}
            onChange={(e) =>
              onChange({ countryId: countryId!, stateId: Number(e.target.value), cityId: 0 })
            }
            className={selectClass(!!errors?.state)}
          >
            <option value="">
              {loadingStates ? 'Cargando estados...' : 'Seleccionar estado'}
            </option>
            {states.map((s) => (
              <option key={s.state_id} value={s.state_id}>
                {s.state_name}
              </option>
            ))}
          </select>
          {loadingStates && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#667085]" />
          )}
        </div>
        {errors?.state && <p className="text-[12px] text-[#FF4163] mt-1">{errors.state}</p>}
      </div>

      {/* City */}
      <div>
        <label className="block text-[12px] text-[#667085] mb-1.5">Ciudad *</label>
        <div className="relative">
          <select
            disabled={disabled || loadingCities || !stateId}
            value={cityId ?? ''}
            onChange={(e) =>
              onChange({
                countryId: countryId!,
                stateId: stateId!,
                cityId: Number(e.target.value),
              })
            }
            className={selectClass(!!errors?.city)}
          >
            <option value="">
              {loadingCities ? 'Cargando ciudades...' : 'Seleccionar ciudad'}
            </option>
            {cities.map((c) => (
              <option key={c.city_id} value={c.city_id}>
                {c.city_name}
              </option>
            ))}
          </select>
          {loadingCities && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#667085]" />
          )}
        </div>
        {errors?.city && <p className="text-[12px] text-[#FF4163] mt-1">{errors.city}</p>}
      </div>
    </div>
  );
}
