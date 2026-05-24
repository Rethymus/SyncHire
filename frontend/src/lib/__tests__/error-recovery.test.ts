/**
 * Error Recovery System Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateBackoff,
  isRetryable,
  retryWithBackoff,
  ErrorRecoveryStrategies,
  ErrorRecoveryManager,
  ErrorContextGenerator,
} from '../error-recovery';
import {
  ErrorHandler,
  ErrorType,
  ErrorSeverity,
} from '../error-handler';

describe('Error Recovery System', () => {
  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const delay1 = calculateBackoff(0);
      const delay2 = calculateBackoff(1);
      const delay3 = calculateBackoff(2);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect max delay', () => {
      const config = {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2,
        retryableErrors: [ErrorType.NETWORK],
      };

      const delay = calculateBackoff(10, config);
      expect(delay).toBeLessThanOrEqual(config.maxDelay + 1000); // +1000 for jitter
    });

    it('should add jitter to avoid thundering herd', () => {
      const delay1 = calculateBackoff(0);
      const delay2 = calculateBackoff(0);

      // Jitter should cause different values
      expect(delay1).not.toBe(delay2);
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable error types', () => {
      const networkError = {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error',
        timestamp: new Date(),
      };

      const validationError = {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation error',
        timestamp: new Date(),
      };

      expect(isRetryable(networkError)).toBe(true);
      expect(isRetryable(validationError)).toBe(false);
    });

    it('should respect custom retry configuration', () => {
      const customConfig = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [ErrorType.VALIDATION],
      };

      const validationError = {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation error',
        timestamp: new Date(),
      };

      expect(isRetryable(validationError, customConfig)).toBe(true);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();

      const result = await retryWithBackoff(
        fn,
        {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: [ErrorType.NETWORK],
        },
        onRetry
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(
        retryWithBackoff(
          fn,
          {
            maxAttempts: 2,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: [ErrorType.NETWORK],
          }
        )
      ).rejects.toThrow('Persistent error');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(
        Object.assign(new Error('Validation error'), {
          type: ErrorType.VALIDATION,
        })
      );

      await expect(
        retryWithBackoff(
          fn,
          {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: [ErrorType.NETWORK],
          }
        )
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorRecoveryStrategies', () => {
    describe('networkError', () => {
      it('should provide recovery strategy for network errors', () => {
        const error = ErrorHandler.createError(
          ErrorType.NETWORK,
          'Network connection failed',
          ErrorSeverity.HIGH
        );

        const strategy = ErrorRecoveryStrategies.networkError(error);

        expect(strategy.userMessage).toBe('网络连接出现问题');
        expect(strategy.context.canRetry).toBe(true);
        expect(strategy.context.suggestedActions).toContain('检查您的网络连接是否正常');
        expect(strategy.actions).toHaveLength(2);
        expect(strategy.actions[0].primary).toBe(true);
      });
    });

    describe('authError', () => {
      it('should provide recovery strategy for auth errors', () => {
        const error = ErrorHandler.createError(
          ErrorType.AUTH,
          'Authentication failed',
          ErrorSeverity.HIGH
        );

        const strategy = ErrorRecoveryStrategies.authError(error);

        expect(strategy.userMessage).toBe('身份验证失败');
        expect(strategy.context.canRetry).toBe(false);
        expect(strategy.actions).toHaveLength(3);
        expect(strategy.actions[0].id).toBe('login');
      });

      it('should detect session expiry', () => {
        const error = ErrorHandler.createError(
          ErrorType.AUTH,
          '会话已过期',
          ErrorSeverity.HIGH,
          { code: 'SESSION_EXPIRED' }
        );

        const strategy = ErrorRecoveryStrategies.authError(error);

        expect(strategy.userMessage).toBe('会话已过期，请重新登录');
      });
    });

    describe('validationError', () => {
      it('should provide recovery strategy for validation errors', () => {
        const error = ErrorHandler.createError(
          ErrorType.VALIDATION,
          'Email is required',
          ErrorSeverity.LOW,
          { field: 'email' }
        );

        const strategy = ErrorRecoveryStrategies.validationError(error);

        expect(strategy.userMessage).toContain('email');
        expect(strategy.context.canGoBack).toBe(true);
        expect(strategy.context.canRetry).toBe(false);
      });
    });

    describe('getStrategy', () => {
      it('should return correct strategy based on error type', () => {
        const networkError = ErrorHandler.createError(
          ErrorType.NETWORK,
          'Network error',
          ErrorSeverity.HIGH
        );

        const authError = ErrorHandler.createError(
          ErrorType.AUTH,
          'Auth error',
          ErrorSeverity.HIGH
        );

        const networkStrategy = ErrorRecoveryStrategies.getStrategy(networkError);
        const authStrategy = ErrorRecoveryStrategies.getStrategy(authError);

        expect(networkStrategy.userMessage).toContain('网络');
        expect(authStrategy.userMessage).toContain('身份验证');
      });
    });
  });

  describe('ErrorRecoveryManager', () => {
    beforeEach(() => {
      ErrorRecoveryManager.clearAllCallbacks();
    });

    it('should register and execute recovery callbacks', () => {
      const callback = vi.fn();
      const contextId = 'test-context';

      ErrorRecoveryManager.registerRecoveryCallback(contextId, callback);

      expect(ErrorRecoveryManager.executeRecovery(contextId)).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return false for non-existent contexts', () => {
      expect(ErrorRecoveryManager.executeRecovery('non-existent')).toBe(false);
    });

    it('should unregister callbacks', () => {
      const callback = vi.fn();
      const contextId = 'test-context';

      ErrorRecoveryManager.registerRecoveryCallback(contextId, callback);
      ErrorRecoveryManager.unregisterRecoveryCallback(contextId);

      expect(ErrorRecoveryManager.executeRecovery(contextId)).toBe(false);
    });

    it('should list all registered contexts', () => {
      ErrorRecoveryManager.registerRecoveryCallback('context-1', () => {});
      ErrorRecoveryManager.registerRecoveryCallback('context-2', () => {});

      const contexts = ErrorRecoveryManager.getRegisteredContexts();

      expect(contexts).toHaveLength(2);
      expect(contexts).toContain('context-1');
      expect(contexts).toContain('context-2');
    });

    it('should clear all callbacks', () => {
      ErrorRecoveryManager.registerRecoveryCallback('context-1', () => {});
      ErrorRecoveryManager.registerRecoveryCallback('context-2', () => {});

      ErrorRecoveryManager.clearAllCallbacks();

      expect(ErrorRecoveryManager.getRegisteredContexts()).toHaveLength(0);
    });
  });

  describe('ErrorContextGenerator', () => {
    it('should generate context for protected routes', () => {
      const error = ErrorHandler.createError(
        ErrorType.AUTH,
        'Not authenticated',
        ErrorSeverity.HIGH
      );

      const context = ErrorContextGenerator.generate(error, '/dashboard');

      expect(context.canRetry).toBe(true);
      expect(context.suggestedActions).toContain('您需要登录才能访问此页面');
    });

    it('should generate context for network errors', () => {
      const error = ErrorHandler.createError(
        ErrorType.NETWORK,
        'Network error',
        ErrorSeverity.HIGH
      );

      const context = ErrorContextGenerator.generate(error);

      expect(context.canRetry).toBe(true);
      expect(context.canRefresh).toBe(true);
    });

    it('should generate context for validation errors', () => {
      const error = ErrorHandler.createError(
        ErrorType.VALIDATION,
        'Invalid input',
        ErrorSeverity.LOW
      );

      const context = ErrorContextGenerator.generate(error);

      expect(context.canGoBack).toBe(true);
    });

    it('should generate context for server errors', () => {
      const error = ErrorHandler.createError(
        ErrorType.SERVER,
        'Server error',
        ErrorSeverity.CRITICAL
      );

      const context = ErrorContextGenerator.generate(error);

      expect(context.canContactSupport).toBe(true);
    });
  });
});
