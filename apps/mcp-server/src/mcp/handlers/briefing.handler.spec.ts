import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BriefingHandler } from './briefing.handler';
import type { BriefingService } from '../../context/briefing.service';
import type { BriefingResult } from '../../context/briefing.types';

describe('BriefingHandler', () => {
  let handler: BriefingHandler;
  let mockBriefingService: Partial<BriefingService>;

  const mockResult: BriefingResult = {
    filePath: 'docs/codingbuddy/briefings/2026-04-01T10-00-00.md',
    decisions: ['Use JWT tokens', 'Add rate limiting'],
    pendingTasks: ['Implement login endpoint'],
    changedFiles: ['src/auth/auth.service.ts'],
    resumeCommand: 'ACT continue implementing — 1 task(s) in progress',
  };

  beforeEach(() => {
    mockBriefingService = {
      createBriefing: vi.fn().mockResolvedValue(mockResult),
    };
    handler = new BriefingHandler(mockBriefingService as BriefingService);
  });

  describe('handle', () => {
    it('should handle create_briefing tool', async () => {
      const result = await handler.handle('create_briefing', {});

      expect(result).not.toBeNull();
      expect(mockBriefingService.createBriefing).toHaveBeenCalled();
    });

    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});

      expect(result).toBeNull();
    });

    it('should pass contextPath and projectRoot to service', async () => {
      await handler.handle('create_briefing', {
        contextPath: 'custom/context.md',
        projectRoot: '/my/project',
      });

      expect(mockBriefingService.createBriefing).toHaveBeenCalledWith({
        contextPath: 'custom/context.md',
        projectRoot: '/my/project',
      });
    });

    it('should return briefing result as JSON response', async () => {
      const result = await handler.handle('create_briefing', {});

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.filePath).toBe(mockResult.filePath);
      expect(parsed.decisions).toEqual(mockResult.decisions);
      expect(parsed.pendingTasks).toEqual(mockResult.pendingTasks);
      expect(parsed.changedFiles).toEqual(mockResult.changedFiles);
      expect(parsed.resumeCommand).toBe(mockResult.resumeCommand);
      expect(parsed.message).toContain('Briefing created');
    });

    it('should return error response on service failure', async () => {
      vi.mocked(mockBriefingService.createBriefing!).mockRejectedValue(
        new Error('File system error'),
      );

      const result = await handler.handle('create_briefing', {});

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain('Failed to create briefing');
      expect(result!.content[0].text).toContain('File system error');
    });

    it('should handle undefined args gracefully', async () => {
      const result = await handler.handle('create_briefing', undefined);

      expect(result).not.toBeNull();
      expect(mockBriefingService.createBriefing).toHaveBeenCalledWith({
        contextPath: undefined,
        projectRoot: undefined,
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return create_briefing tool definition', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('create_briefing');
      expect(definitions[0].description).toBeTruthy();
      expect(definitions[0].inputSchema.type).toBe('object');
      expect(definitions[0].inputSchema.properties).toHaveProperty('contextPath');
      expect(definitions[0].inputSchema.properties).toHaveProperty('projectRoot');
    });
  });
});
