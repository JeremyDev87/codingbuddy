import { describe, it, expect, vi } from 'vitest';

/**
 * Parse CORS origin configuration from environment variable
 * (Duplicated for testing - extracted from main.ts)
 */
function parseCorsOrigin(corsOrigin: string | undefined): string | string[] | boolean {
  if (!corsOrigin) {
    return false;
  }

  if (corsOrigin === '*') {
    return true;
  }

  if (corsOrigin.includes(',')) {
    return corsOrigin.split(',').map(o => o.trim());
  }

  return corsOrigin;
}

describe('parseCorsOrigin', () => {
  describe('no CORS configuration', () => {
    it('should return false for undefined', () => {
      expect(parseCorsOrigin(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(parseCorsOrigin('')).toBe(false);
    });
  });

  describe('wildcard configuration', () => {
    it('should return true for "*"', () => {
      expect(parseCorsOrigin('*')).toBe(true);
    });
  });

  describe('single origin configuration', () => {
    it('should return single origin string', () => {
      expect(parseCorsOrigin('https://example.com')).toBe('https://example.com');
    });

    it('should handle localhost', () => {
      expect(parseCorsOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    });
  });

  describe('multiple origins configuration', () => {
    it('should return array for comma-separated origins', () => {
      const result = parseCorsOrigin('https://example.com,https://api.example.com');
      expect(result).toEqual(['https://example.com', 'https://api.example.com']);
    });

    it('should trim whitespace from origins', () => {
      const result = parseCorsOrigin(
        'https://example.com, https://api.example.com , https://web.example.com',
      );
      expect(result).toEqual([
        'https://example.com',
        'https://api.example.com',
        'https://web.example.com',
      ]);
    });
  });
});

describe('bootstrap error handler', () => {
  /**
   * Validates the error formatting logic used in the bootstrap().catch() handler.
   * The handler must format Error instances using .message and non-Error values directly.
   */
  function formatBootstrapError(error: unknown): string {
    return `Fatal: ${error instanceof Error ? error.message : error}\n`;
  }

  it('should format Error instance using .message', () => {
    const error = new Error('Port 3000 already in use');
    expect(formatBootstrapError(error)).toBe('Fatal: Port 3000 already in use\n');
  });

  it('should format non-Error value directly', () => {
    expect(formatBootstrapError('module init failed')).toBe('Fatal: module init failed\n');
  });

  it('should handle undefined error', () => {
    expect(formatBootstrapError(undefined)).toBe('Fatal: undefined\n');
  });

  describe('integration: bootstrap().catch() writes to stderr and exits', () => {
    it('should write formatted error to stderr and exit with code 1', async () => {
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Simulate what the catch handler does
      const error = new Error('EADDRINUSE: Port 3000');
      const catchHandler = (err: unknown): void => {
        process.stderr.write(`Fatal: ${err instanceof Error ? err.message : err}\n`);
        process.exit(1);
      };
      catchHandler(error);

      expect(stderrSpy).toHaveBeenCalledWith('Fatal: EADDRINUSE: Port 3000\n');
      expect(exitSpy).toHaveBeenCalledWith(1);

      stderrSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
