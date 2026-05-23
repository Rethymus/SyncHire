/**
 * 性能优化Hook集合
 * 基于React性能最佳实践
 */

"use client";

import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 智能缓存Hook
 * 带时间戳的自动失效缓存
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5分钟默认
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cached = cacheRef.current.get(key);

    // 如果有缓存且未过期，直接返回
    if (cached && !forceRefresh) {
      const now = Date.now();
      if (now - cached.timestamp < ttl) {
        setData(cached.data);
        return;
      }
    }

    setLoading(true);
    try {
      const result = await fetcher();
      cacheRef.current.set(key, { data: result, timestamp: Date.now() });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cacheRef.current.delete(key);
    setData(null);
  }, [key]);

  return { data, loading, error, refresh, invalidate };
}

/**
 * 虚拟滚动列表Hook
 * 优化长列表渲染性能
 */
interface VirtualScrollItem {
  id: string;
  [key: string]: unknown;
}

export function useVirtualScroll<T extends VirtualScrollItem>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5); // 预渲染5个
  const endIndex = Math.min(items.length, startIndex + visibleCount + 10); // 预渲染10个

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    offsetY,
    totalHeight,
    handleScroll,
    containerRef,
    setContainerRef,
  };
}

/**
 * 防抖滚动Hook
 * 优化滚动事件处理
 */
export function useScrollDebounce(callback: () => void, delay: number = 100) {
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (Math.abs(currentScrollY - lastScrollY) > 10) {
        if (!isScrolling) {
          setIsScrolling(true);
        }

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback();
          setIsScrolling(false);
        }, delay);

        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback, delay, isScrolling]);

  return { isScrolling };
}

/**
 * 智能预取Hook
 * 预测用户可能访问的页面
 */
export function usePrefetch() {
  const prefetchQueue = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute("href");
            if (href && !prefetchQueue.current.has(href)) {
              prefetchQueue.current.add(href);
              router.prefetch(href);
            }
          }
        });
      },
      { rootMargin: "50px" }
    );

    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach((link) => {
      observerRef.current?.observe(link);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const prefetch = useCallback((href: string) => {
    if (!prefetchQueue.current.has(href)) {
      prefetchQueue.current.add(href);
      // 实际预取逻辑
    }
  }, []);

  return { prefetch };
}

/**
 * 资源预加载Hook
 * 关键资源优先加载
 */
export function usePreload() {
  const preloadQueue = useRef<Set<string>>(new Set());

  const preload = useCallback((href: string) => {
    if (!preloadQueue.current.has(href)) {
      preloadQueue.current.add(href);
      // 使用<link rel="preload"> 预加载
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "fetch";
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  const preloadComponent = useCallback((componentPath: string) => {
    const key = `component:${componentPath}`;
    if (!preloadQueue.current.has(key)) {
      preloadQueue.current.add(key);
      // 动态导入预加载
      import(/* @vite-ignore */ componentPath);
    }
  }, []);

  return { preload, preloadComponent };
}

/**
 * 内存泄漏防护Hook
 * 自动清理副作用
 */
export function useCleanupEffect(
  effect: () => (() => void) | void,
  deps?: React.DependencyList
) {
  useEffect(() => {
    const cleanup = effect();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, deps);
}

/**
 * 批量更新优化Hook
 * 防止多次状态更新导致重渲染
 */
export function useBatchUpdates() {
  const [isPending, startBatch] = useState(false);
  const queue = useRef<(() => void)[]>([]);

  const batch = useCallback((fn: () => void) => {
    queue.current.push(fn);

    if (!isPending) {
      startBatch(true);

      // 使用requestIdleCallback或setTimeout延迟执行
      const executeBatch = () => {
        const updates = queue.current;
        queue.current = [];

        // 批量执行
        updates.forEach((update) => update());
        startBatch(false);
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => {
          setTimeout(executeBatch, 0);
        });
      } else {
        setTimeout(executeBatch, 0);
      }
    }
  }, [isPending, startBatch]);

  return { batch, isPending };
}

/**
 * 智能组件懒加载Hook
 * 基于视口和用户行为
 */
export function useSmartLazy(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  options?: {
    trigger?: "viewport" | "hover" | "click";
    threshold?: number;
  }
) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (options?.trigger === "viewport" && elementRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadComponent();
            observer.disconnect();
          }
        },
        { threshold: options.threshold || 0.1 }
      );

      observer.observe(elementRef.current);
      return () => observer.disconnect();
    }
  }, [options?.trigger, options?.threshold]);

  const loadComponent = useCallback(async () => {
    if (Component || loading) return;

    setLoading(true);
    try {
      const module = await importFn();
      setComponent(() => module.default);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [Component, loading, importFn]);

  const loadOnHover = useCallback(() => {
    if (!Component && !loading) {
      loadComponent();
    }
  }, [Component, loading, loadComponent]);

  return {
    Component,
    loading,
    error,
    loadComponent,
    loadOnHover,
    elementRef,
  };
}

/**
 * 状态选择器Hook
 * 优化Zustand状态选择，减少重渲染
 */
export function createSelectorHook<T, U>(
  selector: (state: T) => U
): (state: T) => U {
  return useMemo(() => selector, [selector]);
}
