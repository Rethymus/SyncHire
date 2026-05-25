/**
 * Enhanced API Hook with Error Recovery
 * Demonstrates how to integrate useErrorRecovery with API calls
 */

import { useCallback, useState } from 'react';
import { useErrorRecovery, ErrorContext } from '@/hooks/useErrorRecovery';
import { logger, LogCategory } from '@/lib/logger';

export function useApiWithErrorRecovery() {
  const {
    error,
    isRetrying,
    retryCount,
    handleError,
    retry,
    clearError,
    setError,
    canRetry,
  } = useErrorRecovery();

  const [data, setData] = useState(null);

  /**
   * Execute API call with automatic error recovery
   */
  const executeWithErrorRecovery = useCallback(async (
    operation: () => Promise<any>,
    options?: {
      onSuccess?: (data: any) => void;
      onError?: (errorContext: ErrorContext) => void;
      skipRetry?: boolean;
    }
  ) => {
    clearError();

    try {
      const result = await operation();
      setData(result);
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const errorContext = handleError(error, 'API operation');
      options?.onError?.(errorContext);

      // Auto-retry if enabled and error is retryable
      if (!options?.skipRetry && errorContext.canRetry && retryCount < 3) {
        const retrySuccess = await retry(
          operation,
          () => {
            options?.onSuccess?.(data);
          }
        );

        if (retrySuccess) {
          return data;
        }
      }

      throw error;
    }
  }, [handleError, retry, retryCount, clearError, data, canRetry]);

  /**
   * Manual retry with user action
   */
  const manualRetry = useCallback(async (
    operation: () => Promise<any>,
    onSuccess?: (data: any) => void
  ) => {
    clearError();
    return executeWithErrorRecovery(operation, { onSuccess });
  }, [clearError, executeWithErrorRecovery]);

  return {
    data,
    error,
    isRetrying,
    retryCount,
    canRetry,
    executeWithErrorRecovery,
    manualRetry,
    clearError,
    handleError,
  };
}

/**
 * Example usage in a component:
 *
 * function MyComponent() {
 *   const { data, loading, error, isRetrying, canRetry, manualRetry, clearError } = useApiWithErrorRecovery();
 *
 *   const fetchData = async () => {
 *     await executeWithErrorRecovery(
 *       () => apiClient.get('/api/data'),
 *       {
 *         onSuccess: (data) => console.log('Success:', data),
 *         onError: (errorContext) => console.error('Error:', errorContext),
 *       }
 *     );
 *   };
 *
 *   return (
 *     <div>
 *       {loading && <LoadingSpinner />}
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
