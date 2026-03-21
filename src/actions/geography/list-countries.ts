'use server';

import { rpcGeoListCountries } from '@/lib/supabase/rpc';

export interface CountryOption {
  country_id: number;
  country_code: string;
  country_name: string;
}

export async function listCountriesAction(): Promise<CountryOption[]> {
  const rows = await rpcGeoListCountries();
  return rows
    .map((r) => ({
      country_id: r.country_id,
      country_code: r.country_code,
      country_name: r.country_name,
    }))
    .sort((a, b) => a.country_name.localeCompare(b.country_name));
}
