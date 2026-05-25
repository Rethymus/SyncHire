import { useState, useEffect, useCallback } from "react";

interface UseSkeletonLoadingOptions {
  minDisplayTime?: number; // Minimum time to show skeleton (ms)
  delay?: number; // Delay before showing skeleton (ms)
}

interface UseSkeletonLoadingReturn {
  isLoading: boolean;
  isSkeletonVisible: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  resetLoading: () => void;
}

/**
 * Custom hook for managing skeleton loading states with minimum display time
 *
 * @param options - Configuration options
 * @returns Loading state and control functions
 *
 * @example
 * ```tsx
 * const { isLoading, isSkeletonVisible, startLoading, stopLoading } = useSkeletonLoading({
 *   minDisplayTime: 500,
 *   delay: 200,
 * });
 *
 * useEffect(() => {
 *   startLoading();
 *   fetchData().finally(stopLoading);
 * }, []);
 *
 * return (
 *   <div>
 *     {isSkeletonVisible ? <MySkeleton /> : <Content />}
 *   </div>
 * );
 * ```
 */
export function useSkeletonLoading(
  options: UseSkeletonLoadingOptions = {}
): UseSkeletonLoadingReturn {
  const { minDisplayTime = 500, delay = 150 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);

    // Show skeleton after delay to prevent flickering
    const delayTimer = setTimeout(() => {
      if (isLoading) {
        setIsSkeletonVisible(true);
        setLoadingStartTime(Date.now());
      }
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [delay, isLoading]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);

    // Ensure skeleton is visible for minimum time
    if (loadingStartTime) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          setIsSkeletonVisible(false);
          setLoadingStartTime(null);
        }, remainingTime);

        return () => clearTimeout(timer);
      }
    }

    setIsSkeletonVisible(false);
    setLoadingStartTime(null);
  }, [loadingStartTime, minDisplayTime]);

  const resetLoading = useCallback(() => {
    setIsLoading(false);
    setIsSkeletonVisible(false);
    setLoadingStartTime(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetLoading();
    };
  }, [resetLoading]);

  return {
    isLoading,
    isSkeletonVisible,
    startLoading,
    stopLoading,
    resetLoading,
  };
}

/**
 * Hook for managing skeleton loading with async operations
 *
 * @param asyncFn - Async function to execute
 * @param options - Configuration options
 * @returns Loading state and execute function
 *
 * @example
 * ```tsx
 * const { isLoading, isSkeletonVisible, execute, data } = useAsyncSkeleton(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   },
 *   { minDisplayTime: 500 }
 * );
 *
 * useEffect(() => {
 *   execute();
 * }, []);
 *
 * return (
 *   <div>
 *     {isSkeletonVisible ? <DataSkeleton /> : <DataDisplay data={data} />}
 *   </div>
 * );
 * ```
 */
export function useAsyncSkeleton<T>(
  asyncFn: () => Promise<T>,
  options: UseSkeletonLoadingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { isSkeletonVisible, startLoading, stopLoading, resetLoading } =
    useSkeletonLoading(options);

  const execute = useCallback(async () => {
    resetLoading();
    setError(null);
    startLoading();

    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      throw error;
    } finally {
      stopLoading();
    }
  }, [asyncFn, startLoading, stopLoading, resetLoading]);

  return {
    data,
    error,
    isSkeletonVisible,
    execute,
    isLoading: isSkeletonVisible,
  };
}