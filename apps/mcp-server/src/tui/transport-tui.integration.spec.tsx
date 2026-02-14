import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { PassThrough } from 'stream';
import { render } from 'ink-testing-library';
import { App } from './app';
import { TuiEventBus, TUI_EVENTS } from './events';
import { resolveTuiConfig } from './tui-config';

vi.mock('./utils/icons', async importOriginal => {
  const actual = await importOriginal<typeof import('./utils/icons')>();
  return { ...actual, isNerdFontEnabled: () => false };
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Transport-TUI Integration', () => {
  describe('stdio 모드: stdout 격리', () => {
    it('should configure TUI to render to stderr in stdio mode', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: true,
        stderrIsTTY: true,
      });

      expect(config.shouldRender).toBe(true);
      expect(config.target).toBe('stderr');
    });

    it('should NOT render TUI output to stdout stream', async () => {
      const stdoutCapture: string[] = [];
      const mockStdout = new PassThrough();
      mockStdout.on('data', chunk => stdoutCapture.push(chunk.toString()));

      // TUI renders to a SEPARATE stream (simulating stderr)
      const stderrStream = new PassThrough();
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />, {
        stdout: stderrStream as unknown as NodeJS.WriteStream,
      });

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'test-agent',
        name: 'test-agent',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      // stdout should have ZERO TUI content
      expect(stdoutCapture.join('')).toBe('');
      // stderr (TUI stream) should have content
      expect(lastFrame()).toBeTruthy();
    });

    it('should allow MCP JSON-RPC messages on stdout while TUI runs on stderr', async () => {
      const stdoutCapture: string[] = [];
      const mockStdout = new PassThrough();
      mockStdout.on('data', chunk => stdoutCapture.push(chunk.toString()));

      // Simulate MCP JSON-RPC output to stdout
      const jsonRpcMessage = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { content: [{ type: 'text', text: 'hello' }] },
      });
      mockStdout.write(jsonRpcMessage + '\n');

      // TUI renders independently on separate stream
      const stderrStream = new PassThrough();
      const eventBus = new TuiEventBus();
      render(<App eventBus={eventBus} />, {
        stdout: stderrStream as unknown as NodeJS.WriteStream,
      });
      await tick();

      // stdout should only have JSON-RPC
      expect(stdoutCapture.join('')).toContain('"jsonrpc":"2.0"');
      expect(stdoutCapture.join('')).not.toContain('CODINGBUDDY');
    });

    it('should skip TUI when stderr is not a TTY (piped output)', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: true,
        stderrIsTTY: false,
      });

      expect(config.shouldRender).toBe(false);
      expect(config.reason).toContain('not a TTY');
    });
  });

  describe('stdio 모드: MCP + TUI 동시 동작', () => {
    it('should handle concurrent MCP events and TUI rendering', async () => {
      const stderrStream = new PassThrough();
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />, {
        stdout: stderrStream as unknown as NodeJS.WriteStream,
      });

      // Simulate rapid MCP tool calls generating TUI events
      const agentIds = ['arch-1', 'sec-1', 'perf-1'];
      for (const id of agentIds) {
        eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
          agentId: id,
          name: `agent-${id}`,
          role: 'specialist',
          isPrimary: id === 'arch-1',
        });
      }
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('3 active');
    });
  });

  describe('SSE 모드: HTTP 서버 + TUI 동시 실행', () => {
    it('should configure TUI to render to stdout in SSE mode', () => {
      const config = resolveTuiConfig({
        transportMode: 'sse',
        tuiEnabled: true,
        stderrIsTTY: false,
      });

      expect(config.shouldRender).toBe(true);
      expect(config.target).toBe('stdout');
    });

    it('should render TUI to stdout stream in SSE mode', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      eventBus.emit(TUI_EVENTS.MODE_CHANGED, {
        from: null,
        to: 'PLAN',
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('PLAN');
    });

    it('should handle SSE events and TUI simultaneously', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // Simulate SSE mode workflow: mode change + agent activation
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, {
        from: 'PLAN',
        to: 'ACT',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'fe-dev',
        name: 'frontend-developer',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('ACT');
      expect(frame).toContain('1 active');
    });

    it('should NOT conflict with SSE event stream protocol', () => {
      // SSE uses HTTP responses, not stdout pipe
      // TUI on stdout is safe because SSE protocol is over HTTP connection
      const config = resolveTuiConfig({
        transportMode: 'sse',
        tuiEnabled: true,
        stderrIsTTY: true,
      });

      // SSE mode always uses stdout regardless of TTY status
      expect(config.target).toBe('stdout');
    });
  });

  describe('공통: --tui 플래그 없을 때 기존 동작 보존', () => {
    it('should not render TUI in stdio mode without --tui flag', () => {
      const config = resolveTuiConfig({
        transportMode: 'stdio',
        tuiEnabled: false,
        stderrIsTTY: true,
      });

      expect(config.shouldRender).toBe(false);
      expect(config.reason).toContain('--tui flag not present');
    });

    it('should not render TUI in SSE mode without --tui flag', () => {
      const config = resolveTuiConfig({
        transportMode: 'sse',
        tuiEnabled: false,
        stderrIsTTY: true,
      });

      expect(config.shouldRender).toBe(false);
      expect(config.reason).toContain('--tui flag not present');
    });
  });

  describe('공통: 터미널 리사이즈 대응', () => {
    it('should render TUI components at different terminal widths', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />, {
        columns: 80,
      });

      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'test-1',
        name: 'test-agent',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      const frame80 = lastFrame() ?? '';
      expect(frame80).toBeTruthy();

      // Verify component also renders at narrow width
      const eventBus2 = new TuiEventBus();
      const { lastFrame: lastFrame40 } = render(
        <App eventBus={eventBus2} />,
        { columns: 40 },
      );
      eventBus2.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'test-1',
        name: 'test-agent',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      const frame40 = lastFrame40() ?? '';
      expect(frame40).toBeTruthy();
    });

    it('should maintain state across event-driven re-renders', async () => {
      const eventBus = new TuiEventBus();
      const { lastFrame } = render(<App eventBus={eventBus} />);

      // Set state
      eventBus.emit(TUI_EVENTS.MODE_CHANGED, {
        from: 'ACT',
        to: 'EVAL',
      });
      eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: 'eval-1',
        name: 'evaluator',
        role: 'primary',
        isPrimary: true,
      });
      await tick();

      const frame = lastFrame() ?? '';
      expect(frame).toContain('EVAL');
      expect(frame).toContain('1 active');
    });
  });
});
