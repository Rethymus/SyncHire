/**
 * Error Recovery Integration Examples
 * Demonstrates how to integrate error recovery into your application
 */

import type { AppError } from './error-handler';
import { ErrorHandler, ErrorType, ErrorSeverity } from './error-handler';
import { withRetry } from './api-retry';
import { ErrorRecoveryManager } from './error-recovery';

/**
 * Example: Handling specific error scenarios
 */
export class ErrorHandlingExamples {
  /**
   * Handle network errors with retry
   */
  static async handleNetworkError<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await withRetry(fn, {
        maxAttempts: 3,
        retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
      })();
    } catch (error) {
      const appError = ErrorHandler.handleApiError(error);

      if (appError.type === ErrorType.NETWORK) {
        console.log('您似乎离线了，请检查网络连接');
      } else if (appError.type === ErrorType.SERVER) {
        console.log('服务器暂时不可用，请稍后重试');
      }

      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: { message?: string }) {
    const appError = ErrorHandler.handleAuthError(error.message);

    if (appError.type === ErrorType.AUTH) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(field: string, message: string) {
    const error = ErrorHandler.handleValidationError(field, message);

    console.log(`${field}: ${message}`);

    return error;
  }
}

/**
 * Example: Context-specific error handling
 */
export const errorContexts = {
  /**
   * Resume upload errors
   */
  resumeUpload: {
    retry: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      return withRetry(
        async () => {
          const response = await fetch('/api/resumes/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to upload resume');
          }

          return response.json();
        },
        { maxAttempts: 2, retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER] }
      )();
    },
  },

  /**
   * JD parsing errors
   */
  jdParsing: {
    parse: async (jdText: string) => {
      return withRetry(
        async () => {
          const response = await fetch('/api/jd/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: jdText }),
          });

          if (!response.ok) {
            throw new Error('Failed to parse JD');
          }

          return response.json();
        },
        { maxAttempts: 3, retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER] }
      )();
    },
  },
};

/**
 * Example: Error recovery flow for file uploads
 */
export async function uploadFileWithRecovery(file: File) {
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['application/pdf', 'application/msword'];

  // Validate file size
  if (file.size > maxFileSize) {
    const error = ErrorHandler.createError(
      ErrorType.VALIDATION,
      '文件过大，请上传小于5MB的文件',
      ErrorSeverity.MEDIUM,
      { maxSize: maxFileSize, actualSize: file.size }
    );
    throw error;
  }

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    const error = ErrorHandler.createError(
      ErrorType.VALIDATION,
      '不支持的文件格式，请上传PDF或Word文件',
      ErrorSeverity.MEDIUM,
      { fileType: file.type }
    );
    throw error;
  }

  // Upload with retry
  try {
    const formData = new FormData();
    formData.append('file', file);

    return await withRetry(
      async () => {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        return response.json();
      },
      {
        maxAttempts: 3,
        retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
        onRetry: (attempt: number, error: AppError, delay: number) => {
          console.log(`Upload retry ${attempt}:`, error, `delay: ${delay}ms`);
        },
      }
    )();
  } catch (error) {
    const appError = ErrorHandler.handleApiError(error);

    if (appError.type === ErrorType.NETWORK) {
      console.log('网络连接不稳定，上传失败。请检查网络后重试。');
    } else {
      console.log('文件上传失败，请稍后重试或联系客服。');
    }

    throw error;
  }
}

/**
 * Example: Global error handler setup
 */
export function setupGlobalErrorHandling() {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      // You could show a toast notification here
      // or trigger the error recovery dialog
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);

      // Log error
      // Show user-friendly message
    });
  }
}

/**
 * Example: Register recovery callbacks
 */
export function registerFormRecoveryCallback(formId: string, resetCallback: () => void) {
  ErrorRecoveryManager.registerRecoveryCallback(formId, resetCallback);

  return () => {
    ErrorRecoveryManager.unregisterRecoveryCallback(formId);
  };
}

/**
 * Example: Create error recovery strategy for custom errors
 */
export function createCustomRecoveryStrategy(
  error: AppError,
  customActions: Array<{
    id: string;
    label: string;
    action: () => void;
    primary?: boolean;
  }>
) {
  return {
    error,
    userMessage: error.message,
    context: {
      canRetry: error.type === ErrorType.NETWORK || error.type === ErrorType.SERVER,
      canGoBack: error.type === ErrorType.VALIDATION,
      canContactSupport: error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL,
      canRefresh: true,
      suggestedActions: [
        '尝试刷新页面',
        '检查网络连接',
        '联系客服获取帮助',
      ],
    },
    actions: customActions,
  };
}

/**
 * Example: Debounced error recovery
 */
export function createDebouncedErrorRecovery(
  showError: (error: AppError) => void,
  delay: number = 1000
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (error: AppError) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      showError(error);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Example: Batch error recovery
 */
export async function recoverFromMultipleErrors<T>(
  operations: Array<() => Promise<T>>,
  onSuccess: (results: T[]) => void,
  onError: (errors: Error[]) => void
) {
  const results = await Promise.allSettled(operations.map(op => op()));

  const successfulResults: T[] = [];
  const errors: Error[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulResults.push(result.value);
    } else {
      errors.push(result.reason);
      console.error(`Operation ${index} failed:`, result.reason);
    }
  });

  if (successfulResults.length > 0) {
    onSuccess(successfulResults);
  }

  if (errors.length > 0) {
    onError(errors);
  }

  return { successfulResults, errors };
}
