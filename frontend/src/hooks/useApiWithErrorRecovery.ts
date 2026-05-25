/**
 * Enhanced API Hook with Error Recovery
 * Demonstrates how to integrate error recovery with API calls
 */

import { useCallback, useState } from 'react';
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from '@/lib/error-recovery';
import { ErrorHandler, ErrorType } from '@/lib/error-handler';
import { logger, LogCategory } from '@/lib/logger';

export function useApiWithErrorRecovery() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Execute API call with automatic error recovery
   */
  const executeWithErrorRecovery = useCallback(async (
    operation: () => Promise<any>,
    options?: {
      onSuccess?: (data: any) => void;
      onError?: (error: any) => void;
      skipRetry?: boolean;
    }
  ) => {
    setError(null);
    setRetryCount(0);

    try {
      const result = await operation();
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      options?.onError?.(error);
      logger.error(LogCategory.UI, 'API operation failed', error);

      // Auto-retry if enabled and error is retryable
      if (!options?.skipRetry) {
        const appError = ErrorHandler.createError(
          ErrorType.UNKNOWN,
          error.message,
          'medium' as any,
          { originalError: error }
        );

        // Check if error is retryable
        if (DEFAULT_RETRY_CONFIG.retryableErrors.includes(appError.type as ErrorType)) {
          setIsRetrying(true);
          try {
            const result = await retryWithBackoff(
              operation,
              DEFAULT_RETRY_CONFIG,
              (attempt) => {
                setRetryCount(attempt);
                logger.info(LogCategory.UI, `Retrying API operation, attempt ${attempt}`);
              }
            );
            setData(result);
            setError(null);
            options?.onSuccess?.(result);
            return result;
          } catch (retryError) {
            setError(retryError as Error);
            throw retryError;
          } finally {
            setIsRetrying(false);
          }
        }
      }

      throw error;
    }
  }, []);

  /**
   * Manual retry with user action
   */
  const manualRetry = useCallback(async (
    operation: () => Promise<any>,
    onSuccess?: (data: any) => void
  ) => {
    setError(null);
    return executeWithErrorRecovery(operation, { onSuccess });
  }, [executeWithErrorRecovery]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    error,
    isRetrying,
    retryCount,
    canRetry: error !== null,
    executeWithErrorRecovery,
    manualRetry,
    clearError,
  };
}

/**
 * Example usage in a component:
 *
 * function MyComponent() {
 *   const { data, error, isRetrying, canRetry, manualRetry, clearError, executeWithErrorRecovery } = useApiWithErrorRecovery();
 *
 *   const fetchData = async () => {
 *     await executeWithErrorRecovery(
 *       () => apiClient.get('/api/data'),
 *       {
 *         onSuccess: (data) => console.log('Success:', data),
 *         onError: (error) => console.error('Error:', error),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <div>
 *       {error && (
 *         <ErrorRecovery
 *           error={error}
 *           isRetrying={isRetrying}
 *           onRetry={() => manualRetry(fetchData)}
 *           onDismiss={clearError}
 *         />
 *       )}
 *       {data && <DataDisplay data={data} />}
 *     </div>
 *   );
 * }
 */
