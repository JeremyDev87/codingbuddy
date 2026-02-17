import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { esmImport } from './esm-import';

/** PROJECT_ROOT is resolved as path.resolve(__dirname, '..') inside esm-import.ts */
const PROJECT_ROOT = path.resolve(__dirname, '..');

describe('esmImport path guard', () => {
  it('should reject relative paths', async () => {
    await expect(esmImport('./foo.mjs')).rejects.toThrow('only absolute paths are accepted');
  });

  it('should reject paths outside project root via ../ traversal', async () => {
    const outsidePath = path.resolve(PROJECT_ROOT, '..', '..', 'etc', 'passwd');
    await expect(esmImport(outsidePath)).rejects.toThrow('path must be within project root');
  });

  it('should reject bare module specifiers', async () => {
    await expect(esmImport('fs')).rejects.toThrow('only absolute paths are accepted');
  });

  it('should reject parent directory of project root', async () => {
    const parentDir = path.resolve(PROJECT_ROOT, '..');
    await expect(esmImport(parentDir)).rejects.toThrow('path must be within project root');
  });

  it('should accept paths within project root (file may not exist)', async () => {
    const validPath = path.join(PROJECT_ROOT, 'nonexistent-module.mjs');
    // Will fail with ERR_MODULE_NOT_FOUND, not our path guard error
    await expect(esmImport(validPath)).rejects.not.toThrow('path must be within project root');
  });
});
