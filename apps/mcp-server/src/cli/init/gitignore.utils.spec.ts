/**
 * Gitignore Utilities Tests
 *
 * TDD tests for .gitignore manipulation functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import {
  ensureGitignoreEntries,
  GitignoreWriteError,
  GitignoreReadError,
  type GitignoreEntry,
} from './gitignore.utils';

// Mock fs module with memfs
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('ensureGitignoreEntries', () => {
  const projectRoot = '/test-project';

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync(projectRoot, { recursive: true });
  });

  describe('when .gitignore does not exist', () => {
    it('creates .gitignore with entries and comment', async () => {
      const entries: GitignoreEntry[] = [
        {
          pattern: 'docs/codingbuddy/context.md',
          comment: '# Codingbuddy (local workspace)',
        },
        { pattern: 'docs/codingbuddy/sessions/' },
      ];

      const result = await ensureGitignoreEntries(projectRoot, entries);

      expect(result.added).toEqual(['docs/codingbuddy/context.md', 'docs/codingbuddy/sessions/']);
      expect(result.alreadyExists).toEqual([]);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8');
      expect(content).toContain('# Codingbuddy (local workspace)');
      expect(content).toContain('docs/codingbuddy/context.md');
      expect(content).toContain('docs/codingbuddy/sessions/');
    });
  });

  describe('when .gitignore exists', () => {
    it('appends entries to existing content', async () => {
      vol.writeFileSync(`${projectRoot}/.gitignore`, '# Existing content\nnode_modules/\n');

      const entries: GitignoreEntry[] = [
        {
          pattern: 'docs/codingbuddy/context.md',
          comment: '# Codingbuddy (local workspace)',
        },
      ];

      const result = await ensureGitignoreEntries(projectRoot, entries);

      expect(result.added).toEqual(['docs/codingbuddy/context.md']);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8');
      expect(content).toContain('# Existing content');
      expect(content).toContain('node_modules/');
      expect(content).toContain('# Codingbuddy (local workspace)');
      expect(content).toContain('docs/codingbuddy/context.md');
    });

    it('does not duplicate existing entries', async () => {
      vol.writeFileSync(
        `${projectRoot}/.gitignore`,
        'node_modules/\ndocs/codingbuddy/context.md\n',
      );

      const entries: GitignoreEntry[] = [
        { pattern: 'docs/codingbuddy/context.md', comment: '# Codingbuddy' },
        { pattern: 'docs/codingbuddy/sessions/' },
      ];

      const result = await ensureGitignoreEntries(projectRoot, entries);

      expect(result.added).toEqual(['docs/codingbuddy/sessions/']);
      expect(result.alreadyExists).toEqual(['docs/codingbuddy/context.md']);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8') as string;
      // Should not have duplicate
      const matches = content.match(/docs\/codingbuddy\/context\.md/g);
      expect(matches?.length).toBe(1);
    });

    it('handles entries without trailing newline', async () => {
      vol.writeFileSync(`${projectRoot}/.gitignore`, 'node_modules/');

      const entries: GitignoreEntry[] = [{ pattern: 'dist/', comment: '# Build output' }];

      const result = await ensureGitignoreEntries(projectRoot, entries);

      expect(result.added).toEqual(['dist/']);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
      // Should have newline between existing and new
      expect(content).toMatch(/node_modules\/\n/);
    });
  });

  describe('when all entries already exist', () => {
    it('returns empty added array', async () => {
      vol.writeFileSync(
        `${projectRoot}/.gitignore`,
        'docs/codingbuddy/context.md\ndocs/codingbuddy/sessions/\n',
      );

      const entries: GitignoreEntry[] = [
        { pattern: 'docs/codingbuddy/context.md' },
        { pattern: 'docs/codingbuddy/sessions/' },
      ];

      const result = await ensureGitignoreEntries(projectRoot, entries);

      expect(result.added).toEqual([]);
      expect(result.alreadyExists).toEqual([
        'docs/codingbuddy/context.md',
        'docs/codingbuddy/sessions/',
      ]);
    });
  });

  describe('error handling', () => {
    it('throws GitignoreWriteError when file write fails', async () => {
      // Try to write to a path that doesn't exist (no parent directory)
      const invalidProjectRoot = '/non-existent-parent/project';

      const entries: GitignoreEntry[] = [{ pattern: 'new-entry/' }];

      await expect(ensureGitignoreEntries(invalidProjectRoot, entries)).rejects.toThrow(
        'Failed to update .gitignore',
      );
    });

    it('includes original error message in GitignoreWriteError', async () => {
      const invalidProjectRoot = '/non-existent-parent/project';

      const entries: GitignoreEntry[] = [{ pattern: 'new-entry/' }];

      try {
        await ensureGitignoreEntries(invalidProjectRoot, entries);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitignoreWriteError);
        expect((error as GitignoreWriteError).message).toContain('Failed to update .gitignore');
        expect((error as GitignoreWriteError).cause).toBeDefined();
      }
    });

    it('throws GitignoreReadError when file read fails', async () => {
      // Create a directory with same name as .gitignore to cause read error
      vol.mkdirSync(`${projectRoot}/.gitignore`, { recursive: true });

      const entries: GitignoreEntry[] = [{ pattern: 'new-entry/' }];

      await expect(ensureGitignoreEntries(projectRoot, entries)).rejects.toThrow(
        'Failed to read .gitignore',
      );
    });

    it('includes original error in GitignoreReadError', async () => {
      vol.mkdirSync(`${projectRoot}/.gitignore`, { recursive: true });

      const entries: GitignoreEntry[] = [{ pattern: 'new-entry/' }];

      try {
        await ensureGitignoreEntries(projectRoot, entries);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitignoreReadError);
        expect((error as GitignoreReadError).message).toContain('Failed to read .gitignore');
        expect((error as GitignoreReadError).cause).toBeDefined();
      }
    });
  });

  describe('comment handling', () => {
    it('only adds comment once for grouped entries', async () => {
      const entries: GitignoreEntry[] = [
        {
          pattern: 'docs/codingbuddy/context.md',
          comment: '# Codingbuddy (local workspace)',
        },
        { pattern: 'docs/codingbuddy/sessions/' },
      ];

      await ensureGitignoreEntries(projectRoot, entries);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8') as string;
      const commentMatches = content.match(/# Codingbuddy \(local workspace\)/g);
      expect(commentMatches?.length).toBe(1);
    });

    it('adds blank line before comment section', async () => {
      vol.writeFileSync(`${projectRoot}/.gitignore`, 'node_modules/\n');

      const entries: GitignoreEntry[] = [{ pattern: 'dist/', comment: '# Build' }];

      await ensureGitignoreEntries(projectRoot, entries);

      const content = vol.readFileSync(`${projectRoot}/.gitignore`, 'utf-8');
      // Should have blank line before comment
      expect(content).toMatch(/node_modules\/\n\n# Build/);
    });
  });
});
