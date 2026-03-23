'use server';

import { rpcAdminUpdateStore, rpcStoreInstallationContextUpdate } from '@/lib/supabase/rpc';
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
  // Context fields (phone, responsible)
  phone_country_code: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  responsible_first_name: z.string().optional().nullable(),
  responsible_last_name: z.string().optional().nullable(),
  responsible_email: z.string().email().optional().nullable(),
  responsible_phone_country_code: z.string().optional().nullable(),
  responsible_phone_number: z.string().optional().nullable(),
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

    // 1) Update core store fields via rpc_admin_update_store
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

    // 2) Update context fields (phone, responsible) via rpc_store_installation_context_update
    const hasContextFields =
      data.phone_country_code !== undefined ||
      data.phone_number !== undefined ||
      data.responsible_first_name !== undefined ||
      data.responsible_last_name !== undefined ||
      data.responsible_email !== undefined ||
      data.responsible_phone_country_code !== undefined ||
      data.responsible_phone_number !== undefined;

    if (hasContextFields) {
      const ctxResult = await rpcStoreInstallationContextUpdate({
        p_store_id: data.store_id,
        p_phone_country_code: data.phone_country_code ?? null,
        p_phone_number: data.phone_number ?? null,
        p_responsible_first_name: data.responsible_first_name ?? null,
        p_responsible_last_name: data.responsible_last_name ?? null,
        p_responsible_email: data.responsible_email ?? null,
      });

      if (ctxResult.error || ctxResult.result === false) {
        return {
          success: false,
          error: ctxResult.error ?? 'Error al actualizar datos de contacto',
        };
      }
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
