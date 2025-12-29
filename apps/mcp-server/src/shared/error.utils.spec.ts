import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sanitizeError } from './error.utils';

describe('sanitizeError', () => {
  const originalEnv = process.env.CODINGBUDDY_DEBUG;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CODINGBUDDY_DEBUG;
    } else {
      process.env.CODINGBUDDY_DEBUG = originalEnv;
    }
  });

  describe('production mode (CODINGBUDDY_DEBUG not set)', () => {
    beforeEach(() => {
      delete process.env.CODINGBUDDY_DEBUG;
    });

    it('should return generic message for Error with internal path', () => {
      const error = new Error(
        'ENOENT: no such file or directory, open /Users/jeremy/workspace/secret.txt',
      );
      const result = sanitizeError(error);
      expect(result).toBe('An internal error occurred');
      expect(result).not.toContain('/Users');
      expect(result).not.toContain('jeremy');
    });

    it('should not leak stack trace info (only message is checked)', () => {
      // Stack traces are not exposed to clients, only messages are
      // So even if stack has paths, a clean message should be returned as-is
      const error = new Error('Something went wrong');
      error.stack =
        'Error: Something went wrong\n    at Object.<anonymous> (/Users/jeremy/app/index.js:10:15)';
      const result = sanitizeError(error);
      // Message is clean, so it should be returned
      expect(result).toBe('Something went wrong');
      expect(result).not.toContain('index.js');
    });

    it('should preserve safe error messages without paths', () => {
      const error = new Error('Invalid input format');
      const result = sanitizeError(error);
      expect(result).toBe('Invalid input format');
    });

    it('should preserve validation error messages', () => {
      const error = new Error(
        'Query exceeds maximum length of 1000 characters',
      );
      const result = sanitizeError(error);
      expect(result).toBe('Query exceeds maximum length of 1000 characters');
    });

    it('should handle string errors', () => {
      const result = sanitizeError('Simple string error');
      expect(result).toBe('Simple string error');
    });

    it('should handle unknown error types', () => {
      const result = sanitizeError({ custom: 'error object' });
      expect(result).toBe('An internal error occurred');
    });

    it('should handle null/undefined', () => {
      expect(sanitizeError(null)).toBe('An internal error occurred');
      expect(sanitizeError(undefined)).toBe('An internal error occurred');
    });

    it('should sanitize Windows-style paths', () => {
      const error = new Error(
        'Error reading C:\\Users\\jeremy\\Documents\\secret.txt',
      );
      const result = sanitizeError(error);
      expect(result).toBe('An internal error occurred');
      expect(result).not.toContain('C:\\');
    });

    it('should sanitize module paths', () => {
      const error = new Error(
        "Cannot find module '/app/node_modules/some-package'",
      );
      const result = sanitizeError(error);
      expect(result).toBe('An internal error occurred');
      expect(result).not.toContain('node_modules');
    });
  });

  describe('debug mode (CODINGBUDDY_DEBUG=true)', () => {
    beforeEach(() => {
      process.env.CODINGBUDDY_DEBUG = 'true';
    });

    it('should return full error message with paths', () => {
      const error = new Error(
        'ENOENT: no such file or directory, open /Users/jeremy/workspace/secret.txt',
      );
      const result = sanitizeError(error);
      expect(result).toContain('/Users/jeremy');
      expect(result).toContain('secret.txt');
    });

    it('should return full error for any Error object', () => {
      const error = new Error('Detailed internal error');
      const result = sanitizeError(error);
      expect(result).toBe('Detailed internal error');
    });

    it('should handle string errors', () => {
      const result = sanitizeError('Debug string error');
      expect(result).toBe('Debug string error');
    });

    it('should show unknown error type info', () => {
      const result = sanitizeError({ custom: 'error' });
      expect(result).toContain('Unknown error');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      delete process.env.CODINGBUDDY_DEBUG;
    });

    it('should handle Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error at /secret/path');
      const result = sanitizeError(error);
      expect(result).toBe('An internal error occurred');
    });

    it('should handle errors with circular references gracefully', () => {
      const error = new Error('Circular');
      (error as unknown as Record<string, unknown>).self = error;
      const result = sanitizeError(error);
      expect(typeof result).toBe('string');
    });
  });
});
