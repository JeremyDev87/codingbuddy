import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  asyncWithFallback,
  withTimeout,
  TimeoutError,
  getConfiguredTimeout,
  resetTimeoutCache,
} from './async.utils';

describe('async.utils', () => {
  describe('asyncWithFallback', () => {
    let mockLogger: Logger;

    beforeEach(() => {
      mockLogger = new Logger();
      mockLogger.debug = vi.fn();
    });

    it('should return result from fn when successful', async () => {
      const result = await asyncWithFallback({
        fn: async () => ({ success: true }),
        fallback: { success: false },
        errorMessage: 'Failed: ${error}',
        logger: mockLogger,
      });

      expect(result).toEqual({ success: true });
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    it('should return fallback value when fn throws error', async () => {
      const result = await asyncWithFallback({
        fn: async () => {
          throw new Error('Operation failed');
        },
        fallback: { success: false },
        errorMessage: 'Failed: ${error}',
        logger: mockLogger,
      });

      expect(result).toEqual({ success: false });
    });

    it('should log error message with error text interpolation', async () => {
      await asyncWithFallback({
        fn: async () => {
          throw new Error('Config not found');
        },
        fallback: {},
        errorMessage: 'Failed to load config: ${error}',
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Failed to load config: Config not found',
      );
    });

    it('should handle non-Error exceptions with "Unknown error" text', async () => {
      await asyncWithFallback({
        fn: async () => {
          // Testing non-Error exception handling (intentional for testing)
          throw 'string error';
        },
        fallback: null,
        errorMessage: 'Operation failed: ${error}',
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Operation failed: Unknown error',
      );
    });

    it('should work without logger (silent mode)', async () => {
      const result = await asyncWithFallback({
        fn: async () => {
          throw new Error('Silent error');
        },
        fallback: 'default',
        errorMessage: 'Error: ${error}',
      });

      expect(result).toBe('default');
      // Should not throw even without logger
    });

    it('should preserve error message placeholder if ${error} not present', async () => {
      await asyncWithFallback({
        fn: async () => {
          throw new Error('Test error');
        },
        fallback: {},
        errorMessage: 'Static error message',
        logger: mockLogger,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Static error message');
    });

    it('should work with primitive fallback values', async () => {
      const stringResult = await asyncWithFallback({
        fn: async () => {
          throw new Error('Error');
        },
        fallback: 'default-string',
        errorMessage: 'Failed: ${error}',
      });

      const numberResult = await asyncWithFallback({
        fn: async () => {
          throw new Error('Error');
        },
        fallback: 42,
        errorMessage: 'Failed: ${error}',
      });

      const boolResult = await asyncWithFallback({
        fn: async () => {
          throw new Error('Error');
        },
        fallback: false,
        errorMessage: 'Failed: ${error}',
      });

      expect(stringResult).toBe('default-string');
      expect(numberResult).toBe(42);
      expect(boolResult).toBe(false);
    });

    it('should work with undefined fallback value', async () => {
      const result = await asyncWithFallback({
        fn: async () => {
          throw new Error('Error');
        },
        fallback: undefined,
        errorMessage: 'Failed: ${error}',
        logger: mockLogger,
      });

      expect(result).toBeUndefined();
    });

    it('should handle async functions that return promises', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'delayed-result';
      };

      const result = await asyncWithFallback({
        fn: asyncFn,
        fallback: 'fallback',
        errorMessage: 'Failed: ${error}',
      });

      expect(result).toBe('delayed-result');
    });

    it('should handle multiple ${error} placeholders in message', async () => {
      await asyncWithFallback({
        fn: async () => {
          throw new Error('Network timeout');
        },
        fallback: null,
        errorMessage: 'Error occurred: ${error}, details: ${error}',
        logger: mockLogger,
      });

      // replace() only replaces first occurrence in JavaScript
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Error occurred: Network timeout, details: ${error}',
      );
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve with the promise result when within timeout', async () => {
      const promise = Promise.resolve('success');

      const resultPromise = withTimeout(promise, { timeoutMs: 1000 });
      await vi.advanceTimersByTimeAsync(0);

      const result = await resultPromise;
      expect(result).toBe('success');
    });

    it('should throw TimeoutError when promise exceeds timeout', async () => {
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const resultPromise = withTimeout(slowPromise, {
        timeoutMs: 100,
        operationName: 'slow operation',
      });

      // Advance time and catch the rejection immediately
      vi.advanceTimersByTime(150);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as Error).message).toBe(
          'slow operation timed out after 100ms',
        );
      }
    });

    it('should use default timeout of 5000ms', async () => {
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('result'), 6000);
      });

      const resultPromise = withTimeout(slowPromise, {
        operationName: 'test op',
      });

      // Advance time and catch the rejection immediately
      vi.advanceTimersByTime(5100);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as Error).message).toBe('test op timed out after 5000ms');
      }
    });

    it('should use default operation name', async () => {
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('result'), 1000);
      });

      const resultPromise = withTimeout(slowPromise, { timeoutMs: 100 });

      // Advance time and catch the rejection immediately
      vi.advanceTimersByTime(150);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as Error).message).toBe(
          'operation timed out after 100ms',
        );
      }
    });

    it('should clear timeout after promise resolves', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const promise = Promise.resolve('done');

      await withTimeout(promise, { timeoutMs: 1000 });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout after promise rejects', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const promise = Promise.reject(new Error('original error'));

      await expect(withTimeout(promise, { timeoutMs: 1000 })).rejects.toThrow(
        'original error',
      );

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should propagate original error when promise rejects before timeout', async () => {
      const promise = Promise.reject(new Error('original rejection'));

      await expect(withTimeout(promise, { timeoutMs: 1000 })).rejects.toThrow(
        'original rejection',
      );
    });

    it('TimeoutError should have correct name property', () => {
      const error = new TimeoutError('test');
      expect(error.name).toBe('TimeoutError');
      expect(error.message).toBe('test');
      expect(error instanceof Error).toBe(true);
    });

    it('TimeoutError should include operation context', () => {
      const error = new TimeoutError(
        'read file timed out after 3000ms',
        'read file',
        3000,
      );
      expect(error.operationName).toBe('read file');
      expect(error.timeoutMs).toBe(3000);
    });

    it('TimeoutError should have default values when context not provided', () => {
      const error = new TimeoutError('timeout');
      expect(error.operationName).toBe('unknown');
      expect(error.timeoutMs).toBe(0);
    });

    it('should include context in TimeoutError when timeout occurs', async () => {
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('too late'), 2000);
      });

      const resultPromise = withTimeout(slowPromise, {
        timeoutMs: 100,
        operationName: 'test operation',
      });

      vi.advanceTimersByTime(150);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        const timeoutError = error as TimeoutError;
        expect(timeoutError.operationName).toBe('test operation');
        expect(timeoutError.timeoutMs).toBe(100);
      }
    });
  });

  describe('configurable timeout', () => {
    const originalEnv = process.env.CODINGBUDDY_FILE_TIMEOUT_MS;

    beforeEach(() => {
      vi.useFakeTimers();
      resetTimeoutCache(); // Reset cache before each test
    });

    afterEach(() => {
      vi.useRealTimers();
      resetTimeoutCache(); // Reset cache after each test
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_FILE_TIMEOUT_MS = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_FILE_TIMEOUT_MS;
      }
    });

    it('should use environment variable timeout when set', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '2000';

      // Need to re-import to pick up env change - test the behavior instead
      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('result'), 3000);
      });

      // Without explicit timeoutMs, should use env value (2000ms)
      const resultPromise = withTimeout(slowPromise, {
        operationName: 'env timeout test',
      });

      // At 1500ms, should still be waiting
      vi.advanceTimersByTime(1500);

      // At 2500ms (after 2000ms timeout), should have timed out
      vi.advanceTimersByTime(1000);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).timeoutMs).toBe(2000);
      }
    });

    it('should ignore invalid environment variable values', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = 'invalid';

      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, {});

      expect(result).toBe('success');
    });

    it('should ignore negative environment variable values', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '-1000';

      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, {});

      expect(result).toBe('success');
    });

    it('should prefer explicit timeoutMs over environment variable', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '10000';

      const slowPromise = new Promise(resolve => {
        setTimeout(() => resolve('result'), 500);
      });

      // Explicit 100ms should override env 10000ms
      const resultPromise = withTimeout(slowPromise, {
        timeoutMs: 100,
        operationName: 'explicit timeout test',
      });

      vi.advanceTimersByTime(150);

      try {
        await resultPromise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).timeoutMs).toBe(100);
      }
    });

    it('should reject values exceeding max timeout (300000ms)', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '500000'; // 500 seconds, exceeds max

      const timeout = getConfiguredTimeout();

      // Should fall back to default (5000ms) when exceeding max
      expect(timeout).toBe(5000);
    });

    it('should accept values at max timeout boundary', async () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '300000'; // Exactly max

      const timeout = getConfiguredTimeout();

      expect(timeout).toBe(300000);
    });

    it('should cache timeout value after first read', () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '3000';

      // First read should cache
      const firstRead = getConfiguredTimeout();
      expect(firstRead).toBe(3000);

      // Change env variable
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '9000';

      // Second read should return cached value
      const secondRead = getConfiguredTimeout();
      expect(secondRead).toBe(3000); // Still 3000, not 9000

      // After reset, should read new value
      resetTimeoutCache();
      const afterReset = getConfiguredTimeout();
      expect(afterReset).toBe(9000);
    });

    it('resetTimeoutCache should clear cached value', () => {
      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '1000';
      getConfiguredTimeout(); // Cache the value

      process.env.CODINGBUDDY_FILE_TIMEOUT_MS = '2000';
      expect(getConfiguredTimeout()).toBe(1000); // Still cached

      resetTimeoutCache();
      expect(getConfiguredTimeout()).toBe(2000); // Now reads new value
    });
  });
});
