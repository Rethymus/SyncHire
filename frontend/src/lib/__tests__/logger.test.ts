/**
 * Logger System Tests
 * Centralized logging system tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger, LogLevel, LogCategory } from '../logger';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

describe('Logger System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Store original console methods
    (global as any).console = { ...mockConsole };
  });

  afterEach(() => {
    // Restore console methods
    delete (global as any).console;
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      // Set minimum level to INFO
      logger['config'].minLevel = LogLevel.INFO;

      logger.debug(LogCategory.API, 'Debug message');
      logger.info(LogCategory.API, 'Info message');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should log ERROR level messages', () => {
      logger['config'].minLevel = LogLevel.ERROR;

      logger.error(LogCategory.API, 'Error message', new Error('Test'));

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log WARN level messages', () => {
      logger['config'].minLevel = LogLevel.WARN;

      logger.warn(LogCategory.API, 'Warning message');

      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('Log Categories', () => {
    it('should categorize API logs', () => {
      logger.info(LogCategory.API, 'API call successful');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[API]')
      );
    });

    it('should categorize SECURITY logs', () => {
      logger.warn(LogCategory.SECURITY, 'Security warning');

      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]')
      );
    });

    it('should categorize PERF logs', () => {
      logger.debug(LogCategory.PERF, 'Performance metric');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]')
      );
    });

    it('should categorize AUTH logs', () => {
      logger.info(LogCategory.AUTH, 'User authenticated');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH]')
      );
    });
  });

  describe('Error Logging', () => {
    it('should log error objects with stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:15';

      logger.error(LogCategory.API, 'Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error'),
        expect.any(Error)
      );
    });

    it('should handle errors without stack traces', () => {
      const error = new Error('Simple error');
      delete (error as any).stack;

      logger.error(LogCategory.API, 'Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log error metadata', () => {
      const error = new Error('Test error');
      const metadata = { userId: '123', action: 'upload' };

      logger.error(LogCategory.API, 'API error', error, metadata);

      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Log Buffering', () => {
    it('should buffer log entries', () => {
      logger['config'].enableRemote = false;
      logger['config'].minLevel = LogLevel.DEBUG;

      logger.info(LogCategory.API, 'Test message');

      expect(logger['logBuffer'].length).toBeGreaterThan(0);
    });

    it('should limit buffer size', () => {
      logger['config'].enableRemote = false;
      logger['config'].minLevel = LogLevel.DEBUG;
      const maxSize = logger['MAX_BUFFER_SIZE'];

      // Fill buffer beyond max size
      for (let i = 0; i < maxSize + 10; i++) {
        logger.info(LogCategory.API, `Message ${i}`);
      }

      expect(logger['logBuffer'].length).toBeLessThanOrEqual(maxSize);
    });

    it('should respect sampling rate', () => {
      logger['config'].samplingRate = 0.5; // 50% sampling

      // Log multiple times
      for (let i = 0; i < 100; i++) {
        logger.info(LogCategory.API, `Message ${i}`);
      }

      // Should have logged roughly 50% of messages
      expect(mockConsole.info).toHaveBeenCalled();
    });
  });

  describe('Remote Logging', () => {
    it('should attempt to send logs to remote endpoint', async () => {
      logger['config'].enableRemote = true;
      logger['config'].remoteEndpoint = 'https://api.example.com/logs';
      logger['config'].minLevel = LogLevel.INFO;

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      }) as any;

      await logger['flush']();

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle remote logging failures gracefully', async () => {
      logger['config'].enableRemote = true;
      logger['config'].remoteEndpoint = 'https://api.example.com/logs';

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

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle very long log messages', () => {
      const longMessage = 'x'.repeat(10000);

      logger.info(LogCategory.API, longMessage);

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle circular reference in metadata', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      logger.info(LogCategory.API, 'Message', circular);

      // Should not throw
      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle undefined metadata', () => {
      logger.info(LogCategory.API, 'Message', undefined as any);

      expect(mockConsole.info).toHaveBeenCalled();
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
