/**
 * Error Handler Tests
 * Centralized error handling tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorHandler,
  ErrorLogger,
  ErrorType,
  ErrorSeverity,
  type AppError,
} from '../error-handler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Creation', () => {
    it('should create error with all fields', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Test error',
        ErrorSeverity.MEDIUM
      );

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Test error');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.timestamp).toBeDefined();
    });

    it('should create API error', () => {
      const error = ErrorHandler.handleApiError(new Error('500 Server Error'));

      expect(error.type).toBe(ErrorType.SERVER);
      expect(error.message).toContain('服务器错误');
    });

    it('should create validation error', () => {
      const error = ErrorHandler.handleValidationError('email', 'Invalid email');

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create auth error', () => {
      const error = ErrorHandler.handleAuthError('Invalid credentials');

      expect(error.type).toBe(ErrorType.AUTH);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Error Classification', () => {
    it('should classify network errors', () => {
      const error = new Error('Failed to fetch');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.NETWORK);
      expect(appError.message).toContain('网络连接失败');
    });

    it('should classify 401 auth errors', () => {
      const error = new Error('401 Unauthorized');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.AUTH);
      expect(appError.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should classify 404 not found errors', () => {
      const error = new Error('404 Not Found');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should classify 400 validation errors', () => {
      const error = new Error('400 Bad Request');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.VALIDATION);
    });

    it('should classify 500 server errors', () => {
      const error = new Error('500 Internal Server Error');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.SERVER);
      expect(appError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should handle unknown errors', () => {
      const error = 'string error' as unknown;

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.UNKNOWN);
      expect(appError.message).toContain('未知错误');
    });
  });

  describe('Error Messages', () => {
    it('should return user-friendly message for 401', () => {
      const error = ErrorHandler.handleApiError(new Error('401 Unauthorized'));

      expect(error.message).toBe('未授权，请先登录');
    });

    it('should return user-friendly message for 403', () => {
      const error = ErrorHandler.handleApiError(new Error('403 Forbidden'));

      expect(error.message).toBe('无权限访问此资源');
    });

    it('should return user-friendly message for 404', () => {
      const error = ErrorHandler.handleApiError(new Error('404 Not Found'));

      expect(error.message).toBe('请求的资源不存在');
    });

    it('should return user-friendly message for 500', () => {
      const error = ErrorHandler.handleApiError(new Error('500 Internal Server Error'));

      expect(error.message).toBe('服务器错误，请稍后重试');
    });

    it('should return user-friendly message for 502', () => {
      const error = ErrorHandler.handleApiError(new Error('502 Bad Gateway'));

      expect(error.message).toBe('服务暂时不可用');
    });

    it('should return user-friendly message for 503', () => {
      const error = ErrorHandler.handleApiError(new Error('503 Service Unavailable'));

      expect(error.message).toBe('服务维护中');
    });
  });

  describe('Error Severity', () => {
    it('should assign HIGH severity to auth errors', () => {
      const error = ErrorHandler.handleApiError(new Error('401 Unauthorized'));

      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign CRITICAL severity to server errors', () => {
      const error = ErrorHandler.handleApiError(new Error('500 Internal Server Error'));

      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign MEDIUM severity to validation errors', () => {
      const error = ErrorHandler.handleApiError(new Error('400 Bad Request'));

      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should assign HIGH severity to network errors', () => {
      const error = ErrorHandler.handleApiError(new Error('Failed to fetch'));

      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('Error Helpers', () => {
    it('should get user message', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Test message',
        ErrorSeverity.LOW
      );

      expect(ErrorHandler.getUserMessage(error)).toBe('Test message');
    });

    it('should show to user if severity is not LOW', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Test',
        ErrorSeverity.MEDIUM
      );

      expect(ErrorHandler.shouldShowToUser(error)).toBe(true);
    });

    it('should not show LOW severity errors to user', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Test',
        ErrorSeverity.LOW
      );

      expect(ErrorHandler.shouldShowToUser(error)).toBe(false);
    });

    it('should report HIGH severity errors', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.SERVER,
        'Test',
        ErrorSeverity.HIGH
      );

      expect(ErrorHandler.shouldReport(error)).toBe(true);
    });

    it('should report CRITICAL severity errors', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.SERVER,
        'Test',
        ErrorSeverity.CRITICAL
      );

      expect(ErrorHandler.shouldReport(error)).toBe(true);
    });

    it('should not report MEDIUM severity errors', () => {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Test',
        ErrorSeverity.MEDIUM
      );

      expect(ErrorHandler.shouldReport(error)).toBe(false);
    });
  });
});

describe('ErrorLogger', () => {
  beforeEach(() => {
    ErrorLogger.clear();
  });

  it('should log errors', () => {
    const error: AppError = ErrorHandler.createError(
      ErrorType.VALIDATION,
      'Test error',
      ErrorSeverity.MEDIUM
    );

    ErrorLogger.log(error);

    const recent = ErrorLogger.getRecentErrors();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toEqual(error);
  });

  it('should get recent errors with limit', () => {
    for (let i = 0; i < 15; i++) {
      const error: AppError = ErrorHandler.createError(
        ErrorType.VALIDATION,
        `Error ${i}`,
        ErrorSeverity.MEDIUM
      );
      ErrorLogger.log(error);
    }

    const recent = ErrorLogger.getRecentErrors(5);
    expect(recent).toHaveLength(5);
  });

  it('should clear all errors', () => {
    const error: AppError = ErrorHandler.createError(
      ErrorType.VALIDATION,
      'Test error',
      ErrorSeverity.MEDIUM
    );

    ErrorLogger.log(error);
    expect(ErrorLogger.getRecentErrors()).toHaveLength(1);

    ErrorLogger.clear();
    expect(ErrorLogger.getRecentErrors()).toHaveLength(0);
  });
});
