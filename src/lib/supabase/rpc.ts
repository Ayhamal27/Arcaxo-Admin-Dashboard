import { getServerClient } from './server';

/**
 * Generic helper para llamar RPCs de Supabase desde server actions
 *
 * Uso:
 * ```typescript
 * const result = await callRpc('rpc_user_access_gate', { p_user_id: userId });
 * ```
 */
export async function callRpc<T = unknown>(
  rpcName: string,
  params?: Record<string, unknown>
): Promise<T> {
  const client = getServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await client.rpc(rpcName as any, params as any);

  if (error) {
    console.error(`[RPC Error] ${rpcName}:`, error);
    throw new Error(error.message || `RPC ${rpcName} failed`);
  }

  return data as T;
}
