'use client';

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function getLocaleFromPath() {
  const match = window.location.pathname.match(/^\/(es|en)(\/|$)/);
  return match ? match[1] : 'es';
}

async function handleAuthExpired() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.auth.signOut();
  const locale = getLocaleFromPath();
  window.location.href = `/${locale}/login?expired=true`;
}

function isAuthExpired(error: unknown): boolean {
  return error instanceof Error && error.message === 'AUTH_EXPIRED';
}

function isUnrecognizedAction(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'UnrecognizedActionError' ||
      error.message.includes('was not found on the server'))
  );
}

function onError(error: unknown) {
  if (isAuthExpired(error)) {
    handleAuthExpired();
  } else if (isUnrecognizedAction(error)) {
    window.location.reload();
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError }),
        mutationCache: new MutationCache({ onError }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: (failureCount, error) => {
              if (isAuthExpired(error) || isUnrecognizedAction(error)) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
