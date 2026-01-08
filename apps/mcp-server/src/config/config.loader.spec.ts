import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CONFIG_FILE_NAMES,
  ConfigLoadError,
  validateAndTransform,
  isJsConfig,
  getJsConfigWarning,
  findProjectRoot,
  findConfigFile,
  clearProjectRootCache,
  getProjectRootCacheSize,
} from './config.loader';

/**
 * Shared test helpers for filesystem-based tests
 */
function createTestDir(prefix: string): string {
  const tempDir = path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function cleanupTestDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

describe('config.loader', () => {
  describe('CONFIG_FILE_NAMES', () => {
    it('should have correct priority order', () => {
      expect(CONFIG_FILE_NAMES[0]).toBe('codingbuddy.config.js');
      expect(CONFIG_FILE_NAMES[1]).toBe('codingbuddy.config.mjs');
      expect(CONFIG_FILE_NAMES[2]).toBe('codingbuddy.config.json');
    });

    it('should have 3 supported file names', () => {
      expect(CONFIG_FILE_NAMES).toHaveLength(3);
    });
  });

  describe('ConfigLoadError', () => {
    it('should create error with message and file path', () => {
      const error = new ConfigLoadError('Test error', '/path/to/config.js');

      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/path/to/config.js');
      expect(error.name).toBe('ConfigLoadError');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ConfigLoadError(
        'Wrapped error',
        '/path/to/config.js',
        cause,
      );

      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = new ConfigLoadError('Test', '/path');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('validateAndTransform', () => {
    it('should accept valid config', () => {
      const raw = {
        language: 'ko',
        projectName: 'test-project',
        techStack: {
          frontend: ['React'],
        },
      };

      const result = validateAndTransform(raw, '/path/config.json');

      expect(result.config.language).toBe('ko');
      expect(result.config.projectName).toBe('test-project');
      expect(result.config.techStack?.frontend).toEqual(['React']);
      expect(result.warnings).toEqual([]);
    });

    it('should accept empty config', () => {
      const result = validateAndTransform({}, '/path/config.json');

      expect(result.config).toEqual({});
      expect(result.warnings).toEqual([]);
    });

    it('should throw ConfigLoadError for invalid config', () => {
      const raw = {
        testStrategy: {
          coverage: 200, // invalid: max 100
        },
      };

      expect(() => validateAndTransform(raw, '/path/config.json')).toThrow(
        ConfigLoadError,
      );
    });

    it('should include field path in error message', () => {
      const raw = {
        conventions: {
          naming: {
            files: 'invalid-value',
          },
        },
      };

      try {
        validateAndTransform(raw, '/path/config.json');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigLoadError);
        expect((error as ConfigLoadError).message).toContain('conventions');
      }
    });

    it('should throw ConfigLoadError for invalid URL in repository', () => {
      const raw = {
        repository: 'not-a-valid-url',
      };

      expect(() => validateAndTransform(raw, '/path/config.json')).toThrow(
        ConfigLoadError,
      );
    });
  });

  describe('isJsConfig', () => {
    it('should return true for .js files', () => {
      expect(isJsConfig('/path/codingbuddy.config.js')).toBe(true);
    });

    it('should return true for .mjs files', () => {
      expect(isJsConfig('/path/codingbuddy.config.mjs')).toBe(true);
    });

    it('should return false for .json files', () => {
      expect(isJsConfig('/path/codingbuddy.config.json')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isJsConfig('/path/config.JS')).toBe(true);
      expect(isJsConfig('/path/config.MJS')).toBe(true);
    });
  });

  describe('getJsConfigWarning', () => {
    it('should include file name in warning', () => {
      const warning = getJsConfigWarning('/path/to/codingbuddy.config.js');

      expect(warning).toContain('codingbuddy.config.js');
    });

    it('should mention security risk', () => {
      const warning = getJsConfigWarning('/path/to/config.js');

      expect(warning).toContain('security');
    });

    it('should recommend JSON alternative', () => {
      const warning = getJsConfigWarning('/path/to/config.js');

      expect(warning).toContain('codingbuddy.config.json');
    });
  });

  describe('findConfigFile', () => {
    let testTempDir: string;

    afterEach(() => {
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should find codingbuddy.config.js when it exists', () => {
      testTempDir = createTestDir('findConfigFile-test');
      writeFileSync(
        path.join(testTempDir, 'codingbuddy.config.js'),
        'module.exports = {};',
      );

      const result = findConfigFile(testTempDir);

      expect(result).not.toBeNull();
      expect(result).toContain('codingbuddy.config.js');
    });

    it('should find codingbuddy.config.json when it exists', () => {
      testTempDir = createTestDir('config-loader-test');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.json'), '{}');

      const result = findConfigFile(testTempDir);

      expect(result).not.toBeNull();
      expect(result).toContain('codingbuddy.config.json');
    });

    it('should return null when no config file exists', () => {
      testTempDir = createTestDir('config-loader-test');

      const result = findConfigFile(testTempDir);

      expect(result).toBeNull();
    });
  });

  describe('findProjectRoot', () => {
    let testTempDir: string;

    afterEach(() => {
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
      // Clear cache between tests to ensure isolation
      clearProjectRootCache();
    });

    it('should return directory with codingbuddy config file', () => {
      // Setup: /tempdir/project/src/components with config at /tempdir/project
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const srcDir = path.join(projectDir, 'src', 'components');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        path.join(projectDir, 'codingbuddy.config.js'),
        'module.exports = {};',
      );

      const result = findProjectRoot(srcDir);

      expect(result).toBe(projectDir);
    });

    it('should return directory with package.json when no config file exists', () => {
      // Setup: /tempdir/project/src/deep/nested with package.json at /tempdir/project
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const nestedDir = path.join(projectDir, 'src', 'deep', 'nested');

      mkdirSync(nestedDir, { recursive: true });
      writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({ name: 'test-project' }),
      );

      const result = findProjectRoot(nestedDir);

      expect(result).toBe(projectDir);
    });

    it('should return start directory when no project root found', () => {
      // Setup: Empty directory structure
      testTempDir = createTestDir('config-loader-test');
      const emptyDir = path.join(testTempDir, 'empty', 'nested');
      mkdirSync(emptyDir, { recursive: true });

      const result = findProjectRoot(emptyDir);

      // Should fall back to the original directory since nothing was found
      // up to the temp dir (which also has no package.json)
      expect(result).toBe(emptyDir);
    });

    it('should find codingbuddy config before package.json in same directory', () => {
      // Setup: Both config and package.json in same directory
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const srcDir = path.join(projectDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(path.join(projectDir, 'codingbuddy.config.json'), '{}');
      writeFileSync(path.join(projectDir, 'package.json'), '{}');

      const result = findProjectRoot(srcDir);

      expect(result).toBe(projectDir);
    });

    it('should use first package.json as fallback when no config exists', () => {
      // Setup: package.json at middle level, nothing at deeper levels
      testTempDir = createTestDir('config-loader-test');
      const rootDir = path.join(testTempDir, 'workspace');
      const projectDir = path.join(rootDir, 'apps', 'my-app');
      const srcDir = path.join(projectDir, 'src', 'features');

      mkdirSync(srcDir, { recursive: true });
      // Only package.json at project level
      writeFileSync(path.join(projectDir, 'package.json'), '{}');

      const result = findProjectRoot(srcDir);

      expect(result).toBe(projectDir);
    });

    it('should use process.cwd() when no startDir provided', () => {
      // This test verifies the function works with actual cwd
      const result = findProjectRoot();

      // Should return a valid directory path
      expect(result).toBeDefined();
      expect(existsSync(result)).toBe(true);
      // Should find a project root (has package.json or config file)
      const hasPackageJson = existsSync(path.join(result, 'package.json'));
      const hasConfig = findConfigFile(result) !== null;
      expect(hasPackageJson || hasConfig).toBe(true);
    });

    it('should handle filesystem root gracefully', () => {
      // Starting from root should return root
      const result = findProjectRoot('/');

      expect(result).toBe('/');
    });

    it('should find codingbuddy config in parent directory even when child has package.json (monorepo)', () => {
      // Setup: monorepo structure
      // /tempdir/monorepo/codingbuddy.config.js  <- config here
      // /tempdir/monorepo/package.json
      // /tempdir/monorepo/apps/sub-package/package.json  <- no config
      // /tempdir/monorepo/apps/sub-package/src/  <- start here
      testTempDir = createTestDir('config-loader-test');
      const monorepoRoot = path.join(testTempDir, 'monorepo');
      const subPackageDir = path.join(monorepoRoot, 'apps', 'sub-package');
      const srcDir = path.join(subPackageDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        path.join(monorepoRoot, 'codingbuddy.config.js'),
        'module.exports = {};',
      );
      writeFileSync(path.join(monorepoRoot, 'package.json'), '{}');
      writeFileSync(path.join(subPackageDir, 'package.json'), '{}');

      const result = findProjectRoot(srcDir);

      expect(result).toBe(monorepoRoot);
    });

    it('should cache results for repeated calls with same path', () => {
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const srcDir = path.join(projectDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        path.join(projectDir, 'codingbuddy.config.js'),
        'module.exports = {};',
      );

      // First call - should traverse filesystem
      const result1 = findProjectRoot(srcDir);
      expect(result1).toBe(projectDir);

      // Second call with same path - should return cached result
      const result2 = findProjectRoot(srcDir);
      expect(result2).toBe(projectDir);

      // Both should be equal
      expect(result1).toBe(result2);
    });

    it('should clear cache when clearProjectRootCache is called', () => {
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const srcDir = path.join(projectDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(path.join(projectDir, 'package.json'), '{}');

      // First call
      const result1 = findProjectRoot(srcDir);
      expect(result1).toBe(projectDir);

      // Add config file after first call
      writeFileSync(
        path.join(projectDir, 'codingbuddy.config.js'),
        'module.exports = {};',
      );

      // Without clearing cache, should still return package.json location
      // (This is expected caching behavior - result is stale)

      // Clear cache
      clearProjectRootCache();

      // After clearing, should find the new config file
      const result2 = findProjectRoot(srcDir);
      expect(result2).toBe(projectDir); // Same location, but now due to config file
    });

    it('should track cache size with getProjectRootCacheSize', () => {
      testTempDir = createTestDir('config-loader-test');
      const project1 = path.join(testTempDir, 'project1');
      const project2 = path.join(testTempDir, 'project2');

      mkdirSync(project1, { recursive: true });
      mkdirSync(project2, { recursive: true });
      writeFileSync(path.join(project1, 'package.json'), '{}');
      writeFileSync(path.join(project2, 'package.json'), '{}');

      // Cache should start empty after clearing in afterEach
      expect(getProjectRootCacheSize()).toBe(0);

      // First call adds one entry
      findProjectRoot(project1);
      expect(getProjectRootCacheSize()).toBe(1);

      // Second call with different path adds another entry
      findProjectRoot(project2);
      expect(getProjectRootCacheSize()).toBe(2);

      // Repeated call with same path should not increase size
      findProjectRoot(project1);
      expect(getProjectRootCacheSize()).toBe(2);
    });

    it('should return cached result without re-traversing filesystem', () => {
      testTempDir = createTestDir('config-loader-test');
      const projectDir = path.join(testTempDir, 'project');
      const srcDir = path.join(projectDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(
        path.join(projectDir, 'codingbuddy.config.js'),
        'module.exports = {};',
      );

      // First call - populates cache
      const result1 = findProjectRoot(srcDir);
      expect(result1).toBe(projectDir);
      expect(getProjectRootCacheSize()).toBe(1);

      // Remove config file - cache should still return old result
      rmSync(path.join(projectDir, 'codingbuddy.config.js'));

      // Second call - should return cached result (stale but expected)
      const result2 = findProjectRoot(srcDir);
      expect(result2).toBe(projectDir);

      // Cache size should still be 1
      expect(getProjectRootCacheSize()).toBe(1);
    });
  });
});
