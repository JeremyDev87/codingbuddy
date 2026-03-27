import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextArchiveHandler } from './context-archive.handler';
import type { ContextArchiveService } from '../../context/context-archive.service';

describe('ContextArchiveHandler', () => {
  let handler: ContextArchiveHandler;
  let mockArchiveService: Partial<ContextArchiveService>;

  beforeEach(() => {
    mockArchiveService = {
      getHistory: vi.fn().mockResolvedValue({
        entries: [
          {
            filename: '2026-03-28-1000.md',
            path: 'docs/codingbuddy/archive/2026-03-28-1000.md',
            title: 'test-task',
            createdAt: '2026-03-28T10:00:00.000Z',
            sizeBytes: 500,
          },
        ],
        totalCount: 1,
        truncated: false,
      }),
      searchArchives: vi.fn().mockResolvedValue({
        keyword: 'jwt',
        results: [
          {
            entry: {
              filename: '2026-03-28-1000.md',
              path: 'docs/codingbuddy/archive/2026-03-28-1000.md',
              title: 'test-task',
              createdAt: '2026-03-28T10:00:00.000Z',
              sizeBytes: 500,
            },
            matches: ['- Use JWT tokens for session management'],
          },
        ],
        totalSearched: 1,
      }),
      cleanupOldArchives: vi.fn().mockResolvedValue({
        summarizedCount: 2,
        deletedCount: 2,
        remainingCount: 5,
      }),
    };

    handler = new ContextArchiveHandler(mockArchiveService as ContextArchiveService);
  });

  describe('getHandledTools', () => {
    it('should handle get_context_history', async () => {
      const result = await handler.handle('get_context_history', {});
      expect(result).not.toBeNull();
      expect(mockArchiveService.getHistory).toHaveBeenCalled();
    });

    it('should handle search_context_archives', async () => {
      const result = await handler.handle('search_context_archives', { keyword: 'jwt' });
      expect(result).not.toBeNull();
      expect(mockArchiveService.searchArchives).toHaveBeenCalledWith('jwt', 50);
    });

    it('should handle cleanup_context_archives', async () => {
      const result = await handler.handle('cleanup_context_archives', {});
      expect(result).not.toBeNull();
      expect(mockArchiveService.cleanupOldArchives).toHaveBeenCalledWith(30);
    });

    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });
  });

  describe('get_context_history', () => {
    it('should pass limit parameter', async () => {
      await handler.handle('get_context_history', { limit: 5 });
      expect(mockArchiveService.getHistory).toHaveBeenCalledWith(5);
    });

    it('should default to limit 10', async () => {
      await handler.handle('get_context_history', {});
      expect(mockArchiveService.getHistory).toHaveBeenCalledWith(10);
    });

    it('should return error for invalid limit', async () => {
      const result = await handler.handle('get_context_history', { limit: 0 });
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('limit must be >= 1');
    });

    it('should include archive entries in response', async () => {
      const result = await handler.handle('get_context_history', {});
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0].title).toBe('test-task');
      expect(parsed.totalCount).toBe(1);
    });
  });

  describe('search_context_archives', () => {
    it('should return error when keyword is missing', async () => {
      const result = await handler.handle('search_context_archives', {});
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
    });

    it('should return search results', async () => {
      const result = await handler.handle('search_context_archives', { keyword: 'jwt' });
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.keyword).toBe('jwt');
    });

    it('should pass custom limit', async () => {
      await handler.handle('search_context_archives', { keyword: 'test', limit: 10 });
      expect(mockArchiveService.searchArchives).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('cleanup_context_archives', () => {
    it('should pass custom maxAgeDays', async () => {
      await handler.handle('cleanup_context_archives', { maxAgeDays: 60 });
      expect(mockArchiveService.cleanupOldArchives).toHaveBeenCalledWith(60);
    });

    it('should return error for invalid maxAgeDays', async () => {
      const result = await handler.handle('cleanup_context_archives', { maxAgeDays: 0 });
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
    });

    it('should return cleanup results', async () => {
      const result = await handler.handle('cleanup_context_archives', {});
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.summarizedCount).toBe(2);
      expect(parsed.remainingCount).toBe(5);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return 3 tool definitions', () => {
      const defs = handler.getToolDefinitions();
      expect(defs).toHaveLength(3);
      expect(defs.map(d => d.name)).toEqual([
        'get_context_history',
        'search_context_archives',
        'cleanup_context_archives',
      ]);
    });
  });
});
