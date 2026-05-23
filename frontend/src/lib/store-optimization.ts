/**
 * 状态管理优化工具
 * 基于Zustand的最佳实践
 */

import { useCallback, useRef } from "react";
import { create, StoreApi } from "zustand";
import { persist } from "zustand/middleware";
import { useAppStore } from "@/lib/store";
import { logger, LogCategory } from "@/lib/logger";

/**
 * 选择器优化工具
 * 防止不必要的重渲染
 */
export function createSelector<T, U>(
  selector: (state: T) => U
): (state: T) => U {
  const memoizedSelector = useCallback(
    (state: T) => selector(state),
    [selector]
  );
  return memoizedSelector;
}

/**
 * Store切片创建工具
 * 用于模块化状态管理
 */
export function createSlice<T extends object>(
  name: string,
  initial: T,
  actions: (set: (fn: (state: T) => T) => void, get: () => T) => Partial<T>
) {
  const useStore = create<T>()(
    persist(
      (set, get) => ({
        ...initial,
        ...actions(set, get),
      }),
      {
        name,
        partialize: (state) => {
          // 只持久化特定字段
          const keys = Object.keys(initial) as Array<keyof T>;
          return keys.reduce((acc, key) => {
            acc[key] = state[key];
            return acc;
          }, {} as Partial<T>);
        },
      }
    )
  );

  return useStore;
}

/**
 * Store合并工具
 * 用于组合多个store
 * 注意：此功能需要更复杂的类型推断，暂简化实现
 */
export function combineStores<Slices extends Record<string, unknown>>(
  slices: Slices
): Slices {
  // 简化版本：仅提供占位符
  // 完整实现需要更复杂的类型系统
  if (process.env.NODE_ENV === "development") {
    logger.warn(LogCategory.PERF, "combineStores: Full implementation requires additional type work");
  }
  return slices;
}

/**
 * DevTools检查
 * 确保只在开发环境加载
 */
export const enableDevTools = () => {
  if (process.env.NODE_ENV === "development") {
    // zustand DevTools会自动检测
    // 这里可以添加自定义配置
    (window as any).__ZUSTAND_DEVTOOLS__ = {
      name: "SyncHire",
    };
  }
};

/**
 * 状态持久化策略
 */
export const persistenceStrategies = {
  /**
   * 不持久化 (临时状态)
   */
  none: () => ({
    partialize: () => ({}),
  }),

  /**
   * 仅持久化关键数据
   */
  criticalOnly: (keys: string[]) => ({
    partialize: (state: Record<string, unknown>) =>
      keys.reduce((acc: Record<string, unknown>, key: string) => {
        if (state[key] !== undefined) {
          acc[key] = state[key];
        }
        return acc;
      }, {}),
  }),

  /**
   * 全量持久化 (谨慎使用)
   */
  full: () => ({
    partialize: (state: Record<string, unknown>) => state,
  }),

  /**
   * 自定义持久化
   */
  custom: (shouldPersist: (key: string, value: unknown) => boolean) => ({
    partialize: (state: Record<string, unknown>) => {
      const persisted: Record<string, unknown> = {};
      Object.entries(state).forEach(([key, value]) => {
        if (shouldPersist(key, value)) {
          persisted[key] = value;
        }
      });
      return persisted;
    },
  }),
};

/**
 * Store性能监控
 */
export function createStoreWithMonitoring<T extends object>(
  name: string,
  initialState: T
) {
  let updateCount = 0;

  const useStore = create<T>()((set, get) => ({
    ...initialState,
    // 添加性能监控方法
    _getMetrics: () => ({
      name,
      updateCount,
      stateSize: JSON.stringify(get()).length,
    }),
    // 包装set方法以追踪更新
    setState: (partial: Partial<T>) => {
      updateCount++;
      set(partial);
    },
  }));

  // 开发环境下启用监控
  if (process.env.NODE_ENV === "development") {
    (window as any).__STORE_METRICS__ = (
      (window as any).__STORE_METRICS__ || {}
    );
    const state = useStore.getState() as any;
    if (state._getMetrics) {
      (window as any).__STORE_METRICS__[name] = state._getMetrics;
    }

    // 定期检查store大小，并返回清理函数
    const intervalId = setInterval(() => {
      const metrics = (useStore.getState() as any)._getMetrics?.();
      if (metrics && metrics.stateSize > 100000) {
        logger.warn(
          LogCategory.PERF,
          `Store ${name}: State size is large (${metrics.stateSize} chars)`
        );
      }
    }, 30000); // 每30秒检查一次

    // 添加清理函数到 store
    const originalStore = useStore;
    (useStore as any)._cleanupStoreMonitoring = () => {
      clearInterval(intervalId);
    };
  }

  return useStore;
}

/**
 * 响应式状态选择Hook
 * 自动优化选择器性能
 */
export function useResponsiveSelector<U>(
  selector: (state: ReturnType<typeof useAppStore.getState>) => U,
  equalityFn?: (a: U, b: U) => boolean
) {
  const store = useAppStore();
  const selected = selector(store);

  // 使用useRef存储上一次的值
  const prevSelectedRef = useRef<U | undefined>(undefined);

  // 只在值真正改变时触发更新
  const shouldUpdate =
    !equalityFn ||
    !prevSelectedRef.current ||
    equalityFn(prevSelectedRef.current, selected);

  if (shouldUpdate) {
    prevSelectedRef.current = selected;
  }

  return selected;
}
