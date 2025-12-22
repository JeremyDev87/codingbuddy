import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  writeConfig,
  findExistingConfig,
  formatConfigAsJs,
  formatConfigAsJson,
  CONFIG_FILE_NAMES,
} from './config.writer';
import type { CodingBuddyConfig } from '../../config';

// Mock fs/promises
vi.mock('fs/promises');

describe('config.writer', () => {
  const mockConfig: CodingBuddyConfig = {
    projectName: 'test-app',
    language: 'ko',
    techStack: {
      frontend: ['React', 'TypeScript'],
    },
    conventions: {
      naming: {
        files: 'kebab-case',
        components: 'PascalCase',
      },
      semicolons: true,
      quotes: 'single',
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('CONFIG_FILE_NAMES', () => {
    it('should include js and json config file names', () => {
      expect(CONFIG_FILE_NAMES).toContain('codingbuddy.config.js');
      expect(CONFIG_FILE_NAMES).toContain('codingbuddy.config.json');
    });
  });

  describe('formatConfigAsJs', () => {
    it('should format config as JS module export', () => {
      const result = formatConfigAsJs(mockConfig);

      expect(result).toContain('/** @type {import');
      expect(result).toContain('module.exports');
      expect(result).toContain('projectName');
      expect(result).toContain('test-app');
    });

    it('should include proper JSDoc type annotation', () => {
      const result = formatConfigAsJs(mockConfig);

      expect(result).toMatch(/@type.*CodingBuddyConfig/);
    });

    it('should format nested objects correctly', () => {
      const result = formatConfigAsJs(mockConfig);

      expect(result).toContain('techStack');
      expect(result).toContain('frontend');
      expect(result).toContain('React');
    });

    it('should handle empty config', () => {
      const result = formatConfigAsJs({});

      expect(result).toContain('module.exports');
      expect(result).toContain('{}');
    });
  });

  describe('formatConfigAsJson', () => {
    it('should format config as JSON with indentation', () => {
      const result = formatConfigAsJson(mockConfig);

      expect(result).toContain('"projectName"');
      expect(result).toContain('"test-app"');
      // Should be formatted with indentation
      expect(result).toContain('\n');
    });

    it('should produce valid JSON', () => {
      const result = formatConfigAsJson(mockConfig);

      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('findExistingConfig', () => {
    it('should return path if config file exists', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const result = await findExistingConfig('/project');

      expect(result).toBe(path.join('/project', 'codingbuddy.config.js'));
    });

    it('should check multiple file names', async () => {
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce(undefined);

      const result = await findExistingConfig('/project');

      expect(result).toBe(path.join('/project', 'codingbuddy.config.json'));
    });

    it('should return null if no config exists', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const result = await findExistingConfig('/project');

      expect(result).toBeNull();
    });
  });

  describe('writeConfig', () => {
    it('should write JS config file by default', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await writeConfig('/project', mockConfig);

      expect(result).toContain('codingbuddy.config.js');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('codingbuddy.config.js'),
        expect.stringContaining('module.exports'),
        'utf-8',
      );
    });

    it('should write JSON config when format is json', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await writeConfig('/project', mockConfig, {
        format: 'json',
      });

      expect(result).toContain('codingbuddy.config.json');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('codingbuddy.config.json'),
        expect.stringContaining('"projectName"'),
        'utf-8',
      );
    });

    it('should return the written file path', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await writeConfig('/project', mockConfig);

      expect(result).toBe(path.join('/project', 'codingbuddy.config.js'));
    });

    it('should throw on write error', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      await expect(writeConfig('/project', mockConfig)).rejects.toThrow(
        'Permission denied',
      );
    });
  });
});
