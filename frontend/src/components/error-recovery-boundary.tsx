"use client";

/**
 * Enhanced Error Boundary with Recovery
 * Catches React errors and provides recovery options
 */

import React, { Component, ReactNode } from 'react';
import { logger, LogCategory } from '@/lib/logger';
import {
  InlineErrorRecovery,
  ErrorRecoveryDialog,
} from './error-recovery-dialog';
import {
  ErrorHandler,
  type AppError,
  ErrorType,
  ErrorSeverity,
} from '@/lib/error-handler';
import {
  ErrorRecoveryStrategies,
  ErrorRecoveryManager,
} from '@/lib/error-recovery';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  recoveryContextId?: string;
  useDialog?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  strategy: any;
}

export class ErrorRecoveryBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      strategy: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    logger.error(LogCategory.UI, 'ErrorRecoveryBoundary caught an error', error);
    logger.debug(LogCategory.UI, 'Error info', errorInfo);

    // Create AppError and get recovery strategy
    const appError: AppError = ErrorHandler.createError(
      ErrorType.UNKNOWN,
      error.message || '发生未知错误',
      ErrorSeverity.HIGH,
      {
        componentStack: errorInfo.componentStack,
        digest: (errorInfo as any).digest,
      }
    );

    const strategy = ErrorRecoveryStrategies.getStrategy(appError);

    this.setState({
      errorInfo,
      strategy,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Try to execute registered recovery callback
    if (this.props.recoveryContextId) {
      const recovered = ErrorRecoveryManager.executeRecovery(
        this.props.recoveryContextId
      );
      if (recovered) {
        logger.info(LogCategory.UI, 'Recovery callback executed successfully');
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      strategy: null,
    });
  };

  handleAction = () => {
    // Give time for the action to execute before resetting
    setTimeout(() => {
      this.handleReset();
    }, 100);
  };

  render() {
    if (this.state.hasError && this.state.strategy) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use dialog or inline based on prop
      if (this.props.useDialog) {
        return (
          <>
            {this.props.children}
            <ErrorRecoveryDialog
              strategy={this.state.strategy}
              isOpen={true}
              onClose={() => {
                this.handleReset();
                window.location.href = '/';
              }}
              onAction={this.handleAction}
              showTechnicalDetails={process.env.NODE_ENV === 'development'}
            />
          </>
        );
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <InlineErrorRecovery
            strategy={this.state.strategy}
            onAction={this.handleAction}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper
 */
interface UseErrorRecoveryBoundaryProps {
  children: ReactNode;
  recoveryContextId?: string;
}

export function ErrorRecoveryWrapper({
  children,
  recoveryContextId,
}: UseErrorRecoveryBoundaryProps) {
  return (
    <ErrorRecoveryBoundary
      recoveryContextId={recoveryContextId}
      useDialog={false}
    >
      {children}
    </ErrorRecoveryBoundary>
  );
}
