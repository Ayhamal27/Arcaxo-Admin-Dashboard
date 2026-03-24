'use server';

import { rpcCreateStore } from '@/lib/supabase/rpc';
import { z } from 'zod';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const CreateStoreSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100),
  city_id: z.number().min(1, 'Ciudad es requerida'),
  address: z.string().min(5, 'Dirección es requerida'),
  latitude: z.number(),
  longitude: z.number(),
  phone_country_code: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  responsible_first_name: z.string().min(1, 'Nombre del responsable es requerido'),
  responsible_last_name: z.string().min(1, 'Apellido del responsable es requerido'),
  responsible_email: z
    .string()
    .min(1, 'Correo del responsable requerido')
    .email('Formato de correo inválido')
    .refine((v) => EMAIL_REGEX.test(v), 'Ingrese un correo válido (ej: usuario@dominio.com)'),
  responsible_phone_country_code: z.string().optional().nullable(),
  responsible_phone_number: z.string().optional().nullable(),
  authorized_devices_count: z.number().optional().default(0),
});

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;

export interface CreateStoreResult {
  success: boolean;
  store_id?: string;
  error?: string;
}

export async function createStoreAction(
  input: unknown
): Promise<CreateStoreResult> {
  try {
    const data = CreateStoreSchema.parse(input);

    const result = await rpcCreateStore({
      p_name: data.name,
      p_city_id: data.city_id,
      p_address: data.address,
      p_latitude: data.latitude,
      p_longitude: data.longitude,
      p_phone_country_code: data.phone_country_code ?? null,
      p_phone_number: data.phone_number ?? null,
      p_responsible_first_name: data.responsible_first_name,
      p_responsible_last_name: data.responsible_last_name,
      p_responsible_email: data.responsible_email,
      p_responsible_phone_country_code: data.responsible_phone_country_code ?? null,
      p_responsible_phone_number: data.responsible_phone_number ?? null,
      p_authorized_devices_count: data.authorized_devices_count ?? 0,
      p_preload_payload: { setup: true },
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, store_id: result.store_id };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? 'Datos inválidos' };
    }
    const msg = error instanceof Error ? error.message : 'Error al crear la tienda';
    console.error('[createStoreAction]', error);
    return { success: false, error: msg };
  }
}
