import { describe, it, expect, vi, afterEach } from 'vitest';
import { TuiIpcBridge } from './ipc-bridge';
import { TuiEventBus } from '../events/event-bus';
import { TUI_EVENTS } from '../events/types';
import type { TuiIpcServer } from './ipc-server';

describe('TuiIpcBridge', () => {
  let eventBus: TuiEventBus;
  let mockServer: TuiIpcServer;
  let bridge: TuiIpcBridge;

  afterEach(() => {
    bridge?.destroy();
    eventBus?.removeAllListeners();
  });

  it('should forward EventBus events to IPC server broadcast', () => {
    eventBus = new TuiEventBus();
    const broadcastSpy = vi.fn();
    mockServer = { broadcast: broadcastSpy } as unknown as TuiIpcServer;
    bridge = new TuiIpcBridge(eventBus, mockServer);

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });

    expect(broadcastSpy).toHaveBeenCalledWith({
      type: 'mode:changed',
      payload: { from: null, to: 'PLAN' },
    });
  });

  it('should forward all 7 event types', () => {
    eventBus = new TuiEventBus();
    const broadcastSpy = vi.fn();
    mockServer = { broadcast: broadcastSpy } as unknown as TuiIpcServer;
    bridge = new TuiIpcBridge(eventBus, mockServer);

    eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
      agentId: 'a',
      name: 'n',
      role: 'r',
      isPrimary: true,
    });
    eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
      agentId: 'a',
      reason: 'completed',
      durationMs: 100,
    });
    eventBus.emit(TUI_EVENTS.AGENTS_LOADED, { agents: [] });
    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'ACT' });
    eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, {
      skillName: 's',
      reason: 'r',
    });
    eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, {
      specialists: ['a'],
      mode: 'PLAN',
    });
    eventBus.emit(TUI_EVENTS.PARALLEL_COMPLETED, {
      specialists: ['a'],
      results: {},
    });

    expect(broadcastSpy).toHaveBeenCalledTimes(7);
  });

  it('should stop forwarding after destroy', () => {
    eventBus = new TuiEventBus();
    const broadcastSpy = vi.fn();
    mockServer = { broadcast: broadcastSpy } as unknown as TuiIpcServer;
    bridge = new TuiIpcBridge(eventBus, mockServer);

    bridge.destroy();

    eventBus.emit(TUI_EVENTS.MODE_CHANGED, { from: null, to: 'PLAN' });
    expect(broadcastSpy).not.toHaveBeenCalled();
  });
});
