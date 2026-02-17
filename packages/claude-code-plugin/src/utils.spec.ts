/**
 * Unit Tests for Shared Utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getErrorMessage,
  validatePath,
  isPathSafe,
  ensureDirectory,
  safeRemoveDirectory,
  FILE_EXTENSIONS,
  DELEGATION_PREFIXES,
  PLUGIN_ROOT,
  formatConversionResult,
  parseBuildMode,
} from './utils';

describe('utils', () => {
  // ============================================================================
  // getErrorMessage
  // ============================================================================
  describe('getErrorMessage', () => {
    it('extracts message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('returns string directly if error is a string', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('converts number to string', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    it('converts null to string', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    it('converts undefined to string', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('converts object to string', () => {
      expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]');
    });
  });

  // ============================================================================
  // validatePath
  // ============================================================================
  describe('validatePath', () => {
    const baseDir = '/allowed/base/dir';

    it('accepts path within base directory', () => {
      const result = validatePath('/allowed/base/dir/subdir/file.txt', baseDir);
      expect(result).toBe('/allowed/base/dir/subdir/file.txt');
    });

    it('accepts path equal to base directory', () => {
      const result = validatePath('/allowed/base/dir', baseDir);
      expect(result).toBe('/allowed/base/dir');
    });

    it('rejects path outside base directory', () => {
      expect(() => {
        validatePath('/other/path/file.txt', baseDir);
      }).toThrow('Path "/other/path/file.txt" is outside allowed directory');
    });

    it('rejects path traversal attack', () => {
      expect(() => {
        validatePath('/allowed/base/dir/../../../etc/passwd', baseDir);
      }).toThrow('is outside allowed directory');
    });

    it('rejects path that partially matches base directory name', () => {
      // /allowed/base/directory should not match /allowed/base/dir
      expect(() => {
        validatePath('/allowed/base/directory/file.txt', baseDir);
      }).toThrow('is outside allowed directory');
    });

    it('handles relative paths by resolving them', () => {
      const cwd = process.cwd();
      const relativeBase = 'test-dir';
      const expectedBase = path.resolve(cwd, relativeBase);

      // This should work - relative path within relative base
      const result = validatePath(path.join(relativeBase, 'subdir'), relativeBase);
      expect(result).toBe(path.join(expectedBase, 'subdir'));
    });

    it('handles paths that already end with path separator', () => {
      // Test with trailing separator on input path
      const baseDirWithSep = '/allowed/base/dir/';
      const result1 = validatePath('/allowed/base/dir/subdir/', baseDirWithSep);
      expect(result1).toBe('/allowed/base/dir/subdir');

      // Test with trailing separator on both paths
      const result2 = validatePath('/allowed/base/dir/', baseDirWithSep);
      expect(result2).toBe('/allowed/base/dir');
    });

    it('allows disabling symlink validation', () => {
      // With followSymlinks: false, should not check symlink targets
      const result = validatePath('/some/path', '/some', {
        followSymlinks: false,
      });
      expect(result).toBe('/some/path');
    });
  });

  // ============================================================================
  // validatePath - Symlink Security
  // ============================================================================
  describe('validatePath - symlink security', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'symlink-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it('allows symlinks that point within the allowed base', () => {
      // Create a real directory and a symlink to it within the allowed base
      const realDir = path.join(tempDir, 'real');
      const symlinkPath = path.join(tempDir, 'link');

      fs.mkdirSync(realDir);
      fs.symlinkSync(realDir, symlinkPath);

      // Should succeed since the symlink target is within the allowed base
      const result = validatePath(symlinkPath, tempDir);
      expect(result).toBe(symlinkPath);
    });

    it('rejects symlinks that escape the allowed base', () => {
      // Create a symlink that points outside the allowed base
      const allowedDir = path.join(tempDir, 'allowed');
      const symlinkPath = path.join(allowedDir, 'escape-link');

      fs.mkdirSync(allowedDir);
      // Create symlink pointing to parent directory (escaping the allowed base)
      fs.symlinkSync(tempDir, symlinkPath);

      expect(() => {
        validatePath(symlinkPath, allowedDir);
      }).toThrow('outside allowed directory');
    });

    it('handles broken symlinks gracefully', () => {
      // Create a symlink to a non-existent target within allowed base
      const symlinkPath = path.join(tempDir, 'broken-link');
      const nonExistentTarget = path.join(tempDir, 'non-existent');

      fs.symlinkSync(nonExistentTarget, symlinkPath);

      // Should not throw - broken symlinks are allowed
      // (the actual operation will fail with a more specific error)
      const result = validatePath(symlinkPath, tempDir);
      expect(result).toBe(symlinkPath);
    });

    it('validates nested symlinks', () => {
      // Create a chain: link1 -> link2 -> real
      const realDir = path.join(tempDir, 'real');
      const link1 = path.join(tempDir, 'link1');
      const link2 = path.join(tempDir, 'link2');

      fs.mkdirSync(realDir);
      fs.symlinkSync(realDir, link2);
      fs.symlinkSync(link2, link1);

      // Should succeed since the final target is within the allowed base
      const result = validatePath(link1, tempDir);
      expect(result).toBe(link1);
    });
  });

  // ============================================================================
  // isPathSafe
  // ============================================================================
  describe('isPathSafe', () => {
    it('accepts normal paths', () => {
      expect(isPathSafe('/home/user/project/file.txt')).toBe(true);
      expect(isPathSafe('src/components/Button.tsx')).toBe(true);
      expect(isPathSafe('./relative/path')).toBe(true);
    });

    it('rejects paths with parent directory traversal', () => {
      expect(isPathSafe('../../../etc/passwd')).toBe(false);
      expect(isPathSafe('src/../../../secrets')).toBe(false);
      expect(isPathSafe('path/to/../../../root')).toBe(false);
    });

    it('rejects Unix system directories', () => {
      expect(isPathSafe('/etc/passwd')).toBe(false);
      expect(isPathSafe('/var/log/syslog')).toBe(false);
      expect(isPathSafe('/var/lib/docker')).toBe(false);
      expect(isPathSafe('/usr/bin/bash')).toBe(false);
      expect(isPathSafe('/root/.ssh/id_rsa')).toBe(false);
    });

    it('allows temp directories', () => {
      // These should be allowed for testing and normal operations
      expect(isPathSafe('/var/folders/test')).toBe(true);
      expect(isPathSafe('/var/tmp/test')).toBe(true);
      expect(isPathSafe('/tmp/test')).toBe(true);
    });

    it('rejects additional Unix system directories', () => {
      expect(isPathSafe('/bin/sh')).toBe(false);
      expect(isPathSafe('/sbin/init')).toBe(false);
      expect(isPathSafe('/lib/modules')).toBe(false);
      expect(isPathSafe('/lib64/libc.so')).toBe(false);
      expect(isPathSafe('/sys/kernel')).toBe(false);
      expect(isPathSafe('/proc/1/status')).toBe(false);
      expect(isPathSafe('/dev/null')).toBe(false);
      expect(isPathSafe('/boot/vmlinuz')).toBe(false);
      expect(isPathSafe('/opt/application')).toBe(false);
      expect(isPathSafe('/run/user/1000')).toBe(false);
      expect(isPathSafe('/srv/www')).toBe(false);
      expect(isPathSafe('/mnt/drive')).toBe(false);
      expect(isPathSafe('/media/usb')).toBe(false);
    });

    it('rejects macOS system directories', () => {
      expect(isPathSafe('/System/Library')).toBe(false);
      expect(isPathSafe('/Library/Application Support')).toBe(false);
      expect(isPathSafe('/private/etc/passwd')).toBe(false);
      expect(isPathSafe('/private/var/log/system.log')).toBe(false);
      expect(isPathSafe('/Applications/App.app')).toBe(false);
    });

    it('allows macOS temp directories', () => {
      // /private/var/folders is where macOS stores temp files
      expect(isPathSafe('/private/var/folders/test')).toBe(true);
      expect(isPathSafe('/private/var/tmp/test')).toBe(true);
    });

    it('rejects Windows system directories', () => {
      expect(isPathSafe('C:\\Windows\\System32')).toBe(false);
      expect(isPathSafe('D:\\Program Files\\App')).toBe(false);
      expect(isPathSafe('C:\\System\\config')).toBe(false);
      expect(isPathSafe('C:\\Users\\Admin\\AppData\\Local')).toBe(false);
      expect(isPathSafe('C:\\ProgramData\\Microsoft')).toBe(false);
    });

    it('rejects user-sensitive directories', () => {
      // SSH keys and config
      expect(isPathSafe('/home/user/.ssh/id_rsa')).toBe(false);
      expect(isPathSafe('/Users/dev/.ssh/config')).toBe(false);
      // GPG keys
      expect(isPathSafe('/home/user/.gnupg/private-keys-v1.d')).toBe(false);
      // AWS credentials
      expect(isPathSafe('/home/user/.aws/credentials')).toBe(false);
      // Kubernetes config
      expect(isPathSafe('/home/user/.kube/config')).toBe(false);
      // npm tokens
      expect(isPathSafe('/home/user/.npmrc')).toBe(false);
      // FTP/HTTP credentials
      expect(isPathSafe('/home/user/.netrc')).toBe(false);
      // Docker credentials
      expect(isPathSafe('/home/user/.docker/config.json')).toBe(false);
    });

    it('rejects additional user-sensitive paths', () => {
      // XDG config directory
      expect(isPathSafe('/home/user/.config/secrets')).toBe(false);
      // Password manager
      expect(isPathSafe('/home/user/.password-store/work')).toBe(false);
      // Shell history
      expect(isPathSafe('/home/user/.bash_history')).toBe(false);
      expect(isPathSafe('/home/user/.zsh_history')).toBe(false);
      // Git credentials
      expect(isPathSafe('/home/user/.gitconfig')).toBe(false);
      expect(isPathSafe('/home/user/.git-credentials')).toBe(false);
      // Environment files
      expect(isPathSafe('/project/.env')).toBe(false);
      expect(isPathSafe('/project/.env.local')).toBe(false);
      expect(isPathSafe('/project/.env.production')).toBe(false);
      // Language-specific credentials
      expect(isPathSafe('/home/user/.cargo/credentials')).toBe(false);
      expect(isPathSafe('/home/user/.gem/credentials')).toBe(false);
      expect(isPathSafe('/home/user/.pypirc')).toBe(false);
      // Cloud credentials
      expect(isPathSafe('/home/user/.gcloud/credentials')).toBe(false);
      expect(isPathSafe('/home/user/.azure/config')).toBe(false);
    });

    it('accepts paths that contain "etc" or "var" as part of name', () => {
      // These should be allowed - etc/var are just part of the name
      expect(isPathSafe('/home/user/etcetera/file.txt')).toBe(true);
      expect(isPathSafe('/home/user/variable/file.txt')).toBe(true);
    });

    it('rejects non-normalized paths that resolve to dangerous locations', () => {
      // dot-segment bypass: /./etc/passwd -> /etc/passwd
      expect(isPathSafe('/./etc/passwd')).toBe(false);
      expect(isPathSafe('/./usr/bin/bash')).toBe(false);
      expect(isPathSafe('/home/./user/.ssh/id_rsa')).toBe(false);

      // multiple dot-segments
      expect(isPathSafe('/tmp/safe/../../etc/passwd')).toBe(false);

      // trailing dots
      expect(isPathSafe('/etc/./passwd')).toBe(false);

      // redundant separators (path.normalize handles these)
      expect(isPathSafe('//etc//passwd')).toBe(false);
    });

    it('rejects mixed-case paths for user-sensitive directories', () => {
      // SSH
      expect(isPathSafe('/home/user/.SSH/id_rsa')).toBe(false);
      expect(isPathSafe('/Users/dev/.Ssh/config')).toBe(false);
      // AWS
      expect(isPathSafe('/home/user/.AWS/credentials')).toBe(false);
      // Config
      expect(isPathSafe('/home/user/.Config/secrets')).toBe(false);
      // Docker
      expect(isPathSafe('/home/user/.Docker/config.json')).toBe(false);
      // Environment files
      expect(isPathSafe('/project/.ENV')).toBe(false);
      expect(isPathSafe('/project/.Env.local')).toBe(false);
      // Git credentials
      expect(isPathSafe('/home/user/.GITCONFIG')).toBe(false);
      expect(isPathSafe('/home/user/.Git-Credentials')).toBe(false);
      // History
      expect(isPathSafe('/home/user/.Bash_History')).toBe(false);
      expect(isPathSafe('/home/user/.ZSH_HISTORY')).toBe(false);
      // Other
      expect(isPathSafe('/home/user/.NPMRC')).toBe(false);
      expect(isPathSafe('/home/user/.Kube/config')).toBe(false);
      expect(isPathSafe('/home/user/.Gnupg/private-keys-v1.d')).toBe(false);
      expect(isPathSafe('/home/user/.Gcloud/credentials')).toBe(false);
      expect(isPathSafe('/home/user/.Azure/config')).toBe(false);
    });
  });

  // ============================================================================
  // ensureDirectory
  // ============================================================================
  describe('ensureDirectory', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it('creates new directory', () => {
      const newDir = path.join(tempDir, 'new-dir');
      expect(fs.existsSync(newDir)).toBe(false);

      ensureDirectory(newDir);

      expect(fs.existsSync(newDir)).toBe(true);
      expect(fs.statSync(newDir).isDirectory()).toBe(true);
    });

    it('creates nested directories', () => {
      const nestedDir = path.join(tempDir, 'a', 'b', 'c');
      expect(fs.existsSync(nestedDir)).toBe(false);

      ensureDirectory(nestedDir);

      expect(fs.existsSync(nestedDir)).toBe(true);
    });

    it('succeeds silently if directory already exists', () => {
      const existingDir = path.join(tempDir, 'existing');
      fs.mkdirSync(existingDir);

      // Should not throw
      expect(() => ensureDirectory(existingDir)).not.toThrow();
    });
  });

  // ============================================================================
  // safeRemoveDirectory
  // ============================================================================
  describe('safeRemoveDirectory', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
    });

    afterEach(async () => {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('removes directory within allowed base', () => {
      const dirToRemove = path.join(tempDir, 'to-remove');
      fs.mkdirSync(dirToRemove);
      fs.writeFileSync(path.join(dirToRemove, 'file.txt'), 'content');

      safeRemoveDirectory(dirToRemove, tempDir);

      expect(fs.existsSync(dirToRemove)).toBe(false);
    });

    it('throws when trying to remove outside allowed base', () => {
      const outsideDir = path.join(os.tmpdir(), 'outside-dir');

      expect(() => {
        safeRemoveDirectory(outsideDir, tempDir);
      }).toThrow('is outside allowed directory');
    });

    it('throws when trying to remove the base directory itself', () => {
      expect(() => {
        safeRemoveDirectory(tempDir, tempDir);
      }).toThrow('Cannot remove the base directory itself');
    });

    it('succeeds silently if directory does not exist', () => {
      const nonExistent = path.join(tempDir, 'non-existent');

      // Should not throw
      expect(() => safeRemoveDirectory(nonExistent, tempDir)).not.toThrow();
    });
  });

  // ============================================================================
  // Constants
  // ============================================================================
  describe('constants', () => {
    it('exports FILE_EXTENSIONS', () => {
      expect(FILE_EXTENSIONS.JSON).toBe('.json');
      expect(FILE_EXTENSIONS.MARKDOWN).toBe('.md');
      expect(FILE_EXTENSIONS.TYPESCRIPT).toBe('.ts');
    });

    it('exports DELEGATION_PREFIXES', () => {
      expect(DELEGATION_PREFIXES.TO).toBe('to_');
      expect(DELEGATION_PREFIXES.FROM).toBe('from_');
    });

    it('exports PLUGIN_ROOT as absolute path', () => {
      expect(PLUGIN_ROOT).toBeDefined();
      expect(path.isAbsolute(PLUGIN_ROOT)).toBe(true);
    });
  });

  // ============================================================================
  // parseBuildMode
  // ============================================================================
  describe('parseBuildMode', () => {
    it('returns undefined for empty input', () => {
      expect(parseBuildMode(undefined)).toBeUndefined();
      expect(parseBuildMode('')).toBeUndefined();
    });

    it('accepts valid build modes', () => {
      expect(parseBuildMode('development')).toBe('development');
      expect(parseBuildMode('production')).toBe('production');
    });

    it('throws error for invalid build mode', () => {
      expect(() => parseBuildMode('invalid')).toThrow('Invalid build mode: "invalid"');
      expect(() => parseBuildMode('dev')).toThrow('Invalid build mode: "dev"');
      expect(() => parseBuildMode('prod')).toThrow('Invalid build mode: "prod"');
    });

    it('provides helpful error message with valid options', () => {
      expect(() => parseBuildMode('test')).toThrow('Expected one of: development, production');
    });
  });

  // ============================================================================
  // formatConversionResult
  // ============================================================================
  describe('formatConversionResult', () => {
    it('formats converted items with checkmarks', () => {
      const result = {
        converted: ['agent-a.md', 'agent-b.md'],
        errors: [],
      };

      const output = formatConversionResult(result, 'converted');

      expect(output).toContain('  ✓ agent-a.md');
      expect(output).toContain('  ✓ agent-b.md');
      expect(output[0]).toContain('2');
    });

    it('formats generated items', () => {
      const result = {
        generated: ['plan.md', 'act.md', 'eval.md'],
        errors: [],
      };

      const output = formatConversionResult(result, 'generated');

      expect(output).toContain('  ✓ plan.md');
      expect(output).toContain('  ✓ act.md');
      expect(output).toContain('  ✓ eval.md');
      expect(output[0]).toContain('3');
    });

    it('formats synced items', () => {
      const result = {
        synced: ['skill-a (symlink)', 'skill-b (copied)'],
        errors: [],
      };

      const output = formatConversionResult(result, 'synced');

      expect(output).toContain('  ✓ skill-a (symlink)');
      expect(output).toContain('  ✓ skill-b (copied)');
    });

    it('formats errors with X marks', () => {
      const result = {
        converted: ['success.md'],
        errors: ['failed.json: Parse error', 'another.json: Invalid format'],
      };

      const output = formatConversionResult(result, 'converted');

      expect(output).toContain('\nErrors (2):');
      expect(output).toContain('  ✗ failed.json: Parse error');
      expect(output).toContain('  ✗ another.json: Invalid format');
    });

    it('handles empty results', () => {
      const result = {
        converted: [],
        errors: [],
      };

      const output = formatConversionResult(result, 'converted');

      expect(output[0]).toContain('0');
      expect(output.length).toBe(1); // Just the count line
    });

    it('capitalizes the item label', () => {
      const result = {
        converted: ['test.md'],
        errors: [],
      };

      const output = formatConversionResult(result, 'agents');

      expect(output[0]).toContain('Agents');
    });

    it('uses singular "item" for single result', () => {
      const result = {
        converted: ['single.md'],
        errors: [],
      };

      const output = formatConversionResult(result, 'agent');

      expect(output[0]).toContain('item: 1');
    });

    it('uses plural "items" for multiple results', () => {
      const result = {
        converted: ['a.md', 'b.md'],
        errors: [],
      };

      const output = formatConversionResult(result, 'agent');

      expect(output[0]).toContain('items: 2');
    });

    it('handles result with only errors', () => {
      const result = {
        errors: ['error1', 'error2'],
      };

      const output = formatConversionResult(result, 'processed');

      expect(output[0]).toContain('0');
      expect(output).toContain('\nErrors (2):');
      expect(output).toContain('  ✗ error1');
    });
  });
});
