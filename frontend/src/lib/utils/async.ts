/**
 * 异步工具函数
 * 消除代码中的重复模式
 */

/**
 * 延迟函数 - 替代重复的 setTimeout 模式
 * @param ms 延迟毫秒数
 * @returns Promise<void>
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带取消的延迟
 * @param ms 延迟毫秒数
 * @param signal AbortSignal 用于取消
 * @returns Promise<void>
 */
export function delayWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Delay aborted"));
    });
  });
}

/**
 * 重试函数包装器
 * @param fn 要重试的函数
 * @param maxRetries 最大重试次数
 * @param delayMs 重试延迟
 * @returns Promise<T>
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      await delay(delayMs * Math.pow(2, attempt)); // 指数退避
    }
  }

  throw lastError;
}

/**
 * 超时包装器
 * @param promise 要包装的Promise
 * @param timeoutMs 超时毫秒数
 * @returns Promise<T>
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
    ),
  ]);
}

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param wait 等待时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param limit 时间限制
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
