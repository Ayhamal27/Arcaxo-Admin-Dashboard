import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export interface UpdateSessionResult {
  response: NextResponse;
  authenticated: boolean;
}

export const updateSession = async (request: NextRequest): Promise<UpdateSessionResult> => {
  // Mutable response — rebuilt if cookies are refreshed so both the request
  // headers (read by Server Components in this same request) and the response
  // Set-Cookie headers (persisted in the browser) receive the new tokens.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Write new cookies into the request so downstream Server Components
          //    reading `cookies()` from next/headers see the refreshed tokens.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // 2. Rebuild the response with the updated request headers so Next.js
          //    forwards them to the page handlers.
          supabaseResponse = NextResponse.next({ request });

          // 3. Also set the cookies on the response so the browser stores them.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads the JWT locally — no network call unless the token is
  // expired and a refresh is needed. This avoids concurrent-request race
  // conditions caused by Next.js prefetching all sidebar links simultaneously,
  // which would trigger parallel getUser() network calls to Supabase and cause
  // some of them to fail → spurious redirects to login.
  const { data: { session } } = await supabase.auth.getSession();

  return {
    response: supabaseResponse,
    authenticated: !!session,
  };
};
