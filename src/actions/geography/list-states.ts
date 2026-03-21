'use server';

import { rpcGeoListStates } from '@/lib/supabase/rpc';

export interface StateOption {
  state_id: number;
  state_name: string;
  state_code: string;
}

export async function listStatesAction(countryId: number): Promise<StateOption[]> {
  const rows = await rpcGeoListStates({ p_country_id: countryId });
  return rows
    .map((r) => ({
      state_id: r.state_id,
      state_name: r.state_name,
      state_code: r.state_code,
    }))
    .sort((a, b) => a.state_name.localeCompare(b.state_name));
}
