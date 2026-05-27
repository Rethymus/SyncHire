/**
 * Comprehensive Error Handling Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEnhancedQuery,
  useEnhancedMutation,
  handleQueryError,
} from '../react-query-error-handling';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../error-handler';
import { enhancedAPIClient } from '../api-client-enhanced';
import { circuitBreakerRegistry, CircuitState } from '../circuit-breaker';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  LogCategory: {
    API: 'api',
    SECURITY: 'security',
    UI: 'ui',
  },
}));

describe('Enhanced Error Handling Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Enhanced API Client', () => {
    it('should handle network errors with retry', async () => {
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        });

      global.fetch = mockFetch;

      const response = await enhancedAPIClient.get('/test');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should handle HTTP errors with proper error details', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            error_id: 'test-error-id',
          },
        }),
      });

      global.fetch = mockFetch;

      const response = await enhancedAPIClient.get('/test');
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('NOT_FOUND');
      expect(response.error?.error_id).toBe('test-error-id');

      const errorDetails = enhancedAPIClient.getErrorDetails(response);
      expect(errorDetails?.errorType).toBe(ErrorType.NOT_FOUND);
      expect(errorDetails?.retryable).toBe(false);
    });

    it('should handle timeout errors', async () => {
      const mockFetch = vi.fn().mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      global.fetch = mockFetch;

      const response = await enhancedAPIClient.get('/test', undefined, {
        timeout: 50,
      });
      expect(response.error?.code).toBe('REQUEST_TIMEOUT');
    });

    it('should handle authentication errors with token refresh', async () => {
      let refreshTokenCalled = false;
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: { code: 'AUTHENTICATION_FAILED', message: 'Unauthorized' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'success' }),
        });

      global.fetch = mockFetch;

      // Mock refresh token function
      vi.doMock('../auth', () => ({
        refreshAccessToken: async () => {
          refreshTokenCalled = true;
          return 'new-token';
        },
      }));

      const response = await enhancedAPIClient.get('/test');
      expect(refreshTokenCalled).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = circuitBreakerRegistry.get('test-cb', {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 1000,
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('Service unavailable'));

      // First failure
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);

      // Second failure - circuit should open
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);

      // Third call should be rejected without calling the function
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      expect(failingFn).toHaveBeenCalledTimes(2); // Not called again
    });

    it('should close circuit after successful recovery', async () => {
      const circuitBreaker = circuitBreakerRegistry.get('test-recovery', {
        failureThreshold: 1,
        successThreshold: 2,
        timeout: 100, // Short timeout for testing
      });

      const failingFn = vi.fn().mockRejectedValue(new Error('Service unavailable'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);

      // Wait for timeout to allow HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));

      // First success in HALF_OPEN
      const result1 = await circuitBreaker.execute(successFn);
      expect(result1).toBe('success');
      expect(circuitBreaker.getStats().state).toBe(CircuitState.HALF_OPEN);

      // Second success should close the circuit
      const result2 = await circuitBreaker.execute(successFn);
      expect(result2).toBe('success');
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should track circuit breaker statistics', () => {
      const circuitBreaker = circuitBreakerRegistry.get('test-stats', {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
      });

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.rejectionCount).toBe(0);
    });
  });

  describe('React Query Error Handling', () => {
    it('should handle query errors with custom callbacks', async () => {
      const onError = vi.fn();
      const queryFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() =>
        useEnhancedQuery(['test'], queryFn, { onError })
      , { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle mutation errors with custom callbacks', async () => {
      const onError = vi.fn();
      const mutationFn = vi.fn().mockRejectedValue(new Error('Mutation failed'));

      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() =>
        useEnhancedMutation(mutationFn, { onError })
      , { wrapper });

      result.current.mutate('test');

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should not retry on client errors', async () => {
      const queryFn = vi.fn().mockRejectedValue({
        status: 400,
        message: 'Bad request',
      });

      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() =>
        useEnhancedQuery(['test'], queryFn)
      , { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(queryFn).toHaveBeenCalledTimes(1); // No retries
      });
    });

    it('should retry on server errors', async () => {
      const queryFn = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValueOnce('success');

      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() =>
        useEnhancedQuery(['test'], queryFn)
      , { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe('success');
        expect(queryFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      });
    });
  });

  describe('Error Handler Integration', () => {
    it('should classify errors correctly', () => {
      const networkError = new Error('fetch failed');
      const authError = new Error('status 401');
      const validationError = new Error('status 400');
      const notFoundError = new Error('status 404');
      const serverError = new Error('status 500');

      expect(ErrorHandler.handleApiError(networkError).type).toBe(ErrorType.NETWORK);
      expect(ErrorHandler.handleApiError(authError).type).toBe(ErrorType.AUTH);
      expect(ErrorHandler.handleApiError(validationError).type).toBe(ErrorType.VALIDATION);
      expect(ErrorHandler.handleApiError(notFoundError).type).toBe(ErrorType.NOT_FOUND);
      expect(ErrorHandler.handleApiError(serverError).type).toBe(ErrorType.SERVER);
    });

    it('should assign appropriate severity levels', () => {
      const authError = ErrorHandler.handleApiError(new Error('status 401'));
      const validationError = ErrorHandler.handleApiError(new Error('status 400'));
      const serverError = ErrorHandler.handleApiError(new Error('status 500'));

      expect(authError.severity).toBe(ErrorSeverity.HIGH);
      expect(validationError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(serverError.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should generate user-friendly error messages', () => {
      const error401 = ErrorHandler.handleApiError(new Error('status 401'));
      const error404 = ErrorHandler.handleApiError(new Error('status 404'));
      const error500 = ErrorHandler.handleApiError(new Error('status 500'));

      expect(error401.message).toBe('未授权，请先登录');
      expect(error404.message).toBe('请求的资源不存在');
      expect(error500.message).toBe('服务器错误，请稍后重试');
    });
  });

  describe('Query Error Recovery', () => {
    it('should recover from transient errors', async () => {
      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      let attemptCount = 0;
      const queryFn = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary error');
        }
        return 'success';
      });

      const { result } = renderHook(() =>
        useEnhancedQuery(['test'], queryFn)
      , { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe('success');
        expect(attemptCount).toBeGreaterThan(1);
      });
    });

    it('should not recover from permanent errors', async () => {
      const wrapper = ({ children }: { children: any }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const queryFn = vi.fn().mockRejectedValue({
        status: 404,
        message: 'Not found',
      });

      const { result } = renderHook(() =>
        useEnhancedQuery(['test'], queryFn)
      , { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(queryFn).toHaveBeenCalledTimes(1); // No retries for 404
      });
    });
  });

  describe('Error Context Generation', () => {
    it('should generate appropriate recovery context for different error types', () => {
      const authError = ErrorHandler.createError(
        ErrorType.AUTH,
        'Authentication failed',
        ErrorSeverity.HIGH
      );

      const networkError = ErrorHandler.createError(
        ErrorType.NETWORK,
        'Network error',
        ErrorSeverity.MEDIUM
      );

      expect(authError.type).toBe(ErrorType.AUTH);
      expect(networkError.type).toBe(ErrorType.NETWORK);
    });

    it('should add query context to errors', () => {
      const queryError = handleQueryError(
        new Error('Query failed'),
        { operation: 'fetchUserData', queryKey: ['user', 'profile'] }
      );

      expect(queryError.details?.operation).toBe('fetchUserData');
      expect(queryError.details?.queryKey).toBe('user.profile');
    });
  });
});
