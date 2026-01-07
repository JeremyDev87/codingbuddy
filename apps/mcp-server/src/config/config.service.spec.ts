import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigService } from './config.service';

describe('ConfigService', () => {
  describe('resolveProjectRoot (via constructor)', () => {
    let testTempDir: string;
    const originalEnv = process.env.CODINGBUDDY_PROJECT_ROOT;

    function createTestDir(): string {
      const tempDir = path.join(
        os.tmpdir(),
        `config-service-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
});
