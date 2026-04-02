import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BriefingHandler } from './briefing.handler';
import type { BriefingService } from '../../context/briefing.service';
import type { BriefingResult } from '../../context/briefing.types';

function createMockBriefingService(result?: Partial<BriefingResult>): BriefingService {
  const defaultResult: BriefingResult = {
    filePath: '/tmp/test-project/docs/codingbuddy/briefings/2026-04-01T00-00-00-000Z.md',
    decisions: ['Use TypeScript strict mode'],
    pendingTasks: ['Add handler registration'],
    changedFiles: ['src/app.ts'],
    resumeCommand: 'ACT continue "Test Task"',
    ...result,
  };

  return {
    createBriefing: vi.fn().mockResolvedValue(defaultResult),
  } as unknown as BriefingService;
}

describe('BriefingHandler', () => {
  let handler: BriefingHandler;
  let mockService: BriefingService;

  beforeEach(() => {
    mockService = createMockBriefingService();
    handler = new BriefingHandler(mockService);
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  it('should handle create_briefing tool', async () => {
    const result = await handler.handle('create_briefing', {});
    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();

    const data = JSON.parse(result!.content[0].text);
    expect(data.filePath).toBeDefined();
    expect(data.decisions).toEqual(['Use TypeScript strict mode']);
    expect(data.pendingTasks).toEqual(['Add handler registration']);
    expect(data.changedFiles).toEqual(['src/app.ts']);
    expect(data.resumeCommand).toContain('ACT continue');
  });

  it('should pass optional contextPath to service', async () => {
    await handler.handle('create_briefing', {
      contextPath: 'custom/context.md',
    });

    expect(mockService.createBriefing).toHaveBeenCalledWith({
      contextPath: 'custom/context.md',
      projectRoot: undefined,
    });
  });

  it('should pass optional projectRoot to service', async () => {
    await handler.handle('create_briefing', {
      projectRoot: '/custom/root',
    });

    expect(mockService.createBriefing).toHaveBeenCalledWith({
      contextPath: undefined,
      projectRoot: '/custom/root',
    });
  });

  it('should return error response on service failure', async () => {
    mockService = {
      createBriefing: vi.fn().mockRejectedValue(new Error('Test error')),
    } as unknown as BriefingService;
    handler = new BriefingHandler(mockService);

    const result = await handler.handle('create_briefing', {});
    expect(result).not.toBeNull();
    expect(result!.isError).toBe(true);
    expect(result!.content[0].text).toContain('Test error');
  });

  it('should handle empty result gracefully', async () => {
    mockService = createMockBriefingService({
      decisions: [],
      pendingTasks: [],
      changedFiles: [],
    });
    handler = new BriefingHandler(mockService);

    const result = await handler.handle('create_briefing', {});
    expect(result).not.toBeNull();
    expect(result!.isError).toBeUndefined();

    const data = JSON.parse(result!.content[0].text);
    expect(data.decisions).toEqual([]);
    expect(data.pendingTasks).toEqual([]);
    expect(data.changedFiles).toEqual([]);
  });

  it('should expose tool definitions', () => {
    const defs = handler.getToolDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0].name).toBe('create_briefing');
    expect(defs[0].inputSchema.type).toBe('object');
    expect(defs[0].inputSchema.properties).toHaveProperty('contextPath');
    expect(defs[0].inputSchema.properties).toHaveProperty('projectRoot');
  });
});
