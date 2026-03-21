'use server';

import { rpcGeoListCities } from '@/lib/supabase/rpc';

export interface CityOption {
  city_id: number;
  city_name: string;
}

export async function listCitiesAction(
  countryId: number,
  stateId: number
): Promise<CityOption[]> {
  const rows = await rpcGeoListCities({ p_country_id: countryId, p_state_id: stateId });
  return rows
    .map((r) => ({
      city_id: r.city_id,
      city_name: r.city_name,
    }))
    .sort((a, b) => a.city_name.localeCompare(b.city_name));
}
