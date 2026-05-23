/**
 * React Query Setup
 * Provides QueryClient and QueryClientProvider configuration
 */

'use client';

import { QueryClient, QueryClientProvider as ReactQueryProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryClientProviderProps {
  children: ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <ReactQueryProvider client={queryClient}>
      {children}
    </ReactQueryProvider>
  );
}
