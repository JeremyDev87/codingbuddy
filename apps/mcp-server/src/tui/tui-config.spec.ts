import { describe, it, expect } from 'vitest';
import { resolveTuiConfig } from './tui-config';

describe('resolveTuiConfig', () => {
  describe('stdio mode', () => {
    it('should target stderr when TUI enabled and stderr is TTY', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: true,
        stderrIsTTY: true,
      });
      expect(config).toEqual({
        shouldRender: true,
        target: 'stderr',
        reason:
          'stdio mode: TUI renders to stderr to protect stdout for MCP JSON-RPC',
      });
    });

    it('should skip TUI when stderr is not TTY', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: true,
        stderrIsTTY: false,
      });
      expect(config).toEqual({
        shouldRender: false,
        target: null,
        reason: 'stderr is not a TTY; skipping TUI render',
      });
    });

    it('should skip TUI when --tui flag not present', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: false,
        stderrIsTTY: true,
      });
      expect(config).toEqual({
        shouldRender: false,
        target: null,
        reason: 'TUI not enabled (--tui flag not present)',
      });
    });
  });

  describe('sse mode', () => {
    it('should target stdout when TUI enabled', () => {
      const config = resolveTuiConfig({
        transportMode: 'sse',
        tuiEnabled: true,
        stderrIsTTY: false,
      });
      expect(config).toEqual({
        shouldRender: true,
        target: 'stdout',
        reason: 'SSE mode: TUI renders to stdout',
      });
    });

    it('should skip TUI when --tui flag not present', () => {
      const config = resolveTuiConfig({
        transportMode: 'sse',
        tuiEnabled: false,
        stderrIsTTY: true,
      });
      expect(config).toEqual({
        shouldRender: false,
        target: null,
        reason: 'TUI not enabled (--tui flag not present)',
      });
    });
  });
});
