import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResumeHandler } from './resume.handler';
import type { BriefingLoaderService, RestoreResult } from '../../context/briefing-loader.service';

function createMockBriefingLoaderService(result?: RestoreResult): BriefingLoaderService {
  const defaultResult: RestoreResult = {
    title: 'Auth Feature',
    mode: 'ACT',
    decisions: ['Use JWT', 'httpOnly cookies'],
    pendingTasks: ['Add refresh tokens'],
    changedFiles: ['src/auth.ts'],
    resumeCommand: 'ACT continue "Auth Feature"',
    contextRestored: true,
    briefingPath: '/project/docs/codingbuddy/briefings/2026-04-01.md',
  };

  return {
    restoreContext: vi.fn().mockResolvedValue(result ?? defaultResult),
  } as unknown as BriefingLoaderService;
}

describe('ResumeHandler', () => {
  let handler: ResumeHandler;
  let mockLoaderService: BriefingLoaderService;

  beforeEach(() => {
    mockLoaderService = createMockBriefingLoaderService();
    handler = new ResumeHandler(mockLoaderService);
  });

  describe('handle', () => {
    it('should return null for unknown tool names', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should handle resume_session tool', async () => {
      const result = await handler.handle('resume_session', {});
      expect(result).not.toBeNull();
      expect(result!.isError).toBeUndefined();
    });

    it('should pass briefingPath to service when provided', async () => {
      await handler.handle('resume_session', {
        briefingPath: '/custom/path.md',
      });

      expect(mockLoaderService.restoreContext).toHaveBeenCalledWith('/custom/path.md');
    });

    it('should call restoreContext without path when not provided', async () => {
      await handler.handle('resume_session', {});

      expect(mockLoaderService.restoreContext).toHaveBeenCalledWith(undefined);
    });

    it('should return JSON response with restore result', async () => {
      const result = await handler.handle('resume_session', {});

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.title).toBe('Auth Feature');
      expect(parsed.resumeCommand).toBe('ACT continue "Auth Feature"');
      expect(parsed.contextRestored).toBe(true);
    });

    it('should return error response when service throws', async () => {
      mockLoaderService = {
        restoreContext: vi.fn().mockRejectedValue(new Error('No briefing files found')),
      } as unknown as BriefingLoaderService;
      handler = new ResumeHandler(mockLoaderService);

      const result = await handler.handle('resume_session', {});

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('No briefing files found');
    });
  });

  describe('getToolDefinitions', () => {
    it('should return resume_session tool definition', () => {
      const defs = handler.getToolDefinitions();
      expect(defs).toHaveLength(1);
      expect(defs[0].name).toBe('resume_session');
    });

    it('should have briefingPath as optional property', () => {
      const defs = handler.getToolDefinitions();
      const schema = defs[0].inputSchema;
      expect(schema.properties).toHaveProperty('briefingPath');
      expect(schema.required).toEqual([]);
    });
  });
});
