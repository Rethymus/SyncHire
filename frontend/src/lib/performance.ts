import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 防抖Hook - 延迟执行函数
 * @param fn 要执行的函数
 * @param delay 延迟时间(ms)
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

/**
 * 节流Hook - 限制函数执行频率
 * @param fn 要执行的函数
 * @param limit 时间限制(ms)
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): T {
  const inThrottle = useRef<boolean>(false);
  const lastArgs = useRef<Parameters<T> | undefined>(undefined);

  return ((...args: Parameters<T>) => {
    lastArgs.current = args;

    if (!inThrottle.current) {
      fn(...lastArgs.current);
      inThrottle.current = true;

      setTimeout(() => {
        inThrottle.current = false;
        if (lastArgs.current) {
          fn(...lastArgs.current);
        }
      }, limit);
    }
  }) as T;
}

/**
 * 防止组件卸载后的状态更新
 */
export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * 检测用户是否偏好减弱动画
 */
export function useReducedMotion() {
  // Initialize state from media query to avoid setState in effect
  const mediaQuery = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(mediaQuery?.matches ?? false);

  useEffect(() => {
    if (!mediaQuery) return;

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [mediaQuery]);

  return prefersReducedMotion;
}

/**
 * 虚拟滚动Hook - 优化长列表渲染
 * @param items 列表项
 * @param itemHeight 每项高度
 * @param containerHeight 容器高度
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex,
  };
}
