import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

/**
 * Server-side Supabase client con service_role
 * Usado SOLO en server actions y API routes
 * NUNCA acceder desde componentes cliente
 */
let _serverClient: ReturnType<typeof createClient<Database>> | null = null;

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

export function getServerClient() {
  if (!_serverClient) {
    _serverClient = createServerClient();
  }
  return _serverClient;
}

/**
 * Server-side session handler usando @supabase/ssr
 * Lee la sesión desde cookies httpOnly
 */
export async function createServerAuthClient() {
  const { createServerClient: createSSRClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');

  const cookieStore = await cookies();

  return createSSRClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
