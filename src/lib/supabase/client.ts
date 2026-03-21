'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';

let _browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client con anon key
 * Solo para autenticación — NO para queries de datos
 */
export function getBrowserClient() {
  if (!_browserClient) {
    _browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _browserClient;
}
