import { describe, it, expect } from 'vitest';
import { isPathSafe } from './security.utils';

describe('isPathSafe', () => {
  const baseDir = '/app/rules';

  describe('safe paths', () => {
    it('accepts simple relative path', () => {
      expect(isPathSafe(baseDir, 'agents/test.json')).toBe(true);
    });

    it('accepts nested path', () => {
      expect(isPathSafe(baseDir, 'rules/core.md')).toBe(true);
    });

    it('accepts path equal to base (dot)', () => {
      expect(isPathSafe(baseDir, '.')).toBe(true);
    });

    it('accepts empty string as current directory', () => {
      expect(isPathSafe(baseDir, '')).toBe(true);
    });

    it('accepts deeply nested path', () => {
      expect(isPathSafe(baseDir, 'a/b/c/d/e.txt')).toBe(true);
    });
  });

  describe('unsafe paths - path traversal', () => {
    it('rejects simple path traversal', () => {
      expect(isPathSafe(baseDir, '../secret')).toBe(false);
    });

    it('rejects multiple level traversal', () => {
      expect(isPathSafe(baseDir, '../../../etc/passwd')).toBe(false);
    });

    it('rejects hidden traversal in middle of path', () => {
      expect(isPathSafe(baseDir, 'agents/../../secret')).toBe(false);
    });

    it('rejects traversal that ends up outside base', () => {
      expect(isPathSafe(baseDir, 'agents/../../../outside')).toBe(false);
    });
  });

  describe('unsafe paths - absolute paths', () => {
    it('rejects absolute path outside base', () => {
      expect(isPathSafe(baseDir, '/etc/passwd')).toBe(false);
    });

    it('rejects absolute path to different directory', () => {
      expect(isPathSafe(baseDir, '/var/log/syslog')).toBe(false);
    });
  });

  describe('cross-platform - Windows paths', () => {
    it('rejects backslash traversal', () => {
      expect(isPathSafe(baseDir, '..\\..\\etc\\passwd')).toBe(false);
    });

    it('rejects mixed slash traversal', () => {
      expect(isPathSafe(baseDir, '..\\../secret')).toBe(false);
    });

    it('normalizes backslashes in safe path', () => {
      expect(isPathSafe(baseDir, 'agents\\test.json')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('rejects path that starts with base but escapes', () => {
      // /app/rules/../secret resolves to /app/secret
      expect(isPathSafe(baseDir, '../rules-backup/secret')).toBe(false);
    });

    it('handles path with multiple consecutive slashes', () => {
      expect(isPathSafe(baseDir, 'agents//test.json')).toBe(true);
    });

    it('handles path with dot segments that stay inside', () => {
      // ./agents stays inside
      expect(isPathSafe(baseDir, './agents/test.json')).toBe(true);
    });

    it('rejects null byte injection attempt', () => {
      expect(isPathSafe(baseDir, 'agents/test.json\x00.txt')).toBe(false);
    });
  });
});
