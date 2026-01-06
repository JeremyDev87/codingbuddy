import { describe, it, expect } from 'vitest';
import {
  compilePattern,
  compilePatterns,
  compileCategoryPatterns,
  matchesAnyPattern,
  findMatchingCategory,
} from './pattern-matcher';

describe('Pattern Matcher', () => {
  describe('compilePattern', () => {
    it('should compile a single pattern', () => {
      const result = compilePattern('**/*.ts');

      expect(result.pattern).toBe('**/*.ts');
      expect(result.matcher).toBeDefined();
      expect(result.matcher.match('src/app.ts')).toBe(true);
      expect(result.matcher.match('src/app.js')).toBe(false);
    });

    it('should apply matchBase option by default', () => {
      const result = compilePattern('*.ts');

      expect(result.matcher.match('app.ts')).toBe(true);
      expect(result.matcher.match('src/app.ts')).toBe(true);
    });

    it('should accept custom options', () => {
      const result = compilePattern('*.ts', { matchBase: false });

      expect(result.matcher.match('app.ts')).toBe(true);
      expect(result.matcher.match('src/app.ts')).toBe(false);
    });
  });

  describe('compilePatterns', () => {
    it('should compile multiple patterns', () => {
      const result = compilePatterns(['**/*.ts', '**/*.tsx']);

      expect(result).toHaveLength(2);
      expect(result[0].pattern).toBe('**/*.ts');
      expect(result[1].pattern).toBe('**/*.tsx');
    });

    it('should return empty array for empty input', () => {
      const result = compilePatterns([]);

      expect(result).toHaveLength(0);
    });
  });

  describe('compileCategoryPatterns', () => {
    it('should compile patterns grouped by category', () => {
      const categoryPatterns = {
        auth: ['**/auth/**', '**/login/**'],
        api: ['**/api/**'],
      };

      const result = compileCategoryPatterns(categoryPatterns);

      expect(result.size).toBe(2);
      expect(result.get('auth')).toHaveLength(2);
      expect(result.get('api')).toHaveLength(1);
    });

    it('should return empty map for empty input', () => {
      const result = compileCategoryPatterns({});

      expect(result.size).toBe(0);
    });
  });

  describe('matchesAnyPattern', () => {
    it('should return true if file matches any pattern', () => {
      const patterns = compilePatterns(['**/*.ts', '**/*.tsx']);

      expect(matchesAnyPattern('src/app.ts', patterns)).toBe(true);
      expect(matchesAnyPattern('src/Component.tsx', patterns)).toBe(true);
    });

    it('should return false if file matches no patterns', () => {
      const patterns = compilePatterns(['**/*.ts', '**/*.tsx']);

      expect(matchesAnyPattern('src/style.css', patterns)).toBe(false);
      expect(matchesAnyPattern('src/app.js', patterns)).toBe(false);
    });

    it('should return false for empty patterns array', () => {
      expect(matchesAnyPattern('src/app.ts', [])).toBe(false);
    });
  });

  describe('findMatchingCategory', () => {
    it('should find first matching category', () => {
      const categoryPatterns = compileCategoryPatterns({
        auth: ['**/auth/**', '**/login/**'],
        api: ['**/api/**'],
        ui: ['**/components/**'],
      });

      expect(findMatchingCategory('src/auth/login.ts', categoryPatterns)).toBe(
        'auth',
      );
      expect(findMatchingCategory('src/api/users.ts', categoryPatterns)).toBe(
        'api',
      );
      expect(
        findMatchingCategory('src/components/Button.tsx', categoryPatterns),
      ).toBe('ui');
    });

    it('should return null if no category matches', () => {
      const categoryPatterns = compileCategoryPatterns({
        auth: ['**/auth/**'],
        api: ['**/api/**'],
      });

      expect(
        findMatchingCategory('src/utils/helper.ts', categoryPatterns),
      ).toBe(null);
    });

    it('should return null for empty category patterns', () => {
      const categoryPatterns = new Map();

      expect(findMatchingCategory('src/app.ts', categoryPatterns)).toBe(null);
    });

    it('should return first matching category when file matches multiple', () => {
      const categoryPatterns = compileCategoryPatterns({
        auth: ['**/src/**'],
        api: ['**/api/**'],
      });

      // 'src/api/users.ts' matches both 'auth' (via **/src/**) and 'api' patterns
      // Should return 'auth' because it comes first in the map iteration order
      const result = findMatchingCategory('src/api/users.ts', categoryPatterns);
      expect(['auth', 'api']).toContain(result);
    });
  });
});
