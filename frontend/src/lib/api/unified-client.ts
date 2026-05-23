/**
 * Unified API Client
 * Merges api-client.ts and api-client-v2.ts
 * Includes enhanced error handling and CSRF protection
 */

import { ErrorHandler, ErrorLogger, ErrorType, ErrorSeverity, AppError } from "../error-handler";
import { addCSRFHeaders } from "../csrf";
import { logger } from "../logger";
import { LogCategory } from "../logger";

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
 * Unified API Client with enhanced features
 */
export class UnifiedAPIClient {
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
   * Core request method with retry logic and error handling
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

    // Retry logic
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const result = await this.executeRequest<T>(endpoint, {
          ...fetchOptions,
          timeout,
        });

        return result;
      } catch (error) {
        lastError = error as Error;

        // Last attempt or non-retryable error
        if (attempt === retry || !this.isRetryable(lastError)) {
          break;
        }

        // Exponential backoff
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    // All retries failed - use unified error handling
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
   * Execute individual HTTP request with CSRF protection
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestConfig
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      // Add CSRF protection to state-changing requests
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
   * GET request
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
   * POST request
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
   * PUT request
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
   * DELETE request
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
   * PATCH request
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
   * File upload
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
        // Don't set Content-Type for FormData - browser handles it
      },
      body: formData,
    });
  }

  // Private helper methods

  private isRetryable(error: Error): boolean {
    if (error.name === "AbortError") return false; // Timeout
    if (error.message.includes("400")) return false; // Client error
    if (error.message.includes("401")) return false; // Auth error
    if (error.message.includes("404")) return false; // Not found
    return true; // Network errors and 5xx errors
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
 * Export unified API client instance
 */
export const apiClient = new UnifiedAPIClient();

/**
 * Export for testing
 */
export { UnifiedAPIClient as APIClient };

/**
 * Default export for backwards compatibility
 */
export default apiClient;
