import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CONFIG_FILE_NAMES,
  DEPRECATED_CONFIG_FILE_NAMES,
  JS_CONFIG_DEPRECATION_VERSION,
  CONFIG_MIGRATION_DOCS_URL,
  ConfigLoadError,
  validateAndTransform,
  findProjectRoot,
  findConfigFile,
  findDeprecatedConfigFiles,
  getDeprecatedConfigWarning,
  clearProjectRootCache,
  getProjectRootCacheSize,
  loadConfig,
  isCI,
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
    it('should only support JSON format', () => {
      expect(CONFIG_FILE_NAMES[0]).toBe('codingbuddy.config.json');
    });

    it('should have exactly 1 supported file name', () => {
      expect(CONFIG_FILE_NAMES).toHaveLength(1);
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

  describe('findConfigFile', () => {
    let testTempDir: string;

    afterEach(() => {
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should find codingbuddy.config.json when it exists', () => {
      testTempDir = createTestDir('findConfigFile-test');
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
      writeFileSync(path.join(projectDir, 'codingbuddy.config.json'), '{}');

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
      // /tempdir/monorepo/codingbuddy.config.json  <- config here
      // /tempdir/monorepo/package.json
      // /tempdir/monorepo/apps/sub-package/package.json  <- no config
      // /tempdir/monorepo/apps/sub-package/src/  <- start here
      testTempDir = createTestDir('config-loader-test');
      const monorepoRoot = path.join(testTempDir, 'monorepo');
      const subPackageDir = path.join(monorepoRoot, 'apps', 'sub-package');
      const srcDir = path.join(subPackageDir, 'src');

      mkdirSync(srcDir, { recursive: true });
      writeFileSync(path.join(monorepoRoot, 'codingbuddy.config.json'), '{}');
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
      writeFileSync(path.join(projectDir, 'codingbuddy.config.json'), '{}');

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
      writeFileSync(path.join(projectDir, 'codingbuddy.config.json'), '{}');

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
      writeFileSync(path.join(projectDir, 'codingbuddy.config.json'), '{}');

      // First call - populates cache
      const result1 = findProjectRoot(srcDir);
      expect(result1).toBe(projectDir);
      expect(getProjectRootCacheSize()).toBe(1);

      // Remove config file - cache should still return old result
      rmSync(path.join(projectDir, 'codingbuddy.config.json'));

      // Second call - should return cached result (stale but expected)
      const result2 = findProjectRoot(srcDir);
      expect(result2).toBe(projectDir);

      // Cache size should still be 1
      expect(getProjectRootCacheSize()).toBe(1);
    });
  });

  describe('DEPRECATED_CONFIG_FILE_NAMES', () => {
    it('should contain all legacy JavaScript config file names', () => {
      expect(DEPRECATED_CONFIG_FILE_NAMES).toContain('codingbuddy.config.js');
      expect(DEPRECATED_CONFIG_FILE_NAMES).toContain('codingbuddy.config.mjs');
      expect(DEPRECATED_CONFIG_FILE_NAMES).toContain('codingbuddy.config.cjs');
    });

    it('should have exactly 3 deprecated file names', () => {
      expect(DEPRECATED_CONFIG_FILE_NAMES).toHaveLength(3);
    });
  });

  describe('findDeprecatedConfigFiles', () => {
    let testTempDir: string;

    afterEach(() => {
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should return empty array when no deprecated files exist', () => {
      testTempDir = createTestDir('deprecated-test');

      const result = findDeprecatedConfigFiles(testTempDir);

      expect(result).toEqual([]);
    });

    it('should find codingbuddy.config.js when it exists', () => {
      testTempDir = createTestDir('deprecated-test');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');

      const result = findDeprecatedConfigFiles(testTempDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('codingbuddy.config.js');
    });

    it('should find multiple deprecated files when they exist', () => {
      testTempDir = createTestDir('deprecated-test');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.mjs'), '');

      const result = findDeprecatedConfigFiles(testTempDir);

      expect(result).toHaveLength(2);
    });

    it('should not include JSON config files', () => {
      testTempDir = createTestDir('deprecated-test');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.json'), '{}');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');

      const result = findDeprecatedConfigFiles(testTempDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('.js');
      expect(result[0]).not.toContain('.json');
    });
  });

  describe('deprecation constants', () => {
    it('JS_CONFIG_DEPRECATION_VERSION should be a valid semver string', () => {
      expect(JS_CONFIG_DEPRECATION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('CONFIG_MIGRATION_DOCS_URL should be a valid URL', () => {
      expect(CONFIG_MIGRATION_DOCS_URL).toMatch(/^https?:\/\//);
    });
  });

  describe('getDeprecatedConfigWarning', () => {
    // CI env vars to clear for non-CI tests
    const ciEnvVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'GITHUB_ACTIONS',
      'GITLAB_CI',
      'CIRCLECI',
      'JENKINS_URL',
      'BUILDKITE',
      'TRAVIS',
    ];

    /**
     * Helper to run a test in non-CI mode by temporarily clearing CI env vars
     */
    function withoutCI<T>(fn: () => T): T {
      const originalValues: Record<string, string | undefined> = {};
      ciEnvVars.forEach(v => {
        originalValues[v] = process.env[v];
        delete process.env[v];
      });

      try {
        return fn();
      } finally {
        ciEnvVars.forEach(v => {
          if (originalValues[v] !== undefined) {
            process.env[v] = originalValues[v];
          }
        });
      }
    }

    it('should generate warning message with file list', () => {
      withoutCI(() => {
        const files = ['/project/codingbuddy.config.js'];

        const result = getDeprecatedConfigWarning(files);

        expect(result).toContain(
          'Deprecated JavaScript config file(s) detected',
        );
        expect(result).toContain('codingbuddy.config.js');
        expect(result).toContain(`v${JS_CONFIG_DEPRECATION_VERSION}`);
        expect(result).toContain('codingbuddy.config.json');
        expect(result).toContain(CONFIG_MIGRATION_DOCS_URL);
      });
    });

    it('should list multiple files when provided', () => {
      withoutCI(() => {
        const files = [
          '/project/codingbuddy.config.js',
          '/project/codingbuddy.config.mjs',
        ];

        const result = getDeprecatedConfigWarning(files);

        expect(result).toContain('codingbuddy.config.js');
        expect(result).toContain('codingbuddy.config.mjs');
      });
    });

    it('should include migration steps', () => {
      withoutCI(() => {
        const files = ['/project/codingbuddy.config.js'];

        const result = getDeprecatedConfigWarning(files);

        expect(result).toContain('Rename your config');
        expect(result).toContain('Convert the export to a JSON object');
        expect(result).toContain('Remove the deprecated');
      });
    });

    it('should return short message in CI environment', () => {
      const originalCI = process.env.CI;
      process.env.CI = 'true';

      try {
        const files = ['/project/codingbuddy.config.js'];
        const result = getDeprecatedConfigWarning(files);

        expect(result).toContain('[DEPRECATION]');
        expect(result).toContain('codingbuddy.config.js');
        expect(result).not.toContain('Rename your config');
        expect(result).toContain(CONFIG_MIGRATION_DOCS_URL);
      } finally {
        if (originalCI === undefined) {
          delete process.env.CI;
        } else {
          process.env.CI = originalCI;
        }
      }
    });

    it('should list multiple files in CI mode', () => {
      const originalCI = process.env.CI;
      process.env.CI = 'true';

      try {
        const files = [
          '/project/codingbuddy.config.js',
          '/project/codingbuddy.config.mjs',
        ];
        const result = getDeprecatedConfigWarning(files);

        expect(result).toContain('codingbuddy.config.js');
        expect(result).toContain('codingbuddy.config.mjs');
      } finally {
        if (originalCI === undefined) {
          delete process.env.CI;
        } else {
          process.env.CI = originalCI;
        }
      }
    });
  });

  describe('isCI', () => {
    const ciEnvVars = [
      'CI',
      'CONTINUOUS_INTEGRATION',
      'GITHUB_ACTIONS',
      'GITLAB_CI',
      'CIRCLECI',
      'JENKINS_URL',
      'BUILDKITE',
      'TRAVIS',
    ];

    it('should return false when no CI env vars are set', () => {
      const originalValues: Record<string, string | undefined> = {};
      ciEnvVars.forEach(v => {
        originalValues[v] = process.env[v];
        delete process.env[v];
      });

      try {
        expect(isCI()).toBe(false);
      } finally {
        ciEnvVars.forEach(v => {
          if (originalValues[v] !== undefined) {
            process.env[v] = originalValues[v];
          }
        });
      }
    });

    it.each(ciEnvVars)('should return true when %s is set', envVar => {
      const originalValue = process.env[envVar];

      try {
        process.env[envVar] = 'true';
        expect(isCI()).toBe(true);
      } finally {
        if (originalValue === undefined) {
          delete process.env[envVar];
        } else {
          process.env[envVar] = originalValue;
        }
      }
    });
  });

  describe('loadConfig with deprecated files', () => {
    let testTempDir: string;

    afterEach(() => {
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should include deprecation warning when .js config exists', async () => {
      testTempDir = createTestDir('loadConfig-deprecated-test');
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');

      const result = await loadConfig(testTempDir);

      expect(result.warnings).toHaveLength(1);
      // Check for common content in both CI and non-CI warning formats
      expect(result.warnings[0]).toContain('codingbuddy.config.js');
      expect(
        result.warnings[0].includes('Deprecated') ||
          result.warnings[0].includes('DEPRECATION'),
      ).toBe(true);
      expect(result.source).toBeNull();
    });

    it('should include deprecation warning even when .json config exists', async () => {
      testTempDir = createTestDir('loadConfig-deprecated-test');
      writeFileSync(
        path.join(testTempDir, 'codingbuddy.config.json'),
        '{"language": "en"}',
      );
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');

      const result = await loadConfig(testTempDir);

      expect(
        result.warnings.some(
          w => w.includes('Deprecated') || w.includes('DEPRECATION'),
        ),
      ).toBe(true);
      expect(result.source).toContain('codingbuddy.config.json');
      expect(result.config.language).toBe('en');
    });

    it('should have no warnings when only .json config exists', async () => {
      testTempDir = createTestDir('loadConfig-deprecated-test');
      writeFileSync(
        path.join(testTempDir, 'codingbuddy.config.json'),
        '{"language": "ko"}',
      );

      const result = await loadConfig(testTempDir);

      expect(result.warnings).toHaveLength(0);
      expect(result.config.language).toBe('ko');
    });
  });
});
