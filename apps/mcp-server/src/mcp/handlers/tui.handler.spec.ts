import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../shared/security.utils', () => ({
  sanitizeHandlerArgs: vi.fn(() => ({ safe: true })),
  assertPathSafe: vi.fn((p: string) => p),
}));

const mockRestartTui = vi.fn();
vi.mock('../../cli/restart-tui', () => ({
  restartTui: mockRestartTui,
}));

describe('TuiHandler', () => {
  let handler: import('./tui.handler').TuiHandler;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { TuiHandler } = await import('./tui.handler');
    handler = new TuiHandler();
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should handle restart_tui tool successfully', async () => {
      mockRestartTui.mockResolvedValue({ success: true, reason: 'spawned', pid: 9999 });
      const result = await handler.handle('restart_tui', {});
      expect(result?.isError).toBeFalsy();
    });

    it('should return JSON with success and pid in content', async () => {
      mockRestartTui.mockResolvedValue({ success: true, reason: 'spawned', pid: 9999 });
      const result = await handler.handle('restart_tui', {});
      const content = JSON.parse((result?.content[0] as { text: string }).text);
      expect(content.success).toBe(true);
      expect(content.pid).toBe(9999);
    });

    it('should return error response when restart fails', async () => {
      mockRestartTui.mockResolvedValue({
        success: false,
        reason: 'No running MCP server found.',
      });
      const result = await handler.handle('restart_tui', {});
      expect(result?.isError).toBe(true);
      expect((result?.content[0] as { text: string }).text).toContain('No running MCP server');
    });

    it('should return error response when restartTui throws', async () => {
      mockRestartTui.mockRejectedValue(new Error('unexpected pkill error'));
      const result = await handler.handle('restart_tui', {});
      expect(result?.isError).toBe(true);
      expect((result?.content[0] as { text: string }).text).toContain('unexpected pkill error');
    });

    it('should call restartTui with no args', async () => {
      mockRestartTui.mockResolvedValue({ success: true, reason: 'spawned', pid: 1 });
      await handler.handle('restart_tui', {});
      expect(mockRestartTui).toHaveBeenCalledTimes(1);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return exactly one tool definition', () => {
      const defs = handler.getToolDefinitions();
      expect(defs).toHaveLength(1);
    });

    it('should define restart_tui tool', () => {
      const defs = handler.getToolDefinitions();
      expect(defs[0].name).toBe('restart_tui');
    });

    it('should have no required parameters', () => {
      const defs = handler.getToolDefinitions();
      expect(defs[0].inputSchema.required).toEqual([]);
    });

    it('should have a meaningful description', () => {
      const defs = handler.getToolDefinitions();
      expect(defs[0].description.length).toBeGreaterThan(10);
    });
  });
});
