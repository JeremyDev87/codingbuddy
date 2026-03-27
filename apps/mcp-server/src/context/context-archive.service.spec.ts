import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextArchiveService } from './context-archive.service';
import type { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { ARCHIVE_DIR } from './context-archive.types';

// Mock fs/promises
vi.mock('fs/promises');

// Mock fs sync functions
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

// Sample context for testing
const SAMPLE_CONTEXT = `# Context: test-task

**Created**: 2026-03-28T10:00:00.000Z
**Updated**: 2026-03-28T10:30:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

### Task
Implement authentication feature

### Decisions
- Use JWT tokens for session management
- Store refresh tokens in HTTP-only cookies

### Notes
- Consider database migration for user table changes
`;

const SAMPLE_CONTEXT_2 = `# Context: second-task

**Created**: 2026-03-27T08:00:00.000Z
**Updated**: 2026-03-27T09:00:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (08:00)

### Task
Refactor database schema

### Decisions
- Normalize user preferences table
- Add index on email column
`;

describe('ContextArchiveService', () => {
  let service: ContextArchiveService;
  const mockProjectRoot = '/test/project';

  const mockConfigService = {
    getProjectRoot: () => mockProjectRoot,
  } as unknown as ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    // By default, directories don't exist
    vi.mocked(existsSync).mockReturnValue(false);
    // Create service directly (matches project pattern)
    service = new ContextArchiveService(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('archiveContext', () => {
    it('should save content to archive directory with timestamped filename', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.archiveContext(SAMPLE_CONTEXT);

      expect(result).not.toBeNull();
      expect(result).toContain(ARCHIVE_DIR);
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}-\d{4}\.md$/);
      expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('archive'), {
        recursive: true,
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.md'),
        SAMPLE_CONTEXT,
        'utf-8',
      );
    });

    it('should return null for empty content', async () => {
      expect(await service.archiveContext('')).toBeNull();
      expect(await service.archiveContext('   ')).toBeNull();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should create archive directory if it does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.archiveContext(SAMPLE_CONTEXT);

      expect(mkdirSync).toHaveBeenCalledWith(`${mockProjectRoot}/${ARCHIVE_DIR}`, {
        recursive: true,
      });
    });

    it('should not recreate archive directory if it exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.archiveContext(SAMPLE_CONTEXT);

      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should return empty result when archive directory does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.getHistory();

      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
      expect(result.truncated).toBe(false);
    });

    it('should return archives sorted newest first', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        '2026-03-26-0800.md',
        '2026-03-28-1000.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockImplementation(
        async (filePath: Parameters<typeof fs.readFile>[0]) => {
          const p = String(filePath);
          if (p.includes('2026-03-28')) return SAMPLE_CONTEXT;
          return SAMPLE_CONTEXT_2;
        },
      );

      const result = await service.getHistory();

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].filename).toBe('2026-03-28-1000.md');
      expect(result.entries[1].filename).toBe('2026-03-26-0800.md');
      expect(result.entries[0].title).toBe('test-task');
      expect(result.entries[1].title).toBe('second-task');
      expect(result.totalCount).toBe(2);
      expect(result.truncated).toBe(false);
    });

    it('should respect limit parameter and indicate truncation', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        '2026-03-25-0800.md',
        '2026-03-26-0800.md',
        '2026-03-27-0800.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);

      const result = await service.getHistory(2);

      expect(result.entries).toHaveLength(2);
      expect(result.totalCount).toBe(3);
      expect(result.truncated).toBe(true);
    });

    it('should ignore non-archive files', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        '2026-03-28-1000.md',
        '_summary.md',
        'README.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);

      const result = await service.getHistory();

      expect(result.entries).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('searchArchives', () => {
    it('should find archives containing keyword (case-insensitive)', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue([
        '2026-03-28-1000.md',
        '2026-03-27-0800.md',
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.stat).mockResolvedValue({ size: 500 } as Awaited<ReturnType<typeof fs.stat>>);
      vi.mocked(fs.readFile).mockImplementation(
        async (filePath: Parameters<typeof fs.readFile>[0]) => {
          const p = String(filePath);
          if (p.includes('2026-03-28')) return SAMPLE_CONTEXT;
          return SAMPLE_CONTEXT_2;
        },
      );

      const result = await service.searchArchives('jwt');

      expect(result.keyword).toBe('jwt');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].entry.filename).toBe('2026-03-28-1000.md');
      expect(result.results[0].matches.length).toBeGreaterThan(0);
      expect(result.totalSearched).toBe(2);
    });

    it('should return empty for non-matching keyword', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readdir).mockResolvedValue(['2026-03-28-1000.md'] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);

      const result = await service.searchArchives('nonexistent-xyz');

      expect(result.results).toHaveLength(0);
    });

    it('should return empty for empty keyword', async () => {
      const result = await service.searchArchives('');
      expect(result.results).toEqual([]);
      expect(result.totalSearched).toBe(0);
    });

    it('should return empty when archive directory does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.searchArchives('test');
      expect(result.results).toEqual([]);
      expect(result.totalSearched).toBe(0);
    });
  });

  describe('cleanupOldArchives', () => {
    it('should return zeros when archive directory does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.cleanupOldArchives();

      expect(result.summarizedCount).toBe(0);
      expect(result.deletedCount).toBe(0);
      expect(result.remainingCount).toBe(0);
    });

    it('should not delete recent archives', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      // Use today's date for archive
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const recentFile = `${y}-${m}-${d}-1000.md`;

      vi.mocked(fs.readdir).mockResolvedValue([recentFile] as unknown as Awaited<
        ReturnType<typeof fs.readdir>
      >);

      const result = await service.cleanupOldArchives();

      expect(result.summarizedCount).toBe(0);
      expect(result.deletedCount).toBe(0);
      expect(result.remainingCount).toBe(1);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should summarize and delete old archives', async () => {
      // existsSync: true for archive dir, false for _summary.md first check
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // archive dir check in cleanupOldArchives
        .mockReturnValueOnce(false); // _summary.md check

      vi.mocked(fs.readdir).mockResolvedValue([
        '2025-01-01-1000.md', // old
        '2026-03-28-1000.md', // recent
      ] as unknown as Awaited<ReturnType<typeof fs.readdir>>);
      vi.mocked(fs.readFile).mockResolvedValue(SAMPLE_CONTEXT);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.cleanupOldArchives();

      expect(result.summarizedCount).toBe(1);
      expect(result.deletedCount).toBe(1);
      expect(result.remainingCount).toBe(1);
      // Should write summary
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('_summary.md'),
        expect.stringContaining('test-task'),
        'utf-8',
      );
      // Should delete old archive
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('2025-01-01-1000.md'));
    });
  });
});
