/**
 * Enhanced Error Recovery Component
 * Displays contextual error messages with actionable recovery steps and smart retry functionality
 */

import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ErrorRecoveryStrategy } from '@/lib/error-recovery';
import { ErrorHandler, ErrorType, ErrorSeverity } from '@/lib/error-handler';

interface ErrorRecoveryProps {
  error: ErrorRecoveryStrategy | null;
  isRetrying: boolean;
  onRetry?: () => Promise<void>;
  onDismiss?: () => void;
  showRelatedHelp?: boolean;
}

export function ErrorRecovery({
  error,
  isRetrying,
  onRetry,
  onDismiss,
  showRelatedHelp = true,
}: ErrorRecoveryProps) {
  if (!error) {
    return null;
  }

  const getErrorIcon = () => {
    switch (error.error.type) {
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
        return <AlertCircle className="h-5 w-5 text-orange-500" aria-hidden="true" />;
      case ErrorType.AUTH:
        return <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />;
      case ErrorType.VALIDATION:
        return <AlertCircle className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" aria-hidden="true" />;
    }
  };

  const getErrorColor = () => {
    switch (error.error.type) {
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
        return 'bg-orange-50 border-orange-200';
      case ErrorType.AUTH:
        return 'bg-red-50 border-red-200';
      case ErrorType.VALIDATION:
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 ${getErrorColor()}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Header with icon and dismiss button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
            {getErrorIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{error.userMessage}</h3>
            <p className="text-sm text-gray-700 mt-1">{error.error.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="关闭错误提示"
          >
            <X className="h-4 w-4 text-gray-500" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Recovery steps */}
      {error.context.suggestedActions && error.context.suggestedActions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900 mb-2">建议操作:</p>
          <ol className="space-y-2">
            {error.context.suggestedActions.map((step, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white border border-gray-300 rounded-full text-xs font-medium text-gray-600">
                  {index + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Related help links */}
      {showRelatedHelp && error.context.documentationUrl && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          <p className="text-sm font-medium text-gray-900 mb-2">相关帮助:</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => {
                window.location.href = error.context.documentationUrl!;
              }}
            >
              查看帮助文档
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 pt-4 border-t border-gray-300 flex flex-wrap gap-2">
        {error.context.canRetry && onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="min-h-[44px] px-4"
            aria-describedby={isRetrying ? 'retry-status' : undefined}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                <span>重试中...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                <span>重试</span>
              </>
            )}
          </Button>
        )}

        {error.actions.map((action) => (
          <Button
            key={action.id}
            variant={action.primary ? 'default' : 'outline'}
            onClick={async () => await action.action()}
            className="min-h-[44px] px-4"
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        ))}

        {onDismiss && (
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="min-h-[44px] px-4"
          >
            稍后再试
          </Button>
        )}
      </div>

      {/* Retry status for screen readers */}
      {isRetrying && (
        <span id="retry-status" className="sr-only">
          正在重试操作，请稍候...
        </span>
      )}

      {/* Error code for debugging */}
      {error.error.code && (
        <p className="text-xs text-gray-500 mt-2">
          错误代码: {error.error.code}
        </p>
      )}
    </div>
  );
}

/**
 * Error Boundary with Recovery Component
 * Wraps components to catch errors and provide recovery options
 */

interface ErrorBoundaryWithRecoveryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryWithRecovery extends React.Component<
  ErrorBoundaryWithRecoveryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryWithRecoveryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <ErrorRecovery
              error={{
                error: ErrorHandler.createError(
                  ErrorType.UNKNOWN,
                  '页面遇到错误，无法正常显示',
                  ErrorSeverity.HIGH
                ),
                userMessage: '页面加载失败',
                context: {
                  canRetry: true,
                  canGoBack: true,
                  canContactSupport: true,
                  canRefresh: true,
                  suggestedActions: [
                    '尝试刷新页面',
                    '清除浏览器缓存后重试',
                    '如果问题持续存在，请联系客服',
                  ],
                  documentationUrl: '/help',
                },
                actions: [
                  {
                    id: 'refresh',
                    label: '刷新页面',
                    icon: '🔃',
                    action: () => window.location.reload(),
                    primary: true,
                  },
                  {
                    id: 'home',
                    label: '返回首页',
                    icon: '🏠',
                    action: () => { window.location.href = '/'; },
                  },
                ],
                technicalDetails: '页面遇到错误，无法正常显示',
              }}
              isRetrying={false}
              onRetry={async () => {
                this.resetError();
                window.location.reload();
              }}
              onDismiss={() => {
                this.resetError();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
