/**
 * CSRF (Cross-Site Request Forgery) Protection Utilities
 * 为API请求提供CSRF token管理
 */

import { logger } from "./logger";
import { LogCategory } from "./logger";

/**
 * 从meta标签获取CSRF token
 * Next.js通常在document中注入CSRF token
 */
export function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null;

  const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  return metaTag?.content || null;
}

/**
 * 从cookie获取CSRF token
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const csrfCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("csrf_token=")
  );

  if (!csrfCookie) return null;

  return csrfCookie.split("=")[1]?.trim() || null;
}

/**
 * 获取CSRF token（优先级: meta > cookie）
 */
export function getCSRFTokenHeader(): string | null {
  return getCSRFToken() || getCSRFTokenFromCookie();
}

/**
 * 为请求添加CSRF头
 */
export function addCSRFHeaders(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFTokenHeader();

  if (csrfToken) {
    return {
      ...headers,
      "X-CSRF-Token": csrfToken,
    };
  }

  return headers;
}

/**
 * 生成新的CSRF token (客户端占位符)
 * 实际token应由服务端生成
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch("/api/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("安全验证失败，请刷新页面重试");
    }

    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    logger.error(LogCategory.SECURITY, "Failed to fetch CSRF token", error as Error);
    throw error;
  }
}

/**
 * 初始化CSRF protection
 * 在应用启动时调用
 */
export async function initCSRFProtection(): Promise<void> {
  if (typeof window === "undefined") return;

  // 检查是否已有token
  if (!getCSRFTokenHeader()) {
    try {
      await fetchCSRFToken();
    } catch (error) {
      logger.warn(LogCategory.SECURITY, "CSRF token initialization failed", error);
    }
  }
}

/**
 * 验证CSRF token是否有效
 */
export function isCSRFTokenValid(): boolean {
  const token = getCSRFTokenHeader();
  return token !== null && token.length > 0;
}
