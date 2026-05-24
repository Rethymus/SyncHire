/**
 * Error Recovery Hook
 * Custom hook for handling errors with recovery strategies
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ErrorHandler,
  type AppError,
  ErrorType,
} from '@/lib/error-handler';
import {
  ErrorRecoveryStrategies,
  retryWithBackoff,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/error-recovery';

interface UseErrorRecoveryOptions {
  onError?: (error: AppError) => void;
  onRecovery?: () => void;
  retryConfig?: Partial<RetryConfig>;
  enableAutoRetry?: boolean;
}

interface UseErrorRecoveryReturn {
  error: AppError | null;
  isError: boolean;
  isRecovering: boolean;
  retryCount: number;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  recover: () => void;
  executeWithRetry: <T>(fn: () => Promise<T>) => Promise<T>;
}

export function useErrorRecovery(
  options: UseErrorRecoveryOptions = {}
): UseErrorRecoveryReturn {
  const {
    onError,
    onRecovery,
    retryConfig,
    enableAutoRetry = false,
  } = options;

  const [error, setError] = useState<AppError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Clear error on recovery
  const clearError = useCallback(() => {
    setError(null);
    setIsRecovering(false);
    setRetryCount(0);
  }, []);

  // Retry with exponential backoff
  const retry = useCallback(async () => {
    if (!error) return;

    setIsRecovering(true);
    setRetryCount((prev) => prev + 1);

    try {
      // Simulate retry logic - in real usage, this would re-execute the failed operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onRecovery?.();
      clearError();
    } catch (err) {
      // If retry fails, update error
      const appError = err as any as AppError;
      setError(appError);
    } finally {
      setIsRecovering(false);
    }
  }, [error, onRecovery, clearError]);

  // Handle error with recovery strategy
  const handleError = useCallback(
    (err: AppError) => {
      setError(err);
      onError?.(err);

      // Auto-retry for network errors if enabled
      if (
        enableAutoRetry &&
        (err.type === ErrorType.NETWORK || err.type === ErrorType.SERVER)
      ) {
        retry();
      }
    },
    [enableAutoRetry, onError, retry]
  );

  // Execute function with automatic retry
  const executeWithRetry = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsRecovering(true);

      try {
        const result = await retryWithBackoff(
          fn,
          retryConfig ? { ...DEFAULT_RETRY_CONFIG, ...retryConfig } : undefined,
          (attempt, err) => {
            setRetryCount(attempt);
            const appError = ErrorHandler.createError(
              ErrorType.NETWORK,
              err.message,
              'medium' as any,
              { attempt }
            );
            handleError(appError);
          }
        );

        setIsRecovering(false);
        setRetryCount(0);
        return result;
      } catch (err) {
        setIsRecovering(false);
        const appError = ErrorHandler.handleApiError(err);
        handleError(appError);
        throw err;
      }
    },
    [retryConfig, handleError]
  );

  // Manual recovery trigger
  const recover = useCallback(() => {
    if (error) {
      const strategy = ErrorRecoveryStrategies.getStrategy(error);
      const primaryAction = strategy.actions.find((a) => a.primary);

      if (primaryAction) {
        primaryAction.action();
      }

      onRecovery?.();
      clearError();
    }
  }, [error, onRecovery, clearError]);

  // Update error state
  const setErrorState = useCallback((err: AppError | null) => {
    if (err) {
      handleError(err);
    } else {
      clearError();
    }
  }, [handleError, clearError]);

  return {
    error,
    isError: error !== null,
    isRecovering,
    retryCount,
    setError: setErrorState,
    clearError,
    retry,
    recover,
    executeWithRetry,
  };
}

/**
 * Hook for API errors with automatic retry
 */
interface UseApiErrorRecoveryOptions extends UseErrorRecoveryOptions {
  showNotification?: boolean;
}

export function useApiErrorRecovery(
  options: UseApiErrorRecoveryOptions = {}
) {
  const { showNotification = true, ...rest } = options;
  const errorRecovery = useErrorRecovery(rest);

  useEffect(() => {
    if (errorRecovery.error && showNotification) {
      // You could integrate with a toast/notification system here
      console.error('API Error:', errorRecovery.error.message);
    }
  }, [errorRecovery.error, showNotification]);

  return {
    ...errorRecovery,
    // Additional API-specific methods
    handleApiError: useCallback(
      (err: unknown) => {
        const appError = ErrorHandler.handleApiError(err);
        errorRecovery.setError(appError);
      },
      [errorRecovery]
    ),
  };
}

/**
 * Hook for form validation errors
 */
export function useFormErrorRecovery() {
  const [fieldErrors, setFieldErrors] = useState<Map<string, string>>(
    new Map()
  );

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors((prev) => new Map(prev).set(field, message));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      const next = new Map(prev);
      next.delete(field);
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors(new Map());
  }, []);

  const hasErrors = fieldErrors.size > 0;
  const getError = useCallback(
    (field: string) => fieldErrors.get(field),
    [fieldErrors]
  );

  return {
    fieldErrors,
    hasErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getError,
  };
}
