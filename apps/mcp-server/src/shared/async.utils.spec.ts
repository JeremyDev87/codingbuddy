import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { asyncWithFallback } from './async.utils';

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
});
