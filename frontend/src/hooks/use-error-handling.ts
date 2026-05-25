/**
 * Custom hook for handling API errors with retry logic and user feedback
 */

import { useState, useCallback, useEffect } from "react";
import { ErrorHandler, ErrorLogger, AppError, ErrorType } from "@/lib/error-handler";
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from "@/lib/error-recovery";
import { logger, LogCategory } from "@/lib/logger";

interface UseErrorHandlingOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  onSuccess?: () => void;
}

interface UseErrorHandlingReturn {
  error: AppError | null;
  isError: boolean;
  isLoading: boolean;
  retryCount: number;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  executeWithErrorHandling: <T>(
    fn: () => Promise<T>,
    context?: string
  ) => Promise<T | null>;
  retry: () => void;
  reset: () => void;
}

/**
 * Hook for handling errors with retry logic
 *
 * Usage:
 * ```tsx
 * const { error, isError, executeWithErrorHandling, retry } = useErrorHandling({
 *   enableRetry: true,
 *   maxRetries: 3,
 *   onError: (error) => console.error('Operation failed:', error)
 * });
 *
 * const fetchData = async () => {
 *   const result = await executeWithErrorHandling(
 *     () => api.getData(),
 *     'fetching data'
 *   );
 *   if (result) {
 *     // Handle success
 *   }
 * };
 * ```
 */
export function useErrorHandling(
  options: UseErrorHandlingOptions = {}
): UseErrorHandlingReturn {
  const {
    enableRetry = true,
    maxRetries = 3,
    onError,
    onSuccess,
  } = options;

  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFunction, setLastFunction] = useState<(() => Promise<any>) | null>(null);

  // Clear error on unmount
  useEffect(() => {
    return () => {
      if (error) {
        ErrorLogger.log(error);
      }
    };
  }, [error]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const executeWithErrorHandling = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      context?: string
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        let result: T;

        if (enableRetry) {
          // Execute with retry logic
          result = await retryWithBackoff(
            fn,
            {
              ...DEFAULT_RETRY_CONFIG,
              maxAttempts: maxRetries + 1, // +1 for initial attempt
            },
            (attempt, err) => {
              setRetryCount(attempt);
              logger.warn(
                LogCategory.API,
                `Retry attempt ${attempt} for ${context || "operation"}`,
                err
              );
            }
          );
        } else {
          // Execute without retry
          result = await fn();
        }

        // Success
        setRetryCount(0);
        onSuccess?.();
        return result;

      } catch (err) {
        const appError = ErrorHandler.handleApiError(err);
        setError(appError);
        ErrorLogger.log(appError);

        logger.error(
          LogCategory.API,
          `Operation failed${context ? `: ${context}` : ""}`,
          err as Error,
          { retryCount, appError }
        );

        onError?.(appError);
        return null;

      } finally {
        setIsLoading(false);
        setLastFunction(() => fn);
      }
    },
    [enableRetry, maxRetries, onError, onSuccess, retryCount]
  );

  const retry = useCallback(async () => {
    if (lastFunction && error) {
      logger.info(LogCategory.API, "Manual retry triggered");
      await executeWithErrorHandling(lastFunction);
    }
  }, [lastFunction, error, executeWithErrorHandling]);

  const reset = useCallback(() => {
    clearError();
    setRetryCount(0);
    setLastFunction(null);
  }, [clearError]);

  return {
    error,
    isError: error !== null,
    isLoading,
    retryCount,
    setError,
    clearError,
    executeWithErrorHandling,
    retry,
    reset,
  };
}

/**
 * Hook for handling form submission errors
 */
export function useFormErrorHandling(options: UseErrorHandlingOptions = {}) {
  const { error, isError, setError, clearError, executeWithErrorHandling } =
    useErrorHandling({
      ...options,
      enableRetry: false, // Don't retry form submissions
    });

  const handleSubmit = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      onSuccess?: (result: T) => void
    ): Promise<boolean> => {
      const result = await executeWithErrorHandling(fn, "form submission");

      if (result !== null) {
        onSuccess?.(result);
        return true;
      }

      return false;
    },
    [executeWithErrorHandling]
  );

  return {
    error,
    isError,
    setError,
    clearError,
    handleSubmit,
  };
}

/**
 * Hook for handling file upload errors
 */
export function useFileUploadErrorHandling(options: UseErrorHandlingOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { error, isError, setError, clearError, executeWithErrorHandling } =
    useErrorHandling(options);

  const uploadFile = useCallback(
    async <T,>(
      fn: (progress: (progress: number) => void) => Promise<T>,
      onSuccess?: (result: T) => void
    ): Promise<boolean> => {
      setUploadProgress(0);

      const result = await executeWithErrorHandling(
        () =>
          fn((progress) => {
            setUploadProgress(progress);
          }),
        "file upload"
      );

      if (result !== null) {
        setUploadProgress(100);
        onSuccess?.(result);
        return true;
      }

      setUploadProgress(0);
      return false;
    },
    [executeWithErrorHandling]
  );

  return {
    error,
    isError,
    uploadProgress,
    setError,
    clearError,
    uploadFile,
  };
}

/**
 * Hook for handling async operation errors with timeout
 */
export function useAsyncErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options: UseErrorHandlingOptions & { timeout?: number } = {}
) {
  const { timeout = 30000, ...errorHandlingOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const {
    error,
    isError,
    isLoading,
    executeWithErrorHandling,
    clearError,
  } = useErrorHandling(errorHandlingOptions);

  const execute = useCallback(async () => {
    clearError();

    const result = await executeWithErrorHandling(
      () =>
        Promise.race([
          asyncFn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Operation timed out after ${timeout}ms`)),
              timeout
            )
          ),
        ]),
      "async operation"
    );

    if (result !== null) {
      setData(result);
      return result;
    }

    return null;
  }, [asyncFn, timeout, executeWithErrorHandling, clearError]);

  return {
    data,
    error,
    isError,
    isLoading,
    execute,
    clearError,
  };
}

/**
 * Hook for handling multiple concurrent errors
 */
export function useMultipleErrorHandling() {
  const [errors, setErrors] = useState<Map<string, AppError>>(new Map());

  const setError = useCallback((key: string, error: AppError | null) => {
    setErrors((prev) => {
      const next = new Map(prev);
      if (error) {
        next.set(key, error);
        ErrorLogger.log(error);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const clearError = useCallback((key: string) => {
    setError(key, null);
  }, [setError]);

  const clearAllErrors = useCallback(() => {
    setErrors(new Map());
  }, []);

  const hasErrors = errors.size > 0;
  const errorCount = errors.size;
  const firstError = errors.size > 0 ? Array.from(errors.values())[0] : null;

  return {
    errors,
    errorCount,
    hasErrors,
    firstError,
    setError,
    clearError,
    clearAllErrors,
  };
}
