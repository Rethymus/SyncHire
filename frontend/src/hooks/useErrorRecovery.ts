/**
 * Enhanced Error Recovery Hook
 * Provides contextual error messages, actionable recovery steps, and smart retry mechanisms
 */

import { useState, useCallback, useEffect } from 'react';
import { logger, LogCategory } from '@/lib/logger';

export interface ErrorContext {
  type: 'network' | 'validation' | 'authentication' | 'server' | 'unknown';
  title: string;
  message: string;
  recoverySteps: string[];
  canRetry: boolean;
  retryDelay?: number; // milliseconds
  userAction?: 'retry' | 'refresh' | 'contact_support' | 'check_connection' | 'relogin';
  relatedHelp?: string[];
  code?: string;
}

export interface ErrorRecoveryState {
  error: ErrorContext | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryTime: number | null;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

export function useErrorRecovery() {
  const [state, setState] = useState<ErrorRecoveryState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    lastRetryTime: null,
  });

  /**
   * Analyze error and generate contextual error information
   */
  const analyzeError = useCallback((error: unknown): ErrorContext => {
    // Default error context
    const defaultContext: ErrorContext = {
      type: 'unknown',
      title: '发生错误',
      message: '操作失败，请稍后重试',
      recoverySteps: ['检查网络连接', '刷新页面重试', '如果问题持续存在，请联系客服'],
      canRetry: true,
      userAction: 'retry',
    };

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.constructor.name.toLowerCase();

      // Network errors
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection') ||
        errorName.includes('networkerror') ||
        errorName.includes('typeerror') && errorMessage.includes('failed to fetch')
      ) {
        return {
          type: 'network',
          title: '网络连接失败',
          message: '无法连接到服务器，请检查您的网络连接',
          recoverySteps: [
            '检查您的网络连接是否正常',
            '尝试刷新页面',
            '检查防火墙或VPN设置',
            '如果使用WiFi，尝试切换到移动网络',
          ],
          canRetry: true,
          retryDelay: 2000,
          userAction: 'check_connection',
          relatedHelp: ['如何检查网络连接', '常见网络问题解决方法'],
        };
      }

      // Authentication errors
      if (
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('401') ||
        errorMessage.includes('token') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('登录')
      ) {
        return {
          type: 'authentication',
          title: '身份验证失败',
          message: '您的登录已过期，请重新登录',
          recoverySteps: [
            '点击重新登录按钮',
            '使用您的账户凭据重新登录',
            '如果忘记密码，使用"忘记密码"功能',
          ],
          canRetry: true,
          userAction: 'relogin',
          relatedHelp: ['如何重置密码', '账户安全设置'],
        };
      }

      // Validation errors
      if (
        errorMessage.includes('validation') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('required') ||
        errorMessage.includes('格式')
      ) {
        return {
          type: 'validation',
          title: '输入数据验证失败',
          message: '请检查您的输入是否符合要求',
          recoverySteps: [
            '检查所有必填字段是否已填写',
            '验证邮箱格式是否正确',
            '检查密码是否符合复杂度要求',
            '确保所有输入都在允许的范围内',
          ],
          canRetry: false,
          userAction: 'retry',
        };
      }

      // Server errors
      if (
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504') ||
        errorName.includes('servererror')
      ) {
        return {
          type: 'server',
          title: '服务器错误',
          message: '服务器暂时无法响应，请稍后重试',
          recoverySteps: [
            '等待几秒钟后重试',
            '检查服务状态页面',
            '如果问题持续，请联系技术支持',
          ],
          canRetry: true,
          retryDelay: 5000,
          userAction: 'retry',
          relatedHelp: ['服务状态监控', '报告技术问题'],
        };
      }

      // Rate limiting errors
      if (
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many requests') ||
        errorMessage.includes('429')
      ) {
        return {
          type: 'server',
          title: '请求过于频繁',
          message: '您发送请求的频率过快，请稍后再试',
          recoverySteps: [
            '等待1分钟后重试',
            '减少操作频率',
            '考虑升级账户以获得更高的请求限额',
          ],
          canRetry: true,
          retryDelay: 60000, // 1 minute
          userAction: 'retry',
        };
      }

      // File upload errors
      if (
        errorMessage.includes('file') ||
        errorMessage.includes('upload') ||
        errorMessage.includes('size')
      ) {
        return {
          type: 'validation',
          title: '文件上传失败',
          message: '文件上传过程中出现错误',
          recoverySteps: [
            '检查文件大小是否超过限制',
            '确认文件格式是否支持',
            '尝试压缩文件后重新上传',
            '检查文件是否损坏',
          ],
          canRetry: true,
          userAction: 'retry',
          relatedHelp: ['支持的文件格式', '文件大小限制说明'],
        };
      }
    }

    return defaultContext;
  }, []);

  /**
   * Calculate exponential backoff delay for retries
   */
  const calculateRetryDelay = useCallback((retryCount: number): number => {
    const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }, []);

  /**
   * Handle error with smart recovery
   */
  const handleError = useCallback((error: unknown, operation?: string) => {
    logger.error(
      LogCategory.API,
      `Error in ${operation || 'operation'}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );

    const errorContext = analyzeError(error);
    setState(prev => ({
      ...prev,
      error: errorContext,
      retryCount: 0,
    }));

    return errorContext;
  }, [analyzeError]);

  /**
   * Smart retry with exponential backoff
   */
  const retry = useCallback(async (
    operation: () => Promise<void>,
    onSuccess?: () => void
  ): Promise<boolean> => {
    if (!state.error?.canRetry) {
      logger.warn(LogCategory.API, 'Retry attempted on non-retryable error');
      return false;
    }

    if (state.retryCount >= MAX_RETRIES) {
      logger.error(LogCategory.API, 'Max retries reached');
      setState(prev => ({
        ...prev,
        error: {
          ...prev.error!,
          title: '重试次数过多',
          message: '已达到最大重试次数，请稍后再试或联系客服',
          recoverySteps: ['刷新页面重试', '联系客服获取帮助'],
          canRetry: false,
          userAction: 'contact_support',
        },
      }));
      return false;
    }

    const retryDelay = state.error.retryDelay || calculateRetryDelay(state.retryCount);

    setState(prev => ({
      ...prev,
      isRetrying: true,
      lastRetryTime: Date.now(),
    }));

    logger.info(
      LogCategory.API,
      `Retrying operation (attempt ${state.retryCount + 1}/${MAX_RETRIES}) after ${retryDelay}ms delay`
    );

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, retryDelay));

    try {
      await operation();
      setState({
        error: null,
        isRetrying: false,
        retryCount: 0,
        lastRetryTime: null,
      });
      onSuccess?.();
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: analyzeError(error),
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
      return false;
    }
  }, [state.error, state.retryCount, calculateRetryDelay, analyzeError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      lastRetryTime: null,
    });
  }, []);

  /**
   * Manually set error context
   */
  const setError = useCallback((errorContext: ErrorContext) => {
    setState(prev => ({
      ...prev,
      error: errorContext,
    }));
  }, []);

  return {
    error: state.error,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    handleError,
    retry,
    clearError,
    setError,
    canRetry: state.error?.canRetry ?? false,
  };
}
