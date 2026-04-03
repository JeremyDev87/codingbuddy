import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import { HudFileBridge } from './hud-file-bridge';

function writeHudState(filePath: string, state: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state));
}

describe('HudFileBridge', () => {
  let tmpDir: string;
  let hudFile: string;
  let eventBus: TuiEventBus;
  let bridge: HudFileBridge;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hud-bridge-'));
    hudFile = path.join(tmpDir, 'hud-state.json');
    eventBus = new TuiEventBus();
  });

  afterEach(() => {
    bridge?.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits MODE_CHANGED when currentMode changes in file', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10, pollIntervalMs: 50 });
    bridge.start();

    const modeChanges: Array<{ from: string | null; to: string }> = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    // Write new mode
    writeHudState(hudFile, { currentMode: 'ACT' });
    await sleep(500);

    expect(modeChanges.length).toBeGreaterThanOrEqual(1);
    expect(modeChanges[modeChanges.length - 1]).toEqual({ from: 'PLAN', to: 'ACT' });
  });

  it('does not emit MODE_CHANGED when mode is unchanged', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10 });
    bridge.start();

    const modeChanges: unknown[] = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    // Write same mode
    writeHudState(hudFile, { currentMode: 'PLAN', updatedAt: new Date().toISOString() });
    await sleep(100);

    expect(modeChanges).toHaveLength(0);
  });

  it('emits AGENT_ACTIVATED when activeAgent changes', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN', activeAgent: null });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10, pollIntervalMs: 50 });
    bridge.start();

    const activations: unknown[] = [];
    eventBus.on(TUI_EVENTS.AGENT_ACTIVATED, p => activations.push(p));

    writeHudState(hudFile, { currentMode: 'PLAN', activeAgent: 'technical-planner' });
    await sleep(500);

    expect(activations.length).toBeGreaterThanOrEqual(1);
    expect(activations[activations.length - 1]).toMatchObject({
      agentId: 'primary:technical-planner',
      name: 'technical-planner',
      isPrimary: true,
    });
  });

  it('handles missing file gracefully on start', () => {
    bridge = new HudFileBridge(eventBus, path.join(tmpDir, 'nonexistent.json'), { debounceMs: 10 });
    expect(() => bridge.start()).not.toThrow();
  });

  it('does not emit after stop()', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10 });
    bridge.start();

    const modeChanges: unknown[] = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    bridge.stop();

    writeHudState(hudFile, { currentMode: 'ACT' });
    await sleep(100);

    expect(modeChanges).toHaveLength(0);
  });

  it('falls back to polling when fs.watch emits error', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10, pollIntervalMs: 50 });
    bridge.start();

    const modeChanges: Array<{ from: string | null; to: string }> = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    // Simulate watcher error — polling is already running (hybrid mode)
    const watcher = (bridge as unknown as { watcher: fs.FSWatcher | null }).watcher;
    expect(watcher).not.toBeNull();
    watcher!.emit('error', new Error('EPERM'));

    // Watcher should be cleaned up after error
    const bridgeInternal = bridge as unknown as { watcher: fs.FSWatcher | null };
    expect(bridgeInternal.watcher).toBeNull();

    // Write new state — polling safety net should detect the change
    await sleep(100);
    writeHudState(hudFile, { currentMode: 'ACT' });
    await sleep(300);

    expect(modeChanges.length).toBeGreaterThanOrEqual(1);
    expect(modeChanges[modeChanges.length - 1]).toEqual({ from: 'PLAN', to: 'ACT' });
  });

  it('runs hybrid mode — both watch and poll active simultaneously', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10, pollIntervalMs: 50 });
    bridge.start();

    const bridgeInternal = bridge as unknown as {
      watcher: fs.FSWatcher | null;
      pollInterval: ReturnType<typeof setInterval> | null;
    };

    // Both watcher and polling should be active (hybrid mode)
    expect(bridgeInternal.watcher).not.toBeNull();
    expect(bridgeInternal.pollInterval).not.toBeNull();

    // Polling alone should detect changes even if fs.watch is silent
    const modeChanges: Array<{ from: string | null; to: string }> = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    writeHudState(hudFile, { currentMode: 'EVAL' });
    await sleep(300);

    expect(modeChanges.length).toBeGreaterThanOrEqual(1);
    expect(modeChanges[modeChanges.length - 1]).toEqual({ from: 'PLAN', to: 'EVAL' });
  });

  it('handles malformed JSON gracefully', async () => {
    writeHudState(hudFile, { currentMode: 'PLAN' });
    bridge = new HudFileBridge(eventBus, hudFile, { debounceMs: 10 });
    bridge.start();

    const modeChanges: unknown[] = [];
    eventBus.on(TUI_EVENTS.MODE_CHANGED, p => modeChanges.push(p));

    fs.writeFileSync(hudFile, 'not valid json{{{');
    await sleep(100);

    expect(modeChanges).toHaveLength(0);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
