/**
 * 增强版API客户端 - 与error-handler集成
 * 在现有api-client.ts基础上增强，不破坏现有功能
 */

import { ErrorHandler, ErrorLogger, ErrorType, ErrorSeverity, AppError } from "./error-handler";
import { addCSRFHeaders } from "./csrf";

interface APIResponse<T> {
  data?: T;
  error?: AppError;
  status: number;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retry?: number;
  skipErrorHandler?: boolean;
}

/**
 * 增强版API客户端类
 */
export class EnhancedAPIClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetry: number;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || "/api",
    timeout: number = 30000,
    retry: number = 3
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.defaultRetry = retry;
  }

  /**
   * 核心请求方法 - 集成统一错误处理
   */
  private async request<T>(
    endpoint: string,
    options: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retry = this.defaultRetry,
      skipErrorHandler = false,
      ...fetchOptions
    } = options;

    let lastError: Error | undefined;

    // 重试逻辑
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await this.executeRequest<T>(endpoint, {
          ...fetchOptions,
          timeout,
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        // 最后一次尝试或不可重试的错误，直接抛出
        if (attempt === retry || !this.isRetryable(lastError)) {
          break;
        }

        // 指数退避
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    // 所有重试都失败，使用统一错误处理
    if (!skipErrorHandler && lastError) {
      const appError = ErrorHandler.handleApiError(lastError);
      ErrorLogger.log(appError);

      return {
        error: appError,
        status: this.extractStatus(lastError),
      };
    }

    return {
      error: ErrorHandler.createError(
        ErrorType.UNKNOWN,
        lastError?.message || "请求失败",
        ErrorSeverity.MEDIUM
      ),
      status: 500,
    };
  }

  /**
   * 执行单个HTTP请求
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestConfig
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      // 添加CSRF保护到状态变更请求
      const needsCSRF = options.method !== "GET" && options.method !== "HEAD";
      const headers = needsCSRF
        ? addCSRFHeaders({
            "Content-Type": "application/json",
            ...options.headers,
          })
        : {
            "Content-Type": "application/json",
            ...options.headers,
          };

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "GET",
    });
  }

  /**
   * POST请求
   */
  async post<T>(
    endpoint: string,
    data: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT请求
   */
  async put<T>(
    endpoint: string,
    data: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "DELETE",
    });
  }

  /**
   * PATCH请求
   */
  async patch<T>(
    endpoint: string,
    data: unknown,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * 文件上传（不使用JSON）
   */
  async upload<T>(
    endpoint: string,
    file: File | FormData,
    config?: RequestConfig
  ): Promise<APIResponse<T>> {
    const formData = file instanceof File ? this.createFormData(file) : file;

    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      headers: {
        // 不设置Content-Type，让浏览器自动设置multipart/form-data边界
      },
      body: formData,
    });
  }

  // 私有辅助方法

  private isRetryable(error: Error): boolean {
    if (error.name === "AbortError") return false; // 超时不重试
    if (error.message.includes("400")) return false; // 客户端错误不重试
    if (error.message.includes("401")) return false; // 认证错误不重试
    if (error.message.includes("404")) return false; // 资源不存在不重试
    return true; // 网络错误和5xx错误可重试
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractStatus(error: Error): number {
    const match = error.message.match(/HTTP (\d+)/);
    return match ? parseInt(match[1], 10) : 500;
  }

  private createFormData(file: File): FormData {
    const formData = new FormData();
    formData.append("file", file);
    return formData;
  }
}

/**
 * 导出增强版API客户端实例
 */
export const apiClient = new EnhancedAPIClient();

/**
 * 导出增强版API类（用于测试）
 */

/**
 * API Hooks - React集成
 */
export function useAPIClient() {
  return {
    client: apiClient,

    /**
     * 带loading状态的请求
     */
    request: async <T>(
      requestFn: (client: EnhancedAPIClient) => Promise<APIResponse<T>>
    ) => {
      // TODO: 集成loading状态
      return requestFn(apiClient);
    },
  };
}
