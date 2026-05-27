"use client";

/**
 * Error Recovery Dialog Component
 * User-friendly error display with recovery actions
 */

import React, { useState } from 'react';
import { Briefcase, XCircle } from 'lucide-react';
import {
  ErrorRecoveryStrategy,
  RecoveryAction,
} from '@/lib/error-recovery';

import type { AppError } from '@/lib/error-handler';
import { ErrorType } from '@/lib/error-handler';

interface ErrorRecoveryDialogProps {
  strategy: ErrorRecoveryStrategy;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: RecoveryAction) => void;
  showTechnicalDetails?: boolean;
}

export function ErrorRecoveryDialog({
  strategy,
  isOpen,
  onClose,
  onAction,
  showTechnicalDetails = false,
}: ErrorRecoveryDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (action: RecoveryAction) => {
    setIsExecuting(true);
    try {
      await action.action();
      onAction?.(action);
      onClose();
    } catch (error) {
      console.error('Error executing recovery action:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getErrorIcon = () => {
    switch (strategy.error.type) {
      case ErrorType.NETWORK:
        return '🌐';
      case ErrorType.AUTH:
        return '🔐';
      case ErrorType.VALIDATION:
        return '⚠️';
      case ErrorType.NOT_FOUND:
        return '🔍';
      case ErrorType.SERVER:
        return '⚙️';
      default:
        return '❌';
    }
  };

  const getSeverityColor = () => {
    switch (strategy.error.severity) {
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`border-b p-6 ${getSeverityColor()}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">
                {getErrorIcon()}
              </span>
              <div>
                <h2
                  id="error-title"
                  className="text-xl font-semibold"
                >
                  {strategy.userMessage}
                </h2>
                {strategy.error.code && (
                  <p className="text-sm mt-1 opacity-75">
                    错误代码: {strategy.error.code}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="关闭对话框"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Suggested Actions */}
          {strategy.context.suggestedActions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">
                建议操作：
              </h3>
              <ul className="space-y-2">
                {strategy.context.suggestedActions.map((action, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-gray-700"
                  >
                    <span
                      className="text-blue-600 mt-0.5"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">
              您可以尝试：
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {strategy.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isExecuting}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                    font-medium transition-all min-h-[44px]
                    ${
                      action.primary
                        ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                    }
                    disabled:cursor-not-allowed
                  `}
                  aria-busy={isExecuting}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  <span>{action.label}</span>
                  {isExecuting && (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Documentation Link */}
          {strategy.context.documentationUrl && (
            <div className="mb-6">
              <a
                href={strategy.context.documentationUrl}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>📖</span>
                <span>查看帮助文档</span>
              </a>
            </div>
          )}

          {/* Technical Details */}
          {showTechnicalDetails && strategy.technicalDetails && (
            <details className="mt-4">
              <summary
                className="cursor-pointer text-sm text-gray-600 hover:text-gray-700 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDetails(!showDetails);
                }}
              >
                技术详情 {showDetails ? '▼' : '▶'}
              </summary>
              {showDetails && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    {strategy.technicalDetails}
                  </p>
                  {strategy.error.details && (
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(strategy.error.details, null, 2)}
                    </pre>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    时间: {strategy.error.timestamp.toLocaleString('zh-CN')}
                  </p>
                </div>
              )}
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            需要帮助？
            <a
              href="/support"
              className="text-blue-600 hover:underline ml-1"
            >
              联系客服
            </a>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Error Recovery Component
 * For displaying errors within page content
 */
interface InlineErrorRecoveryProps {
  strategy: ErrorRecoveryStrategy;
  onAction?: (action: RecoveryAction) => void;
  compact?: boolean;
}

export function InlineErrorRecovery({
  strategy,
  onAction,
  compact = false,
}: InlineErrorRecoveryProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleAction = async (action: RecoveryAction) => {
    setIsExecuting(true);
    try {
      await action.action();
      onAction?.(action);
    } catch (error) {
      console.error('Error executing recovery action:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  if (compact) {
    return (
      <div
        className="bg-red-50 border border-red-200 rounded-lg p-4"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl" aria-hidden="true">
            ⚠️
          </span>
          <div className="flex-1">
            <p className="font-medium text-red-900">
              {strategy.userMessage}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {strategy.actions.slice(0, 2).map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isExecuting}
                  className={`
                    px-3 py-1.5 rounded text-sm font-medium
                    ${
                      action.primary
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-white text-red-700 border border-red-300 hover:bg-red-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  aria-busy={isExecuting}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
      role="alert"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl" aria-hidden="true">
              {strategy.error.type === ErrorType.NETWORK && '🌐'}
              {strategy.error.type === ErrorType.AUTH && '🔐'}
              {strategy.error.type === ErrorType.VALIDATION && '⚠️'}
              {strategy.error.type === ErrorType.NOT_FOUND && '🔍'}
              {strategy.error.type === ErrorType.SERVER && '⚙️'}
              {!Object.values(ErrorType).includes(strategy.error.type) && '❌'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {strategy.userMessage}
          </h3>

          {strategy.context.suggestedActions.length > 0 && (
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              {strategy.context.suggestedActions.map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {strategy.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isExecuting}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors min-h-[44px]
                  ${
                    action.primary
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                  }
                  disabled:cursor-not-allowed
                `}
                aria-busy={isExecuting}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
