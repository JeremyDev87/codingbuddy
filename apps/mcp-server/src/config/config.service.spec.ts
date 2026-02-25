import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, realpathSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigService } from './config.service';
import { ConfigLoadError } from './config.loader';

// Module-level test helpers
function createTestDir(prefix = 'config-service-test'): string {
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

describe('ConfigService', () => {
  describe('resolveProjectRoot (via constructor)', () => {
    let testTempDir: string;
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    beforeEach(() => {
      // Clear the env var before each test
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
    });

    afterEach(() => {
      // Restore original env var
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
      // Cleanup temp directory
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should use valid directory from CODINGBUDDY_PROJECT_ROOT', () => {
      // Setup: Create a valid directory
      testTempDir = createTestDir();
      process.env.CODINGBUDDY_PROJECT_ROOT = testTempDir;

      // Create ConfigService with the env var set
      const service = new ConfigService();
      const projectRoot = service.getProjectRoot();

      expect(projectRoot).toBe(path.resolve(testTempDir));
    });

    it('should fall back to auto-detect when CODINGBUDDY_PROJECT_ROOT path does not exist', () => {
      // Setup: Set env var to non-existent path
      process.env.CODINGBUDDY_PROJECT_ROOT = '/nonexistent/path/xyz123456';

      const service = new ConfigService();
      const projectRoot = service.getProjectRoot();

      // Should NOT be the invalid path
      expect(projectRoot).not.toBe('/nonexistent/path/xyz123456');
      // Should be a valid path (auto-detected)
      expect(existsSync(projectRoot)).toBe(true);
    });

    it('should fall back to auto-detect when CODINGBUDDY_PROJECT_ROOT is a file not directory', () => {
      // Setup: Create a file instead of directory
      testTempDir = createTestDir();
      const filePath = path.join(testTempDir, 'testfile.txt');
      writeFileSync(filePath, 'test content');
      process.env.CODINGBUDDY_PROJECT_ROOT = filePath;

      const service = new ConfigService();
      const projectRoot = service.getProjectRoot();

      // Should NOT be the file path
      expect(projectRoot).not.toBe(filePath);
      // Should be a valid directory (auto-detected)
      expect(existsSync(projectRoot)).toBe(true);
    });

    it('should use auto-detect when CODINGBUDDY_PROJECT_ROOT is not set', () => {
      // Ensure env var is not set
      delete process.env.CODINGBUDDY_PROJECT_ROOT;

      const service = new ConfigService();
      const projectRoot = service.getProjectRoot();

      // Should return a valid path
      expect(projectRoot).toBeDefined();
      expect(existsSync(projectRoot)).toBe(true);
    });

    it('should report source as "env" when CODINGBUDDY_PROJECT_ROOT is set', () => {
      testTempDir = createTestDir();
      process.env.CODINGBUDDY_PROJECT_ROOT = testTempDir;

      const service = new ConfigService();
      expect(service.getProjectRootSource()).toBe('env');
    });

    it('should report source as "auto_detect" when no env var is set', () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;

      const service = new ConfigService();
      expect(service.getProjectRootSource()).toBe('auto_detect');
    });

    it('should normalize relative paths in CODINGBUDDY_PROJECT_ROOT', () => {
      // Setup: Create a directory and use path with ..
      testTempDir = createTestDir();
      const subDir = path.join(testTempDir, 'subdir');
      mkdirSync(subDir, { recursive: true });

      // Set path with .. (should resolve to testTempDir)
      const pathWithDotDot = path.join(testTempDir, 'subdir', '..');
      process.env.CODINGBUDDY_PROJECT_ROOT = pathWithDotDot;

      const service = new ConfigService();
      const projectRoot = service.getProjectRoot();

      // Should be normalized to absolute path
      expect(projectRoot).toBe(path.resolve(testTempDir));
    });
  });

  describe('setProjectRoot', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should update project root and reset loaded state', () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();
      const originalRoot = service.getProjectRoot();

      // Change project root
      const newRoot = '/tmp/new-project-root';
      service.setProjectRoot(newRoot);

      expect(service.getProjectRoot()).toBe(newRoot);
      expect(service.isConfigLoaded()).toBe(false);

      // Restore for cleanup
      service.setProjectRoot(originalRoot);
    });
  });

  describe('isConfigLoaded', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return false before loadProjectConfig is called', () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      expect(service.isConfigLoaded()).toBe(false);
    });

    it('should return true after loadProjectConfig is called', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();
      await service.loadProjectConfig();

      expect(service.isConfigLoaded()).toBe(true);
    });
  });

  describe('reload', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should reset loaded state and reload config', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      // First load
      await service.loadProjectConfig();
      expect(service.isConfigLoaded()).toBe(true);

      // Reload
      await service.reload();
      expect(service.isConfigLoaded()).toBe(true);
    });
  });

  describe('setProjectRootAndReload', () => {
    let testTempDir: string;
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    beforeEach(() => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should set project root and reload config for valid directory', async () => {
      testTempDir = createTestDir();
      const service = new ConfigService();

      // Load initial config
      await service.loadProjectConfig();
      expect(service.isConfigLoaded()).toBe(true);

      // Set new project root and reload
      await service.setProjectRootAndReload(testTempDir);

      // Use realpathSync because setProjectRootAndReload resolves symlinks
      expect(service.getProjectRoot()).toBe(realpathSync(testTempDir));
      expect(service.isConfigLoaded()).toBe(true);
    });

    it('should update projectRootSource to "roots_list" after setProjectRootAndReload', async () => {
      testTempDir = createTestDir();
      delete process.env.CODINGBUDDY_PROJECT_ROOT;

      const service = new ConfigService();
      expect(service.getProjectRootSource()).toBe('auto_detect');

      await service.setProjectRootAndReload(testTempDir);
      expect(service.getProjectRootSource()).toBe('roots_list');
    });

    it('should use custom source when provided to setProjectRootAndReload', async () => {
      testTempDir = createTestDir();
      delete process.env.CODINGBUDDY_PROJECT_ROOT;

      const service = new ConfigService();
      await service.setProjectRootAndReload(testTempDir, 'env');
      expect(service.getProjectRootSource()).toBe('env');
    });

    it('should throw error when path does not exist', async () => {
      const service = new ConfigService();
      const nonExistentPath = '/nonexistent/path/xyz123456789';

      await expect(service.setProjectRootAndReload(nonExistentPath)).rejects.toThrow(
        /does not exist/,
      );
    });

    it('should throw error when path is a file not directory', async () => {
      testTempDir = createTestDir();
      const filePath = path.join(testTempDir, 'testfile.txt');
      writeFileSync(filePath, 'test content');

      const service = new ConfigService();

      await expect(service.setProjectRootAndReload(filePath)).rejects.toThrow(/not a directory/);
    });

    it('should normalize relative paths to absolute paths', async () => {
      testTempDir = createTestDir();
      const subDir = path.join(testTempDir, 'subdir');
      mkdirSync(subDir, { recursive: true });

      const service = new ConfigService();
      const pathWithDotDot = path.join(testTempDir, 'subdir', '..');

      await service.setProjectRootAndReload(pathWithDotDot);

      // Use realpathSync because setProjectRootAndReload resolves symlinks
      expect(service.getProjectRoot()).toBe(realpathSync(testTempDir));
    });

    it('should clear findProjectRoot cache after setting new root', async () => {
      testTempDir = createTestDir();
      const service = new ConfigService();

      // Set new project root
      await service.setProjectRootAndReload(testTempDir);

      // The cache should be cleared, so getProjectRoot should return new path
      // Use realpathSync because setProjectRootAndReload resolves symlinks
      expect(service.getProjectRoot()).toBe(realpathSync(testTempDir));
    });

    it('should reject paths containing null bytes', async () => {
      const service = new ConfigService();
      const pathWithNullByte = '/tmp/test\x00/malicious';

      await expect(service.setProjectRootAndReload(pathWithNullByte)).rejects.toThrow(/null byte/i);
    });

    it('should resolve symlinks and use real path', async () => {
      const { symlinkSync } = await import('fs');
      testTempDir = createTestDir();
      const realDir = path.join(testTempDir, 'real-dir');
      const symlinkPath = path.join(testTempDir, 'symlink-dir');
      mkdirSync(realDir, { recursive: true });

      try {
        symlinkSync(realDir, symlinkPath);
      } catch {
        // Skip test if symlinks not supported (e.g., Windows without admin)
        return;
      }

      const service = new ConfigService();
      await service.setProjectRootAndReload(symlinkPath);

      // Should resolve to the real path, not the symlink
      // Use realpathSync on expected value to handle platform differences (e.g., /var -> /private/var on macOS)
      expect(service.getProjectRoot()).toBe(realpathSync(realDir));
    });
  });

  describe('getProjectConfig', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should load config if not already loaded', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      expect(service.isConfigLoaded()).toBe(false);

      const config = await service.getProjectConfig();

      expect(service.isConfigLoaded()).toBe(true);
      expect(config).toBeDefined();
      expect(config.settings).toBeDefined();
      expect(config.ignorePatterns).toBeDefined();
      expect(config.contextFiles).toBeDefined();
    });

    it('should return cached config if already loaded', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const config1 = await service.getProjectConfig();
      const config2 = await service.getProjectConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('getSettings', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return settings from config', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const settings = await service.getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
    });
  });

  describe('getIgnorePatterns', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return ignore patterns including defaults', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const patterns = await service.getIgnorePatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      // Should include default patterns
      expect(patterns.some(p => p.includes('node_modules'))).toBe(true);
    });
  });

  describe('shouldIgnorePath', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return true for node_modules path', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const shouldIgnore = await service.shouldIgnorePath('node_modules/package/index.js');

      expect(shouldIgnore).toBe(true);
    });

    it('should return false for regular source file', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const shouldIgnore = await service.shouldIgnorePath('src/index.ts');

      expect(shouldIgnore).toBe(false);
    });

    it('should return true for .git directory', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const shouldIgnore = await service.shouldIgnorePath('.git/config');

      expect(shouldIgnore).toBe(true);
    });
  });

  describe('getContextFiles', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return context files array', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const files = await service.getContextFiles();

      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('getFormattedContext', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return formatted context string', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const context = await service.getFormattedContext();

      expect(typeof context).toBe('string');
    });
  });

  describe('getLanguage', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return language from settings if configured', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const language = await service.getLanguage();

      // May be undefined or a string depending on config
      expect(language === undefined || typeof language === 'string').toBe(true);
    });
  });

  describe('getContextLimits', () => {
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
    });

    it('should return context limits with defaults', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const limits = await service.getContextLimits();

      expect(limits).toBeDefined();
      expect(typeof limits.maxArrayItems).toBe('number');
      expect(typeof limits.maxItemLength).toBe('number');
      expect(limits.maxArrayItems).toBeGreaterThan(0);
      expect(limits.maxItemLength).toBeGreaterThan(0);
    });

    it('should return default values when not configured', async () => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
      const service = new ConfigService();

      const limits = await service.getContextLimits();

      // Default values
      expect(limits.maxArrayItems).toBe(100);
      expect(limits.maxItemLength).toBe(2000);
    });
  });

  describe('loadProjectConfig error handling', () => {
    let testTempDir: string;
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    beforeEach(() => {
      delete process.env.CODINGBUDDY_PROJECT_ROOT;
    });

    afterEach(() => {
      vi.restoreAllMocks();
      if (originalEnv !== undefined) {
        process.env.CODINGBUDDY_PROJECT_ROOT = originalEnv;
      } else {
        delete process.env.CODINGBUDDY_PROJECT_ROOT;
      }
      if (testTempDir) {
        cleanupTestDir(testTempDir);
      }
    });

    it('should handle ConfigLoadError and use default config', async () => {
      testTempDir = createTestDir();
      const service = new ConfigService();
      service.setProjectRoot(testTempDir);

      // Mock loadConfig to throw ConfigLoadError
      const configLoader = await import('./config.loader');
      vi.spyOn(configLoader, 'loadConfig').mockRejectedValueOnce(
        new ConfigLoadError('Test config error', testTempDir),
      );

      const config = await service.loadProjectConfig();

      // Should return default config instead of failing
      expect(config).toBeDefined();
      expect(config.settings).toEqual({});
      expect(config.sources.config).toBeNull();
    });

    it('should log ignore patterns source when .codingignore exists', async () => {
      testTempDir = createTestDir();

      // Create a .codingignore file
      const ignoreFilePath = path.join(testTempDir, '.codingignore');
      writeFileSync(ignoreFilePath, '*.log\n*.tmp\n');

      const service = new ConfigService();
      service.setProjectRoot(testTempDir);

      const config = await service.loadProjectConfig();

      // Should have ignore source set
      expect(config.sources.ignore).toBe(ignoreFilePath);
      // Should include patterns from the file plus defaults
      expect(config.ignorePatterns).toContain('*.log');
      expect(config.ignorePatterns).toContain('*.tmp');
    });

    it('should handle context loading with errors gracefully', async () => {
      testTempDir = createTestDir();

      // Create .codingbuddy directory with an unreadable file
      const contextDir = path.join(testTempDir, '.codingbuddy', 'context');
      mkdirSync(contextDir, { recursive: true });

      // Create a valid context file
      const contextFilePath = path.join(contextDir, 'test-context.md');
      writeFileSync(contextFilePath, '# Test Context\nSome context content.');

      const service = new ConfigService();
      service.setProjectRoot(testTempDir);

      const config = await service.loadProjectConfig();

      // Should have context source set
      expect(config.sources.context).toBeDefined();
      // Should have loaded the context file
      expect(config.contextFiles.length).toBeGreaterThan(0);
    });

    it('should handle generic errors from loadConfig', async () => {
      testTempDir = createTestDir();
      const service = new ConfigService();
      service.setProjectRoot(testTempDir);

      // Mock loadConfig to throw a generic Error (not ConfigLoadError)
      const configLoader = await import('./config.loader');
      vi.spyOn(configLoader, 'loadConfig').mockRejectedValueOnce(new Error('Generic error'));

      const config = await service.loadProjectConfig();

      // Should still return default config
      expect(config).toBeDefined();
      expect(config.settings).toEqual({});
      expect(config.sources.config).toBeNull();
    });

    it('should log deprecation warnings when deprecated JS config files exist', async () => {
      testTempDir = createTestDir();

      // Create a deprecated JS config file (will be detected but not loaded)
      writeFileSync(path.join(testTempDir, 'codingbuddy.config.js'), '');

      const service = new ConfigService();
      service.setProjectRoot(testTempDir);

      // Spy on logger.warn
      const warnSpy = vi.spyOn(service['logger'], 'warn');

      await service.loadProjectConfig();

      // Should have logged a deprecation warning (check for both CI and non-CI formats)
      expect(warnSpy).toHaveBeenCalled();
      const warningCall = warnSpy.mock.calls.find(
        call =>
          call[0].includes('Deprecated JavaScript config') || call[0].includes('[DEPRECATION]'),
      );
      expect(warningCall).toBeDefined();
    });
  });

  // Note: The following edge cases in setProjectRootAndReload are difficult to test in ESM:
  // - Line 136: Re-throwing non-ENOENT errors from stat (e.g., EACCES)
  // - Lines 150-153: Fallback when realpath fails
  // ESM modules don't allow spying on exports (fs/promises.stat, realpath).
  // These paths are defensive error handling and are acceptable to remain uncovered.
});
