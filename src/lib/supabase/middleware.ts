import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export interface UpdateSessionResult {
  response: NextResponse;
  authenticated: boolean;
}

export const updateSession = async (request: NextRequest): Promise<UpdateSessionResult> => {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validar usuario real y refrescar tokens/cookies cuando sea necesario.
  const { data, error } = await supabase.auth.getUser();

  return {
    response,
    authenticated: !error && !!data.user,
  };
};
