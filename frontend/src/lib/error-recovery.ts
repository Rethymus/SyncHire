/**
 * Error Recovery System
 * Comprehensive error recovery with retry mechanisms and contextual help
 */

import { AppError, ErrorType, ErrorSeverity } from './error-handler';

export interface RecoveryAction {
  id: string;
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

export interface RecoveryContext {
  canRetry: boolean;
  canGoBack: boolean;
  canContactSupport: boolean;
  canRefresh: boolean;
  suggestedActions: string[];
  documentationUrl?: string;
}

export interface ErrorRecoveryStrategy {
  error: AppError;
  context: RecoveryContext;
  actions: RecoveryAction[];
  userMessage: string;
  technicalDetails?: string;
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorType.NETWORK,
    ErrorType.SERVER,
    ErrorType.UNKNOWN,
  ],
};

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  // Add some jitter to avoid thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
export function isRetryable(
  error: AppError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return config.retryableErrors.includes(error.type);
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts - 1) {
        break;
      }

      // Check if we should retry this error
      const appError = error as any as AppError;
      if (!isRetryable(appError, config)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateBackoff(attempt, config);
      onRetry?.(attempt + 1, lastError);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Error Recovery Strategies
 */
export class ErrorRecoveryStrategies {
  /**
   * Get recovery strategy for network errors
   */
  static networkError(error: AppError): ErrorRecoveryStrategy {
    return {
      error,
      userMessage: '网络连接出现问题',
      context: {
        canRetry: true,
        canGoBack: false,
        canContactSupport: true,
        canRefresh: true,
        suggestedActions: [
          '检查您的网络连接是否正常',
          '尝试刷新页面',
          '如果问题持续存在，请稍后再试',
        ],
        documentationUrl: '/help/network-issues',
      },
      actions: [
        {
          id: 'retry',
          label: '重试',
          icon: '🔄',
          action: async () => {
            // Default retry action - will be overridden by specific implementation
            window.location.reload();
          },
          primary: true,
        },
        {
          id: 'refresh',
          label: '刷新页面',
          icon: '🔃',
          action: () => {
            window.location.reload();
          },
        },
      ],
      technicalDetails: '网络请求失败。可能是网络连接不稳定或服务器暂时无法访问。',
    };
  }

  /**
   * Get recovery strategy for authentication errors
   */
  static authError(error: AppError): ErrorRecoveryStrategy {
    const isSessionExpired = error.message.includes('过期') || error.code === 'SESSION_EXPIRED';

    return {
      error,
      userMessage: isSessionExpired ? '会话已过期，请重新登录' : '身份验证失败',
      context: {
        canRetry: false,
        canGoBack: true,
        canContactSupport: true,
        canRefresh: false,
        suggestedActions: isSessionExpired
          ? [
              '您的登录会话已过期',
              '请点击下方按钮重新登录',
              '重新登录后可以继续您的操作',
            ]
          : [
              '请检查您的账号信息是否正确',
              '如果是首次使用，请先注册账号',
              '忘记密码？您可以通过邮箱重置',
            ],
        documentationUrl: '/help/authentication',
      },
      actions: [
        {
          id: 'login',
          label: '重新登录',
          icon: '🔐',
          action: () => {
            window.location.href = '/login';
          },
          primary: true,
        },
        {
          id: 'register',
          label: '注册新账号',
          icon: '✏️',
          action: () => {
            window.location.href = '/register';
          },
        },
        {
          id: 'reset-password',
          label: '重置密码',
          icon: '🔑',
          action: () => {
            window.location.href = '/reset-password';
          },
        },
      ],
      technicalDetails: isSessionExpired
        ? 'JWT token 已过期，需要重新获取'
        : '身份验证失败。请检查您的凭据是否正确。',
    };
  }

  /**
   * Get recovery strategy for validation errors
   */
  static validationError(error: AppError): ErrorRecoveryStrategy {
    const field = error.details?.field as string | undefined;

    return {
      error,
      userMessage: field ? `${field} 格式不正确` : '输入数据格式不正确',
      context: {
        canRetry: false,
        canGoBack: true,
        canContactSupport: false,
        canRefresh: false,
        suggestedActions: [
          '请检查您的输入是否符合要求',
          '参考示例格式进行修改',
          '如需帮助，请查看表单下方的提示',
        ],
      },
      actions: [
        {
          id: 'go-back',
          label: '返回修改',
          icon: '⬅️',
          action: () => {
            window.history.back();
          },
          primary: true,
        },
        {
          id: 'clear',
          label: '清空表单',
          icon: '🗑️',
          action: () => {
            // Will be implemented by specific component
            const forms = document.querySelectorAll('form');
            forms.forEach(form => form.reset());
          },
        },
      ],
      technicalDetails: `字段验证失败：${field || '未知字段'}。${error.message}`,
    };
  }

  /**
   * Get recovery strategy for not found errors
   */
  static notFoundError(error: AppError): ErrorRecoveryStrategy {
    return {
      error,
      userMessage: '请求的资源不存在',
      context: {
        canRetry: false,
        canGoBack: true,
        canContactSupport: true,
        canRefresh: true,
        suggestedActions: [
          '该资源可能已被删除',
          '请检查链接是否正确',
          '返回首页重新开始',
        ],
        documentationUrl: '/help/not-found',
      },
      actions: [
        {
          id: 'home',
          label: '返回首页',
          icon: '🏠',
          action: () => {
            window.location.href = '/';
          },
          primary: true,
        },
        {
          id: 'back',
          label: '返回上一页',
          icon: '⬅️',
          action: () => {
            window.history.back();
          },
        },
        {
          id: 'contact',
          label: '联系客服',
          icon: '💬',
          action: () => {
            window.location.href = '/support';
          },
        },
      ],
      technicalDetails: '请求的资源不存在（404）。可能已被删除或移动。',
    };
  }

  /**
   * Get recovery strategy for server errors
   */
  static serverError(error: AppError): ErrorRecoveryStrategy {
    return {
      error,
      userMessage: '服务器出现问题',
      context: {
        canRetry: true,
        canGoBack: false,
        canContactSupport: true,
        canRefresh: true,
        suggestedActions: [
          '服务器暂时无法处理您的请求',
          '请稍后重试',
          '如果问题持续，请联系技术支持',
        ],
      },
      actions: [
        {
          id: 'retry',
          label: '重试',
          icon: '🔄',
          action: async () => {
            window.location.reload();
          },
          primary: true,
        },
        {
          id: 'contact',
          label: '联系技术支持',
          icon: '💬',
          action: () => {
            window.location.href = '/support';
          },
        },
      ],
      technicalDetails: `服务器错误（${error.details?.statusCode || 500}）。我们已记录此问题，请稍后重试。`,
    };
  }

  /**
   * Get recovery strategy for unknown errors
   */
  static unknownError(error: AppError): ErrorRecoveryStrategy {
    return {
      error,
      userMessage: '发生了意外错误',
      context: {
        canRetry: true,
        canGoBack: true,
        canContactSupport: true,
        canRefresh: true,
        suggestedActions: [
          '这是一个意外错误',
          '您可以尝试刷新页面',
          '如果问题持续，请联系我们',
        ],
      },
      actions: [
        {
          id: 'retry',
          label: '重试',
          icon: '🔄',
          action: () => {
            window.location.reload();
          },
          primary: true,
        },
        {
          id: 'back',
          label: '返回上一页',
          icon: '⬅️',
          action: () => {
            window.history.back();
          },
        },
        {
          id: 'home',
          label: '返回首页',
          icon: '🏠',
          action: () => {
            window.location.href = '/';
          },
        },
      ],
      technicalDetails: '发生未知错误。我们的技术团队已收到通知，正在调查此问题。',
    };
  }

  /**
   * Get recovery strategy based on error type
   */
  static getStrategy(error: AppError): ErrorRecoveryStrategy {
    switch (error.type) {
      case ErrorType.NETWORK:
        return this.networkError(error);
      case ErrorType.AUTH:
        return this.authError(error);
      case ErrorType.VALIDATION:
        return this.validationError(error);
      case ErrorType.NOT_FOUND:
        return this.notFoundError(error);
      case ErrorType.SERVER:
        return this.serverError(error);
      default:
        return this.unknownError(error);
    }
  }
}

/**
 * Error Recovery Manager
 */
export class ErrorRecoveryManager {
  private static recoveryCallbacks = new Map<string, () => void>();

  /**
   * Register a recovery callback for a specific error context
   */
  static registerRecoveryCallback(contextId: string, callback: () => void): void {
    this.recoveryCallbacks.set(contextId, callback);
  }

  /**
   * Unregister a recovery callback
   */
  static unregisterRecoveryCallback(contextId: string): void {
    this.recoveryCallbacks.delete(contextId);
  }

  /**
   * Execute a recovery callback
   */
  static executeRecovery(contextId: string): boolean {
    const callback = this.recoveryCallbacks.get(contextId);
    if (callback) {
      callback();
      return true;
    }
    return false;
  }

  /**
   * Get all registered recovery contexts
   */
  static getRegisteredContexts(): string[] {
    return Array.from(this.recoveryCallbacks.keys());
  }

  /**
   * Clear all recovery callbacks
   */
  static clearAllCallbacks(): void {
    this.recoveryCallbacks.clear();
  }
}

/**
 * Error Context Generator
 */
export class ErrorContextGenerator {
  /**
   * Generate error context based on current page and user state
   */
  static generate(error: AppError, currentPath?: string): Partial<RecoveryContext> {
    const context: Partial<RecoveryContext> = {};

    // Check if user is on a protected route
    const isProtectedRoute = currentPath?.startsWith('/dashboard') ||
                              currentPath?.startsWith('/profile') ||
                              currentPath?.startsWith('/applications');

    // Authentication errors on protected routes should allow retry
    if (error.type === ErrorType.AUTH && isProtectedRoute) {
      context.canRetry = true;
      context.suggestedActions = [
        '您需要登录才能访问此页面',
        '点击下方按钮进行登录',
        '登录后将自动返回您要访问的页面',
      ];
    }

    // Network errors might be temporary
    if (error.type === ErrorType.NETWORK) {
      context.canRetry = true;
      context.canRefresh = true;
    }

    // Validation errors should allow going back
    if (error.type === ErrorType.VALIDATION) {
      context.canGoBack = true;
    }

    // Server errors should allow contact support
    if (error.type === ErrorType.SERVER) {
      context.canContactSupport = true;
    }

    return context;
  }
}
