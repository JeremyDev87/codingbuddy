import { describe, it, expect } from 'vitest';
import {
  isPathSafe,
  validatePath,
  assertPathSafe,
  sanitizeHandlerArgs,
} from './security.utils';

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

describe('validatePath', () => {
  const baseDir = '/app/rules';

  describe('valid paths', () => {
    it('accepts simple relative path', () => {
      const result = validatePath('agents/test.json', { basePath: baseDir });
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toContain('agents');
    });

    it('returns resolved absolute path', () => {
      const result = validatePath('core.md', { basePath: baseDir });
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toMatch(/^\/.*core\.md$/);
    });
  });

  describe('null byte detection', () => {
    it('rejects null byte in path', () => {
      const result = validatePath('test\x00.json', { basePath: baseDir });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('null bytes');
    });
  });

  describe('absolute path handling', () => {
    it('rejects absolute paths by default', () => {
      const result = validatePath('/etc/passwd', { basePath: baseDir });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Absolute paths are not allowed');
    });

    it('allows absolute paths when explicitly enabled', () => {
      const result = validatePath('/app/rules/test.json', {
        basePath: baseDir,
        allowAbsolute: true,
      });
      expect(result.valid).toBe(true);
    });

    it('still validates containment for absolute paths', () => {
      const result = validatePath('/etc/passwd', {
        basePath: baseDir,
        allowAbsolute: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('escapes base directory');
    });
  });

  describe('path traversal detection', () => {
    it('rejects path traversal attempts', () => {
      const result = validatePath('../secret', { basePath: baseDir });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('escapes base directory');
    });

    it('rejects hidden traversal in path', () => {
      const result = validatePath('agents/../../secret', { basePath: baseDir });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('escapes base directory');
    });
  });

  describe('file extension restrictions', () => {
    it('allows valid extension', () => {
      const result = validatePath('test.json', {
        basePath: baseDir,
        allowedExtensions: ['.json', '.md'],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects disallowed extension', () => {
      const result = validatePath('test.exe', {
        basePath: baseDir,
        allowedExtensions: ['.json', '.md'],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('normalizes extension with dot prefix', () => {
      const result = validatePath('test.json', {
        basePath: baseDir,
        allowedExtensions: ['json'],
      });
      expect(result.valid).toBe(true);
    });

    it('handles case-insensitive extensions', () => {
      const result = validatePath('test.JSON', {
        basePath: baseDir,
        allowedExtensions: ['.json'],
      });
      expect(result.valid).toBe(true);
    });

    it('skips extension check when not specified', () => {
      const result = validatePath('test.anything', { basePath: baseDir });
      expect(result.valid).toBe(true);
    });
  });
});

describe('assertPathSafe', () => {
  const baseDir = '/app/rules';

  it('returns resolved path for valid input', () => {
    const result = assertPathSafe('agents/test.json', { basePath: baseDir });
    expect(result).toContain('agents');
    expect(result).toContain('test.json');
  });

  it('throws for invalid path', () => {
    expect(() => assertPathSafe('../secret', { basePath: baseDir })).toThrow(
      'Path validation failed',
    );
  });

  it('throws with descriptive error message', () => {
    expect(() =>
      assertPathSafe('test\x00.json', { basePath: baseDir }),
    ).toThrow('null bytes');
  });

  it('throws for disallowed extension', () => {
    expect(() =>
      assertPathSafe('test.exe', {
        basePath: baseDir,
        allowedExtensions: ['.json'],
      }),
    ).toThrow('not allowed');
  });
});

describe('sanitizeHandlerArgs', () => {
  describe('safe args', () => {
    it('accepts undefined args', () => {
      const result = sanitizeHandlerArgs(undefined);
      expect(result.safe).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts empty object', () => {
      const result = sanitizeHandlerArgs({});
      expect(result.safe).toBe(true);
    });

    it('accepts normal string args', () => {
      const result = sanitizeHandlerArgs({ query: 'test', name: 'value' });
      expect(result.safe).toBe(true);
    });

    it('accepts nested objects without dangerous keys', () => {
      const result = sanitizeHandlerArgs({
        query: 'test',
        options: { nested: { value: 123 } },
      });
      expect(result.safe).toBe(true);
    });

    it('accepts arrays', () => {
      const result = sanitizeHandlerArgs({
        files: ['file1.ts', 'file2.ts'],
        domains: ['security', 'performance'],
      });
      expect(result.safe).toBe(true);
    });
  });

  describe('dangerous args - prototype pollution', () => {
    // Note: JavaScript treats { __proto__: ... } specially in object literals.
    // To properly test __proto__ as a key, we need to use Object.defineProperty
    // or create objects that simulate JSON.parse behavior (which does create __proto__ as a key)

    it('rejects __proto__ at top level', () => {
      // Simulate what JSON.parse would create
      const args = JSON.parse('{"__proto__": {"polluted": true}}');
      const result = sanitizeHandlerArgs(args);
      expect(result.safe).toBe(false);
      expect(result.error).toContain('__proto__');
    });

    it('rejects constructor at top level', () => {
      const result = sanitizeHandlerArgs({ constructor: { polluted: true } });
      expect(result.safe).toBe(false);
      expect(result.error).toContain('constructor');
    });

    it('rejects prototype at top level', () => {
      const result = sanitizeHandlerArgs({ prototype: { polluted: true } });
      expect(result.safe).toBe(false);
      expect(result.error).toContain('prototype');
    });

    it('rejects __proto__ in nested object', () => {
      const args = JSON.parse(
        '{"query": "test", "options": {"__proto__": {"polluted": true}}}',
      );
      const result = sanitizeHandlerArgs(args);
      expect(result.safe).toBe(false);
      expect(result.error).toContain('options.__proto__');
    });

    it('rejects dangerous keys in deeply nested objects', () => {
      const args = JSON.parse(
        '{"level1": {"level2": {"level3": {"__proto__": {}}}}}',
      );
      const result = sanitizeHandlerArgs(args);
      expect(result.safe).toBe(false);
      expect(result.error).toContain('level1.level2.level3.__proto__');
    });

    it('rejects dangerous keys in arrays', () => {
      const args = JSON.parse(
        '{"items": [{"name": "safe"}, {"__proto__": {}}]}',
      );
      const result = sanitizeHandlerArgs(args);
      expect(result.safe).toBe(false);
      expect(result.error).toContain('items[1].__proto__');
    });
  });
});
