/**
 * React Query Setup with Enhanced Error Handling
 * Provides QueryClient and QueryClientProvider configuration
 */

'use client';

import { QueryClient, QueryClientProvider as ReactQueryProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createEnhancedQueryClient } from './react-query-error-handling';

interface QueryClientProviderProps {
  children: ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  // Use enhanced query client with comprehensive error handling
  const [queryClient] = useState(() => createEnhancedQueryClient());

  return (
    <ReactQueryProvider client={queryClient}>
      {children}
    </ReactQueryProvider>
  );
}
