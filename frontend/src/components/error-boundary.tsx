/**
 * Enhanced React Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI with recovery options
 */

"use client";

import React, { Component, ReactNode, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home, ExternalLink } from "lucide-react";
import { logger, LogCategory } from "@/lib/logger";
import { ErrorHandler, ErrorLogger, AppError } from "@/lib/error-handler";
import { ErrorRecoveryStrategies } from "@/lib/error-recovery";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, errors won't propagate to parent boundaries
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Error Boundary Component with comprehensive error handling and recovery
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * With custom fallback:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * With error handler:
 * <ErrorBoundary onError={(error, info) => console.error(error)}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private readonly maxRetries = 3;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      errorInfo,
      errorId,
    });

    // Create AppError for consistent error handling
    const appError: AppError = ErrorHandler.createError(
      ErrorHandler.handleApiError(error).type,
      error.message || "An unexpected error occurred",
      ErrorHandler.handleApiError(error).severity,
      {
        componentStack: errorInfo.componentStack,
        errorId,
      }
    );

    // Log the error
    ErrorLogger.log(appError);

    // Log using logger system
    logger.error(
      LogCategory.SECURITY,
      "React component error caught by boundary",
      error,
      {
        componentStack: errorInfo.componentStack,
        errorId,
        retryCount: this.state.retryCount,
      }
    );

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        logger.error(
          LogCategory.SECURITY,
          "Error in custom error handler",
          handlerError as Error
        );
      }
    }

    // Log additional context in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Component stack:", errorInfo.componentStack);
      console.error("Error ID:", errorId);
    }
  }

  componentWillUnmount(): void {
    // Clean up any pending retry timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRetry = (): void => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      logger.info(
        LogCategory.SECURITY,
        `Retrying after error (attempt ${retryCount + 1}/${this.maxRetries})`
      );

      this.setState((prevState) => ({
        ...prevState,
        retryCount: prevState.retryCount + 1,
        hasError: false,
        error: null,
        errorInfo: null,
      }));
    } else {
      logger.warn(
        LogCategory.SECURITY,
        "Max retries reached for ErrorBoundary"
      );
    }
  };

  handleReload = (): void => {
    logger.info(LogCategory.SECURITY, "Reloading page after error");
    window.location.reload();
  };

  handleGoHome = (): void => {
    logger.info(LogCategory.SECURITY, "Navigating to home after error");
    window.location.href = "/";
  };

  handleContactSupport = (): void => {
    const subject = `Error Report - ${this.state.errorId || "Unknown"}`;
    const body = `
Error ID: ${this.state.errorId || "Unknown"}
Error: ${this.state.error?.message || "Unknown error"}
Component Stack: ${this.state.errorInfo?.componentStack || "Not available"}

Please describe what you were doing when this error occurred:
`;

    window.location.href = `mailto:support@synchire.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Get error recovery strategy
      const error = this.state.error;
      const errorType = error ? ErrorHandler.handleApiError(error) : null;
      const recoveryStrategy = errorType
        ? ErrorRecoveryStrategies.getStrategy(errorType)
        : null;

      const canRetry =
        recoveryStrategy?.context.canRetry &&
        this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Something went wrong
              </h1>
            </div>

            <p className="text-gray-600 mb-4">
              {recoveryStrategy?.userMessage ||
                "An error occurred while rendering this page. Please try refreshing or contact support if the problem persists."}
            </p>

            {/* Suggested actions */}
            {recoveryStrategy?.context.suggestedActions && (
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                {recoveryStrategy.context.suggestedActions.map((action, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Error details in development */}
            {process.env.NODE_ENV === "development" && error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                  <p className="text-red-600 font-semibold mb-1">
                    {error.name}: {error.message}
                  </p>
                  {error.stack && (
                    <pre className="whitespace-pre-wrap text-gray-700">
                      {error.stack}
                    </pre>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2">
                      <p className="font-semibold text-gray-700">Component Stack:</p>
                      <pre className="whitespace-pre-wrap text-gray-600">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  aria-label={`Try again (${this.maxRetries - this.state.retryCount} attempts left)`}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} attempts
                  left)
                </Button>
              )}

              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full"
                aria-label="Reload page"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  aria-label="Go to homepage"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>

                {recoveryStrategy?.context.canContactSupport && (
                  <Button
                    onClick={this.handleContactSupport}
                    variant="outline"
                    aria-label="Contact support"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Support
                  </Button>
                )}
              </div>
            </div>

            {/* Error ID for support reference */}
            {this.state.errorId && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with an error boundary
 *
 * Usage:
 * ```tsx
 * const SafeComponent = withErrorBoundary(UnsafeComponent);
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for handling errors in functional components
 *
 * Usage:
 * ```tsx
 * const { handleError, error, isError } = useErrorHandler();
 *
 * const fetchData = async () => {
 *   try {
 *     await someAsyncOperation();
 *   } catch (error) {
 *     handleError(error);
 *   }
 * };
 * ```
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      const appError = ErrorHandler.handleApiError(error);
      ErrorLogger.log(appError);
      setError(error);
    } else {
      const appError = ErrorHandler.createError(
        ErrorHandler.handleApiError(error as Error).type,
        String(error),
        ErrorHandler.handleApiError(error as Error).severity
      );
      ErrorLogger.log(appError);
      setError(new Error(String(error)));
    }
  };

  const resetError = () => {
    setError(null);
  };

  return {
    error,
    isError: error !== null,
    handleError,
    resetError,
  };
}

export default ErrorBoundary;

