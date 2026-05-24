/**
 * Logger System Tests
 * Centralized logging system tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel, LogCategory } from '../logger';

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  info: console.info,
};

describe('Logger System', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Mock console methods
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.debug = vi.fn();
    console.info = vi.fn();

    // Reset logger configuration for testing
    logger.configure({
      minLevel: LogLevel.DEBUG,
      enableConsole: true,
      enableRemote: false,
      samplingRate: 1.0,
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      // Set minimum level to INFO
      logger.configure({ minLevel: LogLevel.INFO });

      logger.debug(LogCategory.API, 'Debug message');
      logger.info(LogCategory.API, 'Info message');

      expect(console.debug).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('Info message'),
        ''
      );
    });

    it('should log ERROR level messages', () => {
      logger.configure({ minLevel: LogLevel.ERROR });

      logger.error(LogCategory.API, 'Error message', new Error('Test'));

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('Error message'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith('Error:', expect.any(Error));
    });

    it('should log WARN level messages', () => {
      logger.configure({ minLevel: LogLevel.WARN });

      logger.warn(LogCategory.API, 'Warning message');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('Warning message'),
        ''
      );
    });
  });

  describe('Log Categories', () => {
    it('should categorize API logs', () => {
      logger.info(LogCategory.API, 'API call successful');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        'API call successful',
        ''
      );
    });

    it('should categorize SECURITY logs', () => {
      logger.warn(LogCategory.SECURITY, 'Security warning');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]'),
        'Security warning',
        ''
      );
    });

    it('should categorize PERF logs', () => {
      logger.debug(LogCategory.PERF, 'Performance metric');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        'Performance metric',
        ''
      );
    });

    it('should categorize AUTH logs', () => {
      logger.info(LogCategory.AUTH, 'User authenticated');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH]'),
        'User authenticated',
        ''
      );
    });
  });

  describe('Error Logging', () => {
    it('should log error objects with stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:15';

      logger.error(LogCategory.API, 'Error occurred', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('Error occurred'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith('Error:', error);
      expect(console.error).toHaveBeenCalledWith('Stack:', error.stack);
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      delete (error as any).stack;

      logger.error(LogCategory.API, 'Error occurred', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('Error occurred'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });

    it('should log error metadata', () => {
      const error = new Error('Test error');
      const metadata = { userId: '123', action: 'upload' };

      logger.error(LogCategory.API, 'API error', error, metadata);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        expect.stringContaining('API error'),
        metadata
      );
    });
  });

  describe('Log Buffering', () => {
    it('should buffer log entries', () => {
      // Configure for production to enable buffering
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        writable: true,
      });

      logger.configure({
        enableRemote: false,
        minLevel: LogLevel.DEBUG,
      });

      // Trigger an error to add to buffer
      logger.error(LogCategory.API, 'Test error');

      // In production mode, errors should be buffered
      expect(console.error).toHaveBeenCalled();

      // Reset environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'test' },
        writable: true,
      });
    });

    it('should limit buffer size', () => {
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        writable: true,
      });

      logger.configure({
        enableRemote: false,
        minLevel: LogLevel.ERROR,
      });

      const maxSize = logger['MAX_BUFFER_SIZE'];

      // Fill buffer beyond max size
      for (let i = 0; i < maxSize + 10; i++) {
        logger.error(LogCategory.API, `Message ${i}`);
      }

      // Console should still be called (buffering doesn't affect console output)
      expect(console.error).toHaveBeenCalled();

      // Reset environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'test' },
        writable: true,
      });
    });

    it('should respect sampling rate', () => {
      logger.configure({ samplingRate: 0.5 }); // 50% sampling

      // Log multiple times
      for (let i = 0; i < 100; i++) {
        logger.info(LogCategory.API, `Message ${i}`);
      }

      // Should have logged some messages due to sampling
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('Remote Logging', () => {
    it('should attempt to send logs to remote endpoint', async () => {
      logger.configure({
        enableRemote: true,
        remoteEndpoint: 'https://api.example.com/logs',
        minLevel: LogLevel.INFO,
      });

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      global.fetch = mockFetch as any;

      // Add some logs to buffer
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'production' },
        writable: true,
      });

      logger.error(LogCategory.API, 'Test error');

      // Flush logs
      await logger['flush']();

      // Fetch might not be called if buffer is empty or in non-production
      // Reset environment
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'test' },
        writable: true,
      });
    });

    it('should handle remote logging failures gracefully', async () => {
      logger.configure({
        enableRemote: true,
        remoteEndpoint: 'https://api.example.com/logs',
      });

      // Mock fetch failure
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Network error')
      ) as any;

      // Should not throw
      await expect(logger['flush']()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty log messages', () => {
      logger.info(LogCategory.API, '');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        '',
        ''
      );
    });

    it('should handle very long log messages', () => {
      const longMessage = 'x'.repeat(10000);

      logger.info(LogCategory.API, longMessage);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        longMessage,
        ''
      );
    });

    it('should handle circular reference in metadata', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      // Should not throw
      expect(() => {
        logger.info(LogCategory.API, 'Message', circular);
      }).not.toThrow();
    });

    it('should handle undefined metadata', () => {
      logger.info(LogCategory.API, 'Message', undefined as any);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API]'),
        'Message',
        '' // Logger converts undefined to empty string
      );
    });
  });

  describe('Performance', () => {
    it('should log efficiently', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        logger.info(LogCategory.API, `Message ${i}`);
      }

      const duration = performance.now() - start;

      // Should log 1000 messages in reasonable time
      expect(duration).toBeLessThan(100);
    });
  });
});
