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

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  LogCategory: {
    ERROR: 'ERROR',
    API: 'API',
    AUTH: 'AUTH',
  },
}));

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
      const error = ErrorHandler.handleApiError(new Error('API failed'));

      expect(error.type).toBe(ErrorType.API);
      expect(error.message).toContain('API failed');
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
      (error as any).name = 'TypeError';

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.NETWORK);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      (error as any).code = 'ETIMEDOUT';

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.TIMEOUT);
    });

    it('should classify validation errors', () => {
      const error = new Error('400 Bad Request');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.VALIDATION);
    });

    it('should classify authentication errors', () => {
      const error = new Error('401 Unauthorized');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.AUTH);
    });

    it('should classify server errors', () => {
      const error = new Error('500 Internal Server Error');

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.type).toBe(ErrorType.SERVER);
    });
  });

  describe('Error Severity', () => {
    it('should determine severity from error type', () => {
      const authError = ErrorHandler.handleAuthError('Unauthorized');
      expect(authError.severity).toBe(ErrorSeverity.HIGH);

      const apiError = ErrorHandler.handleApiError(new Error('API error'));
      expect(apiError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should map HTTP status to severity', () => {
      const notFound = new Error('404 Not Found');
      const appError = ErrorHandler.handleApiError(notFound);

      expect(appError.severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('ErrorLogger', () => {
    it('should log error to console', () => {
      const error: AppError = {
        type: ErrorType.API,
        message: 'Test error',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
      };

      ErrorLogger.log(error);

      // Verify logger was called
      expect(require('../logger').logger.error).toHaveBeenCalled();
    });

    it('should log error with context', () => {
      const error: AppError = {
        type: ErrorType.API,
        message: 'Test error',
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
        details: { userId: '123', action: 'upload' },
      };

      ErrorLogger.log(error);

      expect(require('../logger').logger.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      delete (error as any).stack;

      const appError = ErrorHandler.handleApiError(error);

      expect(appError).toBeDefined();
      expect(appError.message).toBe('Simple error');
    });

    it('should handle errors without messages', () => {
      const error = new Error();
      delete (error as any).message;

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.message).toBeDefined();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'x'.repeat(10000);
      const error = new Error(longMessage);

      const appError = ErrorHandler.handleApiError(error);

      expect(appError.message).toBeDefined();
    });

    it('should handle errors with circular references', () => {
      const error: any = new Error('Circular error');
      error.circular = { self: error };

      const appError = ErrorHandler.handleApiError(error);

      expect(appError).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery suggestions', () => {
      const networkError = ErrorHandler.handleApiError(new Error('Network error'));
      const authError = ErrorHandler.handleAuthError('Invalid token');

      expect(networkError.type).toBe(ErrorType.NETWORK);
      expect(authError.type).toBe(ErrorType.AUTH);
    });

    it('should distinguish retryable errors', () => {
      const timeoutError = new Error('Request timeout');
      const authError = new Error('401 Unauthorized');

      const isTimeoutRetryable = ErrorHandler.isRetryable(timeoutError);
      const isAuthRetryable = ErrorHandler.isRetryable(authError);

      expect(isTimeoutRetryable).toBe(true);
      expect(isAuthRetryable).toBe(false);
    });
  });

  describe('Error Metadata', () => {
    it('should preserve error metadata', () => {
      const originalError = new Error('API error');
      (originalError as any).code = 'API_ERROR';
      (originalError as any).status = 500;

      const appError = ErrorHandler.handleApiError(originalError);

      expect(appError.details).toBeDefined();
    });

    it('should attach request context', () => {
      const error = new Error('Request failed');

      const appError = ErrorHandler.handleApiError(error, {
        url: '/api/upload',
        method: 'POST',
      });

      expect(appError.details).toBeDefined();
    });
  });
});
