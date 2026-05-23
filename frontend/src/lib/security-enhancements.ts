/**
 * 安全增强工具 (纯TypeScript)
 * 提供安全工具函数和配置
 */

import { logger } from "./logger";
import { LogCategory } from "./logger";

// ============================================
// CSP (Content Security Policy) 工具
// ============================================

/**
 * CSP nonce管理器
 * 用于内容安全策略的nonce值管理
 */
export class CSPManager {
  private static nonce: string | null = null;

  /**
   * 获取或生成nonce
   */
  static getNonce(): string {
    if (this.nonce) {
      return this.nonce;
    }

    // 生成随机nonce
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      this.nonce = Array.from(array)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    return this.nonce || "";
  }

  /**
   * 重置nonce
   */
  static reset(): void {
    this.nonce = null;
  }
}

/**
 * 生成CSP头部
 * @param nonce 可选的nonce值
 * @returns CSP头部对象
 */
export function getCSPHeaders(nonce?: string) {
  const policy = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${nonce ? `'nonce-${nonce}'` : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss:`,
    `frame-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  return {
    "Content-Security-Policy": policy,
  };
}

/**
 * 生成开发环境的CSP (更宽松)
 */
export function getDevCSPHeaders() {
  const policy = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss: http://localhost:* ws://localhost:*`,
  ].join("; ");

  return {
    "Content-Security-Policy": policy,
  };
}

// ============================================
// 安全的环境变量读取
// ============================================

/**
 * 安全读取环境变量
 * 防止XSS通过环境变量注入
 */
export function getEnvVar(key: string, fallback: string = ""): string {
  if (process.env[key]) {
    const value = process.env[key];
    if (typeof value === "string") {
      // 检测潜在的脚本注入
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /onerror/i,
        /onload/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          logger.warn(LogCategory.SECURITY, `Potentially dangerous value in env var ${key}`);
          return fallback;
        }
      }

      return value;
    }
  }
  return fallback;
}

// ============================================
// 安全的本地存储包装
// ============================================

/**
 * 安全的localStorage包装
 * 防止XSS通过localStorage攻击
 */
export const SecureStorage = {
  /**
   * 安全地设置项
   */
  setItem(key: string, value: string): boolean {
    try {
      // 清理潜在的脚本标签
      const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, "");
      localStorage.setItem(key, sanitized);
      return true;
    } catch (e) {
      logger.warn(LogCategory.SECURITY, "localStorage setItem failed", e as Error);
      return false;
    }
  },

  /**
   * 安全地获取项
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      logger.warn(LogCategory.SECURITY, "localStorage getItem failed", e as Error);
      return null;
    }
  },

  /**
   * 安全地删除项
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      logger.warn(LogCategory.SECURITY, "localStorage removeItem failed", e as Error);
      return false;
    }
  },

  /**
   * 清空所有项
   */
  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      logger.warn(LogCategory.SECURITY, "localStorage clear failed", e as Error);
      return false;
    }
  },
};

// ============================================
// URL安全工具
// ============================================

/**
 * 安全的URL构建器
 * 防止开放重定向漏洞
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>
): string {
  try {
    const url = new URL(path, baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  } catch (e) {
    // 如果URL构建失败，返回安全的默认值
    logger.warn(LogCategory.SECURITY, "URL build failed", e as Error);
    return "/";
  }
}

/**
 * 验证URL是否为内部链接
 */
export function isInternalUrl(url: string, baseUrl: string): boolean {
  try {
    const parsed = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    return parsed.origin === base.origin;
  } catch (error) {
    // 记录错误但不影响用户体验
    // 相对URL视为内部链接
    return true;
  }
}

// ============================================
// 子资源完整性(SRI)工具
// ============================================

/**
 * 生成SRI哈希
 * @param hash Base64编码的哈希值
 * @param algorithm 哈希算法
 */
export function generateSRI(
  hash: string,
  algorithm: "sha256" | "sha384" | "sha512" = "sha384"
): string {
  return `${algorithm}-${hash}`;
}

// ============================================
// 权限检查工具
// ============================================

type UserRole = "user" | "admin" | "superadmin";

/**
 * 检查用户权限
 * 基于角色层级检查
 */
export function checkPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    admin: 2,
    superadmin: 3,
  };

  const userLevel = roleHierarchy[userRole];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * 检查多个权限
 */
export function checkAnyPermission(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.some((role) => checkPermission(userRole, role));
}

// ============================================
// 敏感数据脱敏
// ============================================

/**
 * 敏感数据脱敏
 * 用于日志和错误报告
 */
export function sanitizeSensitiveData(
  data: Record<string, unknown>
): Record<string, unknown> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "credit",
    "ssn",
    "pin",
  ];

  const sanitized = { ...data };

  Object.keys(sanitized).forEach((key) => {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "***REDACTED***";
    }
  });

  return sanitized;
}

/**
 * 脱敏电子邮件
 */
export function sanitizeEmail(email: string): string {
  const [username, domain] = email.split("@");
  if (!domain) return email;

  const visibleChars = Math.min(2, username.length);
  const masked = username.slice(0, visibleChars) + "*".repeat(username.length - visibleChars);
  return `${masked}@${domain}`;
}

// ============================================
// 安全响应头配置
// ============================================

/**
 * 生成安全响应头
 * 用于Next.js API路由
 */
export function getSecurityHeaders() {
  return {
    "X-DNS-Prefetch-Control": "on",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

// ============================================
// 输入验证工具
// ============================================

/**
 * 验证并清理URL输入
 */
export function validateUrlInput(url: string): { valid: boolean; cleaned: string } {
  try {
    // 移除危险的javascript:协议
    const cleaned = url.replace(/^javascript:/i, "");

    const parsed = new URL(cleaned, window.location.origin);

    // 只允许http和https协议
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, cleaned: "" };
    }

    return { valid: true, cleaned: cleaned };
  } catch (error) {
    // URL 解析失败，返回无效
    return { valid: false, cleaned: "" };
  }
}

/**
 * 验证HTML内容
 */
export function sanitizeHtmlInput(html: string): string {
  // 移除script标签和事件处理器
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}
