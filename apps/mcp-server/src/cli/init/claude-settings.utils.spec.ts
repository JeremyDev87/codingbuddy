/**
 * Claude Settings Utilities Tests
 *
 * TDD tests for ~/.claude/settings.json manipulation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { vol } from 'memfs';
import {
  ensureClaudeSettingsEnv,
  ClaudeSettingsReadError,
  ClaudeSettingsWriteError,
} from './claude-settings.utils';

// Mock fs module with memfs
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Mock os.homedir
vi.mock('os', () => ({
  homedir: () => '/mock-home',
}));

describe('ensureClaudeSettingsEnv', () => {
  const claudeDir = '/mock-home/.claude';
  const settingsPath = '/mock-home/.claude/settings.json';

  beforeEach(() => {
    vol.reset();
  });

  describe('when ~/.claude/settings.json does not exist', () => {
    it('creates settings file with env entries', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual(['ENABLE_TOOL_SEARCH']);
      expect(result.alreadyExists).toEqual([]);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      expect(content).toEqual({
        env: {
          ENABLE_TOOL_SEARCH: 'false',
        },
      });
    });

    it('creates ~/.claude directory if it does not exist', async () => {
      // No directory created beforehand
      vol.mkdirSync('/mock-home', { recursive: true });

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual(['ENABLE_TOOL_SEARCH']);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      expect(content.env.ENABLE_TOOL_SEARCH).toBe('false');
    });
  });

  describe('when settings.json exists with other env vars', () => {
    it('merges new env entries preserving existing ones', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            env: {
              EXISTING_VAR: 'keep-me',
            },
            language: 'ko',
          },
          null,
          2,
        ),
      );

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual(['ENABLE_TOOL_SEARCH']);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      expect(content.env.EXISTING_VAR).toBe('keep-me');
      expect(content.env.ENABLE_TOOL_SEARCH).toBe('false');
      expect(content.language).toBe('ko');
    });
  });

  describe('when env key already exists', () => {
    it('does not overwrite existing env key', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            env: {
              ENABLE_TOOL_SEARCH: 'true',
            },
          },
          null,
          2,
        ),
      );

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual([]);
      expect(result.alreadyExists).toEqual(['ENABLE_TOOL_SEARCH']);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      // Should NOT be overwritten
      expect(content.env.ENABLE_TOOL_SEARCH).toBe('true');
    });
  });

  describe('when settings.json exists without env section', () => {
    it('adds env section with entries', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            language: 'ko',
          },
          null,
          2,
        ),
      );

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual(['ENABLE_TOOL_SEARCH']);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      expect(content.env.ENABLE_TOOL_SEARCH).toBe('false');
      expect(content.language).toBe('ko');
    });
  });

  describe('multiple entries', () => {
    it('adds multiple env entries at once', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
        ANOTHER_SETTING: 'value',
      });

      expect(result.added).toEqual(['ENABLE_TOOL_SEARCH', 'ANOTHER_SETTING']);

      const content = JSON.parse(vol.readFileSync(settingsPath, 'utf-8') as string);
      expect(content.env.ENABLE_TOOL_SEARCH).toBe('false');
      expect(content.env.ANOTHER_SETTING).toBe('value');
    });

    it('handles mix of new and existing entries', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            env: {
              ENABLE_TOOL_SEARCH: 'true',
            },
          },
          null,
          2,
        ),
      );

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
        NEW_SETTING: 'new-value',
      });

      expect(result.added).toEqual(['NEW_SETTING']);
      expect(result.alreadyExists).toEqual(['ENABLE_TOOL_SEARCH']);
    });
  });

  describe('error handling', () => {
    it('throws ClaudeSettingsReadError when file contains invalid JSON', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(settingsPath, 'not valid json{{{');

      await expect(ensureClaudeSettingsEnv({ ENABLE_TOOL_SEARCH: 'false' })).rejects.toThrow(
        ClaudeSettingsReadError,
      );
    });

    it('throws ClaudeSettingsWriteError when directory cannot be created', async () => {
      // Create a file where ~/.claude directory should be, blocking mkdir
      vol.mkdirSync('/mock-home', { recursive: true });
      vol.writeFileSync('/mock-home/.claude', 'blocking file');

      await expect(ensureClaudeSettingsEnv({ ENABLE_TOOL_SEARCH: 'false' })).rejects.toThrow(
        ClaudeSettingsWriteError,
      );
    });
  });

  describe('when no entries to add', () => {
    it('returns early without writing', async () => {
      vol.mkdirSync(claudeDir, { recursive: true });
      vol.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            env: {
              ENABLE_TOOL_SEARCH: 'false',
            },
          },
          null,
          2,
        ),
      );

      const result = await ensureClaudeSettingsEnv({
        ENABLE_TOOL_SEARCH: 'false',
      });

      expect(result.added).toEqual([]);
      expect(result.alreadyExists).toEqual(['ENABLE_TOOL_SEARCH']);
    });
  });
});
