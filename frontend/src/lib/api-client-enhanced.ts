/**
 * Enhanced API Client with Circuit Breaker and Comprehensive Error Handling
 */

import { getCSRFTokenHeader, addCSRFHeaders } from './csrf';
import { getAccessToken, refreshAccessToken, clearAuthData } from './auth';
import { logger, LogCategory } from './logger';
import { ErrorHandler, ErrorType, AppError } from './error-handler';
import { circuitBreakers } from './circuit-breaker';
import { retryWithBackoff, DEFAULT_RETRY_CONFIG } from './error-recovery';

interface APIResponse<T> {
  data?: T;
  error?: APIError;
  status: number;
}

interface APIError {
  code: string;
  message: string;
  details?: unknown;
  error_id?: string;
}

interface EnhancedRequestOptions {
  timeout?: number;
  retries?: number;
  useCircuitBreaker?: boolean;
  circuitBreakerName?: keyof typeof circuitBreakers;
  skipAuth?: boolean;
}

interface APIErrorDetails {
  errorId?: string;
  statusCode: number;
  errorType: ErrorType;
  retryable: boolean;
  userMessage: string;
}

class EnhancedAPIClient {
  private baseURL: string;
  private defaultTimeout: number;
  private defaultRetries: number;

  constructor(
    baseURL: string = process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: number = 30000,
    retries: number = 3
  ) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
    this.defaultRetries = retries;
  }

  /**
   * Enhanced request method with circuit breaker and retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    enhancedOptions: EnhancedRequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      useCircuitBreaker = true,
      circuitBreakerName = 'api',
      skipAuth = false,
    } = enhancedOptions;

    const circuitBreaker = circuitBreakers[circuitBreakerName];

    // Execute with circuit breaker
    return circuitBreaker.execute(async () => {
      return retryWithBackoff(
        () => this.executeRequest<T>(endpoint, options, timeout, skipAuth),
        {
          ...DEFAULT_RETRY_CONFIG,
          maxAttempts: retries + 1,
        },
        (attempt, error) => {
          logger.warn(
            LogCategory.API,
            `API request retry ${attempt}/${retries} for ${endpoint}`,
            error
          );
        }
      );
    });
  }

  /**
   * Execute the actual HTTP request
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit,
    timeout: number,
    skipAuth: boolean
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      // Add auth token if not skipped
      if (!skipAuth) {
        const token = getAccessToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }

      // Make request
      let response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      // Handle 401 - try to refresh token
      if (response.status === 401 && !skipAuth && getAccessToken()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers,
          });
        } else {
          // Token refresh failed, clear auth data
          clearAuthData();
          return this.createErrorResponse(
            401,
            'AUTHENTICATION_FAILED',
            'Authentication failed. Please login again.'
          );
        }
      }

      // Parse response
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        return this.createErrorResponse(
          response.status,
          errorData.code || `HTTP_${response.status}`,
          errorData.message || `HTTP error! status: ${response.status}`,
          errorData.details,
          errorData.error_id
        );
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return this.createErrorResponse(
            408,
            'REQUEST_TIMEOUT',
            'Request timeout. Please try again.'
          );
        }

        // Handle network errors
        const appError = ErrorHandler.handleApiError(error);
        return this.createErrorResponse(
          0,
          appError.type,
          appError.message,
          appError.details
        );
      }

      return this.createErrorResponse(
        500,
        'UNKNOWN_ERROR',
        'An unknown error occurred'
      );
    }
  }

  /**
   * Parse error response from server
   */
  private async parseErrorResponse(response: Response): Promise<APIError> {
    try {
      const data = await response.json();
      if (data.error) {
        return {
          code: data.error.code || 'UNKNOWN_ERROR',
          message: data.error.message || 'An error occurred',
          details: data.error.details,
          error_id: data.error.error_id,
        };
      }
    } catch {
      // If parsing fails, use default error
    }

    return {
      code: `HTTP_${response.status}`,
      message: `HTTP error! status: ${response.status}`,
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse<T>(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
    errorId?: string
  ): APIResponse<T> {
    const error: APIError = {
      code,
      message,
      details,
      error_id: errorId,
    };

    logger.error(
      LogCategory.API,
      `API Error [${code}]: ${message}`,
      undefined,
      { statusCode, details, errorId }
    );

    return {
      error,
      status: statusCode,
    };
  }

  /**
   * Get detailed error information
   */
  getErrorDetails(response: APIResponse<unknown>): APIErrorDetails | null {
    if (!response.error) return null;

    const statusCode = response.status;
    const errorType = this.getErrorType(statusCode, response.error.code);
    const retryable = this.isRetryable(statusCode, response.error.code);

    return {
      errorId: response.error.error_id,
      statusCode,
      errorType,
      retryable,
      userMessage: response.error.message,
    };
  }

  /**
   * Map status code to error type
   */
  private getErrorType(statusCode: number, errorCode: string): ErrorType {
    if (statusCode === 401 || statusCode === 403) return ErrorType.AUTH;
    if (statusCode === 404) return ErrorType.NOT_FOUND;
    if (statusCode >= 400 && statusCode < 500) return ErrorType.VALIDATION;
    if (statusCode >= 500) return ErrorType.SERVER;
    if (statusCode === 0) return ErrorType.NETWORK;
    return ErrorType.UNKNOWN;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(statusCode: number, errorCode: string): boolean {
    // Retry on server errors and network issues
    if (statusCode >= 500 || statusCode === 0) return true;

    // Don't retry on client errors (except 429 - rate limit)
    if (statusCode === 429) return true;

    // Don't retry on authentication/validation errors
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) return false;

    return false;
  }

  /**
   * HTTP method helpers
   */
  async get<T>(
    endpoint: string,
    headers?: HeadersInit,
    options?: EnhancedRequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers,
    }, options);
  }

  async post<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit,
    options?: EnhancedRequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    }, options);
  }

  async put<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit,
    options?: EnhancedRequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    }, options);
  }

  async patch<T>(
    endpoint: string,
    data: unknown,
    headers?: HeadersInit,
    options?: EnhancedRequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers: addCSRFHeaders(headers),
      body: JSON.stringify(data),
    }, options);
  }

  async delete<T>(
    endpoint: string,
    headers?: HeadersInit,
    options?: EnhancedRequestOptions
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: addCSRFHeaders(headers),
    }, options);
  }

  /**
   * File upload with progress tracking
   */
  async uploadFile(
    endpoint: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: Omit<EnhancedRequestOptions, 'useCircuitBreaker'>
  ): Promise<APIResponse<{ url: string; name: string }>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              data,
              status: xhr.status,
            });
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      // Prepare request
      const token = getAccessToken();
      xhr.open('POST', `${this.baseURL}${endpoint}`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);

      // Send request
      xhr.send(formData);
    });
  }

  /**
   * Health check for API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get<{ status: string }>('/health');
      return response.status === 200 && response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const enhancedAPIClient = new EnhancedAPIClient();

// Export class for testing
export { EnhancedAPIClient };

/**
 * Type-safe API response handler
 */
export function handleAPIResponse<T>(
  response: APIResponse<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: APIErrorDetails) => void;
    throwOnError?: boolean;
  } = {}
): T | null {
  const { onSuccess, onError, throwOnError = false } = options;

  if (response.error) {
    const errorDetails = enhancedAPIClient.getErrorDetails(response);
    if (errorDetails) {
      onError?.(errorDetails);
      if (throwOnError) {
        throw new Error(JSON.stringify(errorDetails));
      }
    }
    return null;
  }

  if (response.data) {
    onSuccess?.(response.data);
    return response.data;
  }

  return null;
}

/**
 * React Query-compatible API client
 */
export function createReactQueryAPI<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  endpoint: string,
  options?: EnhancedRequestOptions
) {
  return async (variables?: any) => {
    const client = enhancedAPIClient;

    switch (method) {
      case 'get':
        return await client.get<T>(endpoint, undefined, options);
      case 'post':
        return await client.post<T>(endpoint, variables, undefined, options);
      case 'put':
        return await client.put<T>(endpoint, variables, undefined, options);
      case 'patch':
        return await client.patch<T>(endpoint, variables, undefined, options);
      case 'delete':
        return await client.delete<T>(endpoint, undefined, options);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  };
}
