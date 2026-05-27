/**
 * Optimistic UI Updates
 *
 * Provides utilities for instant UI updates before API confirmation,
 * with automatic rollback on errors and smart cache invalidation.
 */

'use client';

import { QueryClient, useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { logger, LogCategory } from './logger';

/**
 * Optimistic update context for rollback
 */
interface OptimisticContext<T> {
  previousData?: T;
  rollbackData?: T;
  timestamp: number;
}

/**
 * Options for optimistic updates
 */
interface OptimisticUpdateOptions<TData, TVariables, TError> {
  queryKey: readonly unknown[];
  updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
  onError?: (error: TError, variables: TVariables, context?: OptimisticContext<TData>) => void;
  onSuccess?: (data: TData, variables: TVariables, context?: OptimisticContext<TData>) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context?: OptimisticContext<TData> | undefined) => void;
  invalidateQueries?: readonly unknown[][];
}

/**
 * Create an optimistic mutation with automatic rollback
 */
export function createOptimisticMutation<TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticUpdateOptions<TData, TVariables, TError>,
  queryClient: QueryClient
) {
  const {
    queryKey,
    updateFn,
    onError: customOnError,
    onSuccess: customOnSuccess,
    onSettled: customOnSettled,
    invalidateQueries = [],
  } = options;

  return {
    mutationFn,
    onMutate: async (variables: TVariables): Promise<OptimisticContext<TData>> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => updateFn(old, variables));

      // Return context with previous value for rollback
      return {
        previousData,
        rollbackData: previousData,
        timestamp: Date.now(),
      };
    },
    onError: (error: TError, variables: TVariables, context?: OptimisticContext<TData>) => {
      // Rollback to previous value
      if (context?.previousData) {
        queryClient.setQueryData<TData>(queryKey, context.previousData);
        logger.warn(LogCategory.UI, 'Optimistic update rolled back', {
          error,
          queryKey,
          variables,
          rollbackDuration: Date.now() - context.timestamp,
        });
      }

      // Call custom error handler
      customOnError?.(error, variables, context);
    },
    onSuccess: (data: TData, variables: TVariables, context?: OptimisticContext<TData>) => {
      // Log successful update
      logger.info(LogCategory.UI, 'Optimistic update confirmed', {
        queryKey,
        variables,
        updateDuration: Date.now() - (context?.timestamp || Date.now()),
      });

      // Call custom success handler
      customOnSuccess?.(data, variables, context);

      // Invalidate related queries
      invalidateQueries.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
    onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context?: OptimisticContext<TData> | undefined) => {
      // Call custom settled handler
      customOnSettled?.(data, error, variables, context);
    },
  };
}

/**
 * React Hook for optimistic mutations
 */
export function useOptimisticMutation<TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticUpdateOptions<TData, TVariables, TError>
) {
  const queryClient = useQueryClient();
  const config = createOptimisticMutation(mutationFn, options, queryClient);

  return useMutation<TData, TError, TVariables, OptimisticContext<TData>>(config);
}

/**
 * Rollback function for manual error handling
 */
export function rollbackOnError<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  error: Error,
  context?: OptimisticContext<T>
) {
  if (context?.previousData) {
    queryClient.setQueryData<T>(queryKey, context.previousData);
    logger.warn(LogCategory.UI, 'Manual rollback triggered', {
      error,
      queryKey,
      rollbackDuration: Date.now() - context.timestamp,
    });
  }
}

/**
 * Update cache manually with optimistic data
 */
export function updateCache<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  newData: T | ((old: T | undefined) => T)
) {
  queryClient.setQueryData<T>(queryKey, newData);
  logger.info(LogCategory.UI, 'Cache updated manually', { queryKey });
}

/**
 * Smart cache invalidation with related queries
 */
export function invalidateRelated(
  queryClient: QueryClient,
  baseQueryKey: readonly unknown[],
  patterns: (string | RegExp)[]
) {
  // Invalidate base query
  queryClient.invalidateQueries({ queryKey: baseQueryKey });

  // Invalidate related queries by pattern
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  for (const query of queries) {
    const queryKeyStr = Array.isArray(query.queryKey)
      ? query.queryKey.join('.')
      : String(query.queryKey);

    for (const pattern of patterns) {
      const shouldInvalidate =
        typeof pattern === 'string'
          ? queryKeyStr.includes(pattern)
          : pattern.test(queryKeyStr);

      if (shouldInvalidate) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
        logger.info(LogCategory.UI, 'Related query invalidated', {
          queryKey: query.queryKey,
          pattern,
        });
      }
    }
  }
}

/**
 * Conflict detection and resolution
 */
export class ConflictResolver {
  /**
   * Detect conflicts between local and remote data
   */
  static detectConflict<T>(
    localData: T,
    remoteData: T,
    updatedAtField: keyof T = 'updatedAt' as keyof T
  ): boolean {
    if (!localData || !remoteData) return false;

    const localUpdated = new Date(localData[updatedAtField] as any);
    const remoteUpdated = new Date(remoteData[updatedAtField] as any);

    return remoteUpdated > localUpdated;
  }

  /**
   * Resolve conflicts with custom strategy
   */
  static resolveConflict<T>(
    localData: T,
    remoteData: T,
    strategy: 'local' | 'remote' | 'merge' = 'remote',
    mergeFn?: (local: T, remote: T) => T
  ): T {
    switch (strategy) {
      case 'local':
        return localData;
      case 'remote':
        return remoteData;
      case 'merge':
        return mergeFn ? mergeFn(localData, remoteData) : remoteData;
      default:
        return remoteData;
    }
  }
}

/**
 * Batch optimistic updates
 */
export function createBatchOptimisticMutation<TData, TVariables, TError = Error>(
  mutationFn: (variables: TVariables[]) => Promise<TData>,
  options: {
    queryKeys: readonly unknown[][];
    updateFn: (oldData: TData | undefined, variables: TVariables[]) => TData;
    onError?: (error: TError, variables: TVariables[]) => void;
    onSuccess?: (data: TData, variables: TVariables[]) => void;
  },
  queryClient: QueryClient
) {
  const { queryKeys, updateFn, onError, onSuccess } = options;

  return {
    mutationFn,
    onMutate: async (variables: TVariables[]) => {
      // Cancel all related queries
      await Promise.all(
        queryKeys.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot previous values
      const previousData = queryKeys.map((key) =>
        queryClient.getQueryData<TData>(key)
      );

      // Optimistically update all queries
      queryKeys.forEach((key) => {
        queryClient.setQueryData<TData>(key, (old) => updateFn(old, variables));
      });

      return { previousData, timestamp: Date.now() };
    },
    onError: (error: TError, variables: TVariables[], context: any) => {
      // Rollback all queries
      queryKeys.forEach((key, index) => {
        if (context.previousData[index]) {
          queryClient.setQueryData<TData>(key, context.previousData[index]);
        }
      });

      logger.warn(LogCategory.UI, 'Batch optimistic update rolled back', {
        error,
        queryKeys,
        variables,
      });

      onError?.(error, variables);
    },
    onSuccess: (data: TData, variables: TVariables[]) => {
      logger.info(LogCategory.UI, 'Batch optimistic update confirmed', {
        queryKeys,
        variables,
      });

      onSuccess?.(data, variables);

      // Invalidate related queries
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  };
}

/**
 * Optimistic update helper for array operations
 */
export class ArrayUpdateHelper {
  /**
   * Add item to array optimistically
   */
  static addItem<T>(array: T[] | undefined, item: T): T[] {
    return [...(array || []), item];
  }

  /**
   * Update item in array optimistically
   */
  static updateItem<T>(
    array: T[] | undefined,
    itemId: string,
    updates: Partial<T>,
    idField: keyof T = 'id' as keyof T
  ): T[] {
    return (array || []).map((item) =>
      (item as any)[idField] === itemId ? { ...item, ...updates } : item
    );
  }

  /**
   * Delete item from array optimistically
   */
  static deleteItem<T>(array: T[] | undefined, itemId: string, idField: keyof T = 'id' as keyof T): T[] {
    return (array || []).filter((item) => (item as any)[idField] !== itemId);
  }

  /**
   * Reorder items in array optimistically
   */
  static reorderItems<T>(array: T[] | undefined, fromIndex: number, toIndex: number): T[] {
    const items = [...(array || [])];
    const [removed] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, removed);
    return items;
  }
}

/**
 * Loading state utilities for optimistic updates
 */
export class OptimisticLoadingHelper {
  /**
   * Add loading state to item
   */
  static withLoading<T>(item: T, isLoading: boolean = true): T & { _isLoading: boolean } {
    return { ...item, _isLoading: isLoading } as T & { _isLoading: boolean };
  }

  /**
   * Remove loading state from item
   */
  static withoutLoading<T>(item: T & { _isLoading?: boolean }): T {
    const { _isLoading, ...rest } = item as any;
    return rest as T;
  }

  /**
   * Check if item is loading
   */
  static isLoading<T>(item: T & { _isLoading?: boolean }): boolean {
    return !!item._isLoading;
  }
}
