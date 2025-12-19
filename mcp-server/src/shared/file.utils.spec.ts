import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeReadFile, tryReadFile, safeReadDirWithTypes } from './file.utils';
import { promises as fs } from 'fs';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    readdir: vi.fn(),
  },
}));

describe('file.utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeReadFile', () => {
    it('should return file content when file exists', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      const result = await safeReadFile('/path/to/file.txt');

      expect(result).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
    });

    it('should return null when file does not exist (ENOENT)', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await safeReadFile('/path/to/nonexistent.txt');

      expect(result).toBeNull();
    });

    it('should throw on permission errors', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(safeReadFile('/path/to/protected.txt')).rejects.toThrow(
        'Permission denied',
      );
    });

    it('should throw on other errors', async () => {
      const error = new Error('Unknown error');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(safeReadFile('/path/to/file.txt')).rejects.toThrow(
        'Unknown error',
      );
    });
  });

  describe('tryReadFile', () => {
    it('should return file content when file exists', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('file content');

      const result = await tryReadFile('/path/to/file.txt');

      expect(result).toBe('file content');
    });

    it('should return undefined when file does not exist', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await tryReadFile('/path/to/nonexistent.txt');

      expect(result).toBeUndefined();
    });

    it('should return undefined on any error (silent failure)', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      const result = await tryReadFile('/path/to/protected.txt');

      expect(result).toBeUndefined();
    });
  });

  describe('safeReadDirWithTypes', () => {
    it('should return directory entries with types when directory exists', async () => {
      const mockEntries = [
        { name: 'file.txt', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true },
      ];
      vi.mocked(fs.readdir).mockResolvedValue(mockEntries as unknown as Awaited<ReturnType<typeof fs.readdir>>);

      const result = await safeReadDirWithTypes('/path/to/dir');

      expect(result).toEqual(mockEntries);
      expect(fs.readdir).toHaveBeenCalledWith('/path/to/dir', { withFileTypes: true });
    });

    it('should return empty array when directory does not exist (ENOENT)', async () => {
      const error = new Error('Directory not found') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const result = await safeReadDirWithTypes('/path/to/nonexistent');

      expect(result).toEqual([]);
    });

    it('should throw on permission errors', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';
      vi.mocked(fs.readdir).mockRejectedValue(error);

      await expect(safeReadDirWithTypes('/path/to/protected')).rejects.toThrow(
        'Permission denied',
      );
    });
  });
});
