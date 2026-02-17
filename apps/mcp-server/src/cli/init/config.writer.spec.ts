import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { writeConfig, findExistingConfig, CONFIG_FILE_NAMES } from './config.writer';
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
    it('should only support JSON format', () => {
      expect(CONFIG_FILE_NAMES).toContain('codingbuddy.config.json');
      expect(CONFIG_FILE_NAMES).toHaveLength(1);
    });
  });

  describe('findExistingConfig', () => {
    it('should return path if JSON config file exists', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

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
    it('should write JSON config file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await writeConfig('/project', mockConfig);

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

      expect(result).toBe(path.join('/project', 'codingbuddy.config.json'));
    });

    it('should throw on write error', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'));

      await expect(writeConfig('/project', mockConfig)).rejects.toThrow('Permission denied');
    });

    it('should use raw content when raw option is true', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      const rawContent = '{"custom": "content"}';

      await writeConfig('/project', rawContent, { raw: true });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('codingbuddy.config.json'),
        rawContent,
        'utf-8',
      );
    });
  });
});
