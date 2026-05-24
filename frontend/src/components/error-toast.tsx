"use client";

/**
 * Error Toast Component
 * Non-intrusive error notifications with recovery actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { type AppError, ErrorType } from '@/lib/error-handler';

interface ErrorToastProps {
  error: AppError;
  onClose: () => void;
  onAction?: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ErrorToast({
  error,
  onClose,
  onAction,
  duration = 5000,
  position = 'top-right',
}: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  const handleAction = () => {
    onAction?.();
    handleClose();
  };

  if (!isVisible) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getIcon = () => {
    switch (error.type) {
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
    switch (error.severity) {
      case 'low':
        return 'border-blue-500 bg-blue-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'critical':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const toast = (
    <div
      className={`
        fixed ${getPositionClasses()} z-50 max-w-md w-full
        transition-all duration-300 transform
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          border-l-4 rounded-lg shadow-lg p-4
          ${getSeverityColor()}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="text-2xl flex-shrink-0" aria-hidden="true">
            {getIcon()}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 mb-1">
              {error.message}
            </p>
            {error.details && (
              <p className="text-sm text-gray-600">
                {typeof error.details === 'string'
                  ? error.details
                  : JSON.stringify(error.details)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onAction && (
              <button
                onClick={handleAction}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                重试
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="关闭"
            >
              <svg
                className="h-5 w-5"
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
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}

/**
 * Error Toast Manager
 */
interface ToastState {
  id: string;
  error: AppError;
  onAction?: () => void;
}

export function useErrorToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = (error: AppError, onAction?: () => void) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, error, onAction }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => {
    return (
      <>
        {toasts.map((toast) => (
          <ErrorToast
            key={toast.id}
            error={toast.error}
            onClose={() => removeToast(toast.id)}
            onAction={toast.onAction}
            position="top-right"
          />
        ))}
      </>
    );
  };

  return {
    showToast,
    removeToast,
    ToastContainer,
    hasToasts: toasts.length > 0,
  };
}

/**
 * Multiple Toast Container
 */
export function ErrorToastContainer() {
  const { ToastContainer } = useErrorToast();
  return <ToastContainer />;
}
