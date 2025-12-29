import { describe, it, expect } from 'vitest';

/**
 * Parse CORS origin configuration from environment variable
 * (Duplicated for testing - extracted from main.ts)
 */
function parseCorsOrigin(
  corsOrigin: string | undefined,
): string | string[] | boolean {
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
      expect(parseCorsOrigin('https://example.com')).toBe(
        'https://example.com',
      );
    });

    it('should handle localhost', () => {
      expect(parseCorsOrigin('http://localhost:3000')).toBe(
        'http://localhost:3000',
      );
    });
  });

  describe('multiple origins configuration', () => {
    it('should return array for comma-separated origins', () => {
      const result = parseCorsOrigin(
        'https://example.com,https://api.example.com',
      );
      expect(result).toEqual([
        'https://example.com',
        'https://api.example.com',
      ]);
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
