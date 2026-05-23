/**
 * 增强版错误边界组件
 * 为各页面提供专门的错误边界
 */

"use client";

import { Component, ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ERRORS, UI } from "@/lib/constants";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/lib/logger";

interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onErrorReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
}

export class EnhancedErrorBoundary extends Component<
  EnhancedErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // 记录错误
    logger.error(LogCategory.UI, "ErrorBoundary caught an error", error);
    logger.debug(LogCategory.UI, "Component stack", errorInfo);

    // 调用自定义错误处理
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 保存错误信息到状态
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // 调用自定义重置处理
    if (this.props.onErrorReset) {
      this.props.onErrorReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义fallback或默认错误UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {UI.ERROR_TITLE}
            </h1>

            <p className="text-gray-700 mb-6">
              {ERRORS.UNKNOWN_ERROR}
            </p>

            {/* 开发环境显示错误详情 */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  错误详情 (仅开发环境)
                </summary>
                <div className="mt-2 p-4 bg-gray-100 rounded text-xs">
                  <div className="font-mono text-red-600 mb-2">
                    {this.state.error.toString()}
                  </div>
                  <pre className="text-gray-700 overflow-auto max-h-40">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                {UI.BUTTON_RETRY}
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                {UI.BUTTON_BACK}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// 专用错误边界 (针对不同页面)
// ============================================

/**
 * 仪表盘错误边界
 */
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">仪表盘加载失败</h2>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </div>
        </div>
      }
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

/**
 * 编辑器错误边界
 */
export function EditorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">编辑器加载失败</h2>
            <p className="text-gray-700 mb-4">您的简历内容可能已保存</p>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()}>刷新页面</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
                返回仪表盘
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

/**
 * API错误边界
 */
export function APIErrorBoundary({ children }: { children: ReactNode }) {
  const [retryCount, setRetryCount] = useState(0);

  const handleReset = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">服务连接失败</h2>
            <p className="text-gray-700 mb-4">请检查您的网络连接</p>
            <Button onClick={() => window.location.reload()}>重新连接</Button>
          </div>
        </div>
      }
      onErrorReset={handleReset}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

// ============================================
// Hook版本错误边界 (推荐用于函数组件)
// ============================================

/**
 * useErrorBoundary Hook
 * 提供更灵活的错误边界控制
 */
export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const reset = () => setError(null);

  const trigger = (error: Error) => {
    setError(error);
    // 抛出错误让ErrorBoundary捕获
    throw error;
  };

  return { error, reset, trigger };
}

/**
 * HOC包装器
 * 为任何组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <EnhancedErrorBoundary fallback={fallback}>
        <Component {...props} />
      </EnhancedErrorBoundary>
    );
  };
}
