/**
 * React Query Integration with Enhanced Error Handling
 */

'use client';

import {
  QueryClient,
  QueryCache,
  MutationCache,
  QueryKey,
} from '@tanstack/react-query';
import { logger, LogCategory } from './logger';
import { ErrorHandler, ErrorLogger, AppError } from './error-handler';
import { enhancedAPIClient, handleAPIResponse } from './api-client-enhanced';
import { circuitBreakerRegistry, circuitBreakers } from './circuit-breaker';

interface APIResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  status: number;
}

/**
 * Enhanced Query Client with comprehensive error handling
 */
export function createEnhancedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
        retry: (failureCount, error) => {
          // Don't retry on client errors (4xx)
          const appError = error as any;
          if (appError?.status >= 400 && appError?.status < 500 && appError?.status !== 429) {
            return false;
          }
          // Retry up to 3 times for server errors and network issues
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
      },
      mutations: {
        retry: (failureCount, error) => {
          // Don't retry mutations on client errors
          const appError = error as any;
          if (appError?.status >= 400 && appError?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        const appError = handleError(error, query.queryKey);
        logger.error(
          LogCategory.API,
          'Query error',
          error as Error,
          {
            queryKey: query.queryKey,
            appError,
          }
        );
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context) => {
        const appError = handleError(error);
        logger.error(
          LogCategory.API,
          'Mutation error',
          error as Error,
          {
            variables,
            appError,
          }
        );
      },
    }),
  });
}

/**
 * Handle and classify errors
 */
function handleError(error: unknown, queryKey?: QueryKey): AppError {
  let appError: AppError;

  if (error instanceof Error) {
    appError = ErrorHandler.handleApiError(error);

    // Add query context
    if (queryKey) {
      appError.details = {
        ...appError.details,
        queryKey: Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey),
      };
    }
  } else {
    appError = ErrorHandler.createError(
      ErrorHandler.handleApiError(error as Error).type,
      String(error),
      ErrorHandler.handleApiError(error as Error).severity
    );
  }

  // Log the error
  ErrorLogger.log(appError);

  return appError;
}

/**
 * Enhanced query hook with error handling
 */
export function useEnhancedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: {
    onError?: (error: AppError) => void;
    onSuccess?: (data: T) => void;
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  const { onError, onSuccess, ...queryOptions } = options || {};

  return {
    queryKey,
    queryFn: async (): Promise<T> => {
      try {
        const result = await queryFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const appError = handleError(error, queryKey);
        onError?.(appError);
        throw appError;
      }
    },
    ...queryOptions,
  };
}

/**
 * Enhanced mutation hook with error handling
 */
export function useEnhancedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: AppError, variables: V) => void;
    onSettled?: () => void;
  }
) {
  const { onError, onSuccess, onSettled, ...mutationOptions } = options || {};

  return {
    mutationFn: async (variables: V): Promise<T> => {
      try {
        const result = await mutationFn(variables);
        onSuccess?.(result, variables);
        return result;
      } catch (error) {
        const appError = handleError(error);
        onError?.(appError, variables);
        throw appError;
      } finally {
        onSettled?.();
      }
    },
    ...mutationOptions,
  };
}

/**
 * Query builder for API endpoints with error handling
 * NOTE: This is a configuration function, not a React hook
 */
export function buildQueryConfig<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  options?: {
    queryKey?: QueryKey;
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
  }
) {
  const { queryKey = [endpoint], ...queryOptions } = options || {};

  return {
    queryKey,
    queryFn: async () => {
      let response: APIResponse<T>;

      if (method === 'get' || method === 'delete') {
        response = await enhancedAPIClient[method](endpoint);
      } else {
        // For post, put, patch - we need to pass empty data since queries don't typically send data
        response = await enhancedAPIClient[method](endpoint, {});
      }

      return handleAPIResponse(response, {
        throwOnError: true,
      }) as T;
    },
    ...queryOptions,
  };
}

/**
 * Mutation builder for API endpoints with error handling
 * NOTE: This is a configuration function, not a React hook
 */
export function buildMutationConfig<T, V>(
  method: 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: AppError, variables: V) => void;
    onSettled?: () => void;
  }
) {
  return {
    mutationFn: async (variables: V) => {
      let response: APIResponse<T>;

      if (method === 'delete') {
        // DELETE doesn't take a data parameter
        response = await enhancedAPIClient[method](endpoint);
      } else {
        // POST, PUT, PATCH take data parameter
        response = await enhancedAPIClient[method](endpoint, variables);
      }

      return handleAPIResponse(response, {
        throwOnError: true,
      }) as T;
    },
    ...options,
  };
}

/**
 * Error boundary for React Query errors
 */
export function handleQueryError(
  error: unknown,
  context: {
    operation: string;
    queryKey?: QueryKey;
    userId?: string;
  }
): AppError {
  let appError: AppError;

  if (error instanceof Error) {
    appError = ErrorHandler.handleApiError(error);

    // Add context
    appError.details = {
      ...appError.details,
      operation: context.operation,
      queryKey: context.queryKey
        ? Array.isArray(context.queryKey)
          ? context.queryKey.join('.')
          : String(context.queryKey)
        : undefined,
      userId: context.userId,
    };
  } else {
    appError = ErrorHandler.createError(
      ErrorHandler.handleApiError(error as Error).type,
      String(error),
      ErrorHandler.handleApiError(error as Error).severity,
      {
        operation: context.operation,
        queryKey: context.queryKey
          ? Array.isArray(context.queryKey)
            ? context.queryKey.join('.')
            : String(context.queryKey)
          : undefined,
      }
    );
  }

  // Log the error
  ErrorLogger.log(appError);

  return appError;
}

/**
 * React Query error recovery strategies
 */
export class QueryErrorRecovery {
  /**
   * Recover from query errors
   */
  static async recover(
    error: AppError,
    queryClient: QueryClient,
    queryKey: QueryKey
  ): Promise<boolean> {
    try {
      // Invalidate and refetch the query
      await queryClient.invalidateQueries({ queryKey });

      // Wait for refetch to complete
      await queryClient.refetchQueries({ queryKey });

      return true;
    } catch (recoveryError) {
      logger.error(
        LogCategory.API,
        'Query recovery failed',
        recoveryError as Error,
        { originalError: error, queryKey }
      );
      return false;
    }
  }

  /**
   * Reset all queries after a critical error
   */
  static async resetAll(queryClient: QueryClient): Promise<void> {
    try {
      await queryClient.resetQueries();
      logger.info(LogCategory.API, 'All queries reset after critical error');
    } catch (error) {
      logger.error(
        LogCategory.API,
        'Failed to reset queries',
        error as Error
      );
    }
  }

  /**
   * Clear query cache for specific patterns
   */
  static async clearPattern(
    queryClient: QueryClient,
    pattern: string | RegExp
  ): Promise<void> {
    try {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      for (const query of queries) {
        const queryKeyStr = Array.isArray(query.queryKey)
          ? query.queryKey.join('.')
          : String(query.queryKey);

        const shouldClear =
          typeof pattern === 'string'
            ? queryKeyStr.includes(pattern)
            : pattern.test(queryKeyStr);

        if (shouldClear) {
          queryClient.removeQueries({ queryKey: query.queryKey });
        }
      }

      logger.info(LogCategory.API, `Cleared queries matching pattern: ${pattern}`);
    } catch (error) {
      logger.error(
        LogCategory.API,
        'Failed to clear query pattern',
        error as Error,
        { pattern }
      );
    }
  }
}

/**
 * Circuit breaker integration with React Query
 */
export function useQueryWithCircuitBreaker<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  circuitBreakerName: keyof typeof circuitBreakers = 'api',
  options?: {
    onCircuitOpen?: () => void;
    onCircuitClose?: () => void;
    onError?: (error: AppError) => void;
  }
) {
  const circuitBreaker = circuitBreakers[circuitBreakerName];

  return useEnhancedQuery<T>(
    queryKey,
    async () => {
      try {
        const result = await circuitBreaker.execute(queryFn);
        options?.onCircuitClose?.();
        return result;
      } catch (error) {
        const stats = circuitBreaker.getStats();

        if (stats.state === 'OPEN') {
          options?.onCircuitOpen?.();
          const appError = ErrorHandler.createError(
            ErrorHandler.handleApiError(error as Error).type,
            'Service temporarily unavailable. Please try again later.',
            ErrorHandler.handleApiError(error as Error).severity,
            { circuitBreaker: circuitBreakerName, stats }
          );
          options?.onError?.(appError);
          throw appError;
        }

        throw error;
      }
    },
    options
  );
}

/**
 * React Query performance monitoring
 */
export class QueryPerformanceMonitor {
  private static queryTimings = new Map<string, number[]>();

  static trackQuery(queryKey: QueryKey, duration: number) {
    const key = Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey);

    if (!this.queryTimings.has(key)) {
      this.queryTimings.set(key, []);
    }

    const timings = this.queryTimings.get(key)!;
    timings.push(duration);

    // Keep only last 100 timings
    if (timings.length > 100) {
      timings.shift();
    }

    // Log slow queries
    if (duration > 5000) {
      logger.warn(
        LogCategory.API,
        `Slow query detected: ${key} (${duration}ms)`,
        { queryKey: key, duration }
      );
    }
  }

  static getAverageTime(queryKey: QueryKey): number | null {
    const key = Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey);
    const timings = this.queryTimings.get(key);

    if (!timings || timings.length === 0) return null;

    const sum = timings.reduce((a, b) => a + b, 0);
    return sum / timings.length;
  }

  static getPercentile(queryKey: QueryKey, percentile: number = 95): number | null {
    const key = Array.isArray(queryKey) ? queryKey.join('.') : String(queryKey);
    const timings = this.queryTimings.get(key);

    if (!timings || timings.length === 0) return null;

    const sorted = [...timings].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[index];
  }
}
