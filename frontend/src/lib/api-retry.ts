/**
 * API Retry Wrapper
 * Automatic retry with exponential backoff for API calls
 */

import { logger, LogCategory } from './logger';
import {
  retryWithBackoff,
  calculateBackoff,
  type RetryConfig,
} from './error-recovery';
import { ErrorHandler, type AppError, ErrorType } from './error-handler';

/**
 * Enhanced retry configuration for API calls
 */
export interface ApiRetryConfig extends RetryConfig {
  retryCondition?: (error: AppError) => boolean;
  onRetry?: (attempt: number, error: AppError, delay: number) => void;
  onSuccess?: (attempt: number) => void;
  onError?: (error: AppError) => void;
}

const DEFAULT_API_RETRY_CONFIG: ApiRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.UNKNOWN],
  retryCondition: (error: AppError) => {
    // Retry on network errors and 5xx server errors
    return (
      error.type === ErrorType.NETWORK ||
      error.type === ErrorType.SERVER ||
      (error.details?.statusCode && (error.details.statusCode as number) >= 500)
    ) as boolean;
  },
};

/**
 * API function wrapper with retry
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: Partial<ApiRetryConfig> = {}
): T {
  const fullConfig = { ...DEFAULT_API_RETRY_CONFIG, ...config };

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error;

    for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
      try {
        const result = await fn(...args);

        // Call success callback
        if (attempt > 0) {
          fullConfig.onSuccess?.(attempt);
          logger.info(
            LogCategory.API,
            `API call succeeded after ${attempt} retries`
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const appError = ErrorHandler.handleApiError(error);

        // Check if we should retry
        const shouldRetry =
          attempt < fullConfig.maxAttempts - 1 &&
          (!fullConfig.retryCondition || fullConfig.retryCondition(appError));

        if (!shouldRetry) {
          break;
        }

        // Calculate delay
        const delay = calculateBackoff(attempt, fullConfig);

        // Call retry callback
        fullConfig.onRetry?.(attempt + 1, appError, delay);

        // Log retry
        logger.warn(
          LogCategory.API,
          `API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${fullConfig.maxAttempts})`,
          error
        );

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    fullConfig.onError?.(ErrorHandler.handleApiError(lastError!));
    throw lastError!;
  }) as T;
}

/**
 * Batch API calls with individual retry
 */
export async function batchApiCallsWithRetry<T>(
  calls: Array<() => Promise<T>>,
  config: Partial<ApiRetryConfig> = {}
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    calls.map((call) => withRetry(call, config)())
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      logger.error(
        LogCategory.API,
        `Batch API call ${index} failed after retries`,
        result.reason instanceof Error ? result.reason : new Error(String(result.reason))
      );
      return { success: false, error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)) };
    }
  });
}

/**
 * Sequential API calls with retry
 * Stop on first failure
 */
export async function sequentialApiCallsWithRetry<T>(
  calls: Array<() => Promise<T>>,
  config: Partial<ApiRetryConfig> = {}
): Promise<Array<{ success: boolean; data?: T; error?: Error }>> {
  const results: Array<{ success: boolean; data?: T; error?: Error }> = [];

  for (let i = 0; i < calls.length; i++) {
    try {
      const data = await withRetry(calls[i], config)();
      results.push({ success: true, data });
    } catch (error) {
      logger.error(
        LogCategory.API,
        `Sequential API call ${i} failed, stopping`,
        error instanceof Error ? error : new Error(String(error))
      );
      results.push({ success: false, error: error instanceof Error ? error : new Error(String(error)) });
      break; // Stop on first failure
    }
  }

  return results;
}

/**
 * API call with timeout and retry
 */
export function withTimeoutAndRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  timeout: number,
  retryConfig: Partial<ApiRetryConfig> = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    );

    const callWithTimeout = () =>
      Promise.race([fn(...args), timeoutPromise]);

    return withRetry(callWithTimeout, retryConfig)();
  }) as T;
}

/**
 * Debounced API call with retry
 */
export function debouncedApiCall<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number,
  retryConfig: Partial<ApiRetryConfig> = {}
): {
  fn: T;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<any> | null = null;

  const debouncedFn = (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await withRetry(fn, retryConfig)(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    }) as Promise<ReturnType<T>>;
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { fn: debouncedFn as T, cancel };
}

/**
 * Throttled API call with retry
 */
export function throttledApiCall<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limit: number,
  retryConfig: Partial<ApiRetryConfig> = {}
): T {
  let lastCall = 0;
  let pendingPromise: Promise<any> | null = null;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall < limit) {
      await new Promise((resolve) =>
        setTimeout(resolve, limit - timeSinceLastCall)
      );
    }

    lastCall = Date.now();
    return withRetry(fn, retryConfig)(...args);
  }) as T;
}

/**
 * Cached API call with retry
 */
const apiCache = new Map<string, { data: any; timestamp: number }>();

export function cachedApiCall<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  cacheKey: string,
  cacheDuration: number = 5 * 60 * 1000, // 5 minutes
  retryConfig: Partial<ApiRetryConfig> = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const cached = apiCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      logger.debug(LogCategory.API, `Cache hit for ${cacheKey}`);
      return cached.data;
    }

    const data = await withRetry(fn, retryConfig)(...args);

    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }) as T;
}

/**
 * Clear API cache
 */
export function clearApiCache(pattern?: string): void {
  if (pattern) {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  } else {
    apiCache.clear();
  }

  logger.debug(LogCategory.API, 'API cache cleared', { pattern });
}
