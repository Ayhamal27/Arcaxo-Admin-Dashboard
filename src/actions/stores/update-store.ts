'use server';

import { rpcAdminUpdateStore } from '@/lib/supabase/rpc';
import { z } from 'zod';

const UpdateStoreSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(2).max(200).optional(),
  address: z.string().min(5).max(500).optional(),
  city_id: z.number().int().positive().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  authorized_devices_count: z.number().int().nonnegative().optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  client_group: z.string().optional(),
});

export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

export interface UpdateStoreResult {
  success: boolean;
  store_id?: string;
  error?: string;
}

export async function updateStoreAction(input: unknown): Promise<UpdateStoreResult> {
  try {
    const data = UpdateStoreSchema.parse(input);
    const result = await rpcAdminUpdateStore({
      p_store_id: data.store_id,
      p_name: data.name ?? null,
      p_address: data.address ?? null,
      p_city_id: data.city_id ?? null,
      p_latitude: data.latitude ?? null,
      p_longitude: data.longitude ?? null,
      p_authorized_devices_count: data.authorized_devices_count ?? null,
      p_status: (data.status as import('@/types/database').StoreStatus) ?? null,
      p_client_group: data.client_group ?? null,
    });

    if (result.error || result.result === false) {
      return { success: false, error: result.error ?? 'Error al actualizar la tienda' };
    }

    return { success: true, store_id: result.store_id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const msg = error instanceof Error ? error.message : 'Error al actualizar la tienda';
    return { success: false, error: msg };
  }
}
