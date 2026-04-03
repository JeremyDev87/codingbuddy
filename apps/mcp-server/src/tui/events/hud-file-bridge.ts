/**
 * HUD File Bridge — watches ~/.codingbuddy/hud-state.json and emits
 * TUI EventBus events so the standalone TUI sidebar stays in sync
 * with mode/agent changes even when the MCP server runs in stdio mode.
 *
 * @see https://github.com/JeremyDev87/codingbuddy/issues/1104
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';

const VALID_MODES = new Set(['PLAN', 'ACT', 'EVAL', 'AUTO']);

export interface HudFileBridgeOptions {
  /** Debounce interval in ms (default: 150) */
  debounceMs?: number;
  /** Polling interval in ms for hybrid safety-net polling (default: 200) */
  pollIntervalMs?: number;
}

interface HudState {
  currentMode: string | null;
  activeAgent: string | null;
}

export class HudFileBridge {
  private readonly eventBus: TuiEventBus;
  private readonly filePath: string;
  private readonly debounceMs: number;
  private readonly pollIntervalMs: number;

  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastMtimeMs = 0;
  private prev: HudState = { currentMode: null, activeAgent: null };
  private stopped = false;

  constructor(eventBus: TuiEventBus, filePath: string, options?: HudFileBridgeOptions) {
    this.eventBus = eventBus;
    this.filePath = filePath;
    this.debounceMs = options?.debounceMs ?? 150;
    this.pollIntervalMs = options?.pollIntervalMs ?? 200;
  }

  start(): void {
    this.stopped = false;
    this.prev = this.readState();

    // Watch the parent directory instead of the file itself.
    // macOS FSEvents sometimes misses in-place overwrites of a single file,
    // but reliably reports directory-level change events.
    const dir = path.dirname(this.filePath);
    const basename = path.basename(this.filePath);

    try {
      fs.mkdirSync(dir, { recursive: true });
      this.watcher = fs.watch(dir, { persistent: false }, (_event, filename) => {
        // macOS FSEvents may pass null for filename
        if (!filename || filename === basename) this.scheduleProcess();
      });
      this.watcher.on('error', () => {
        // Watcher failed — close it; polling is already running as safety net
        this.watcher?.close();
        this.watcher = null;
        process.stderr.write('[codingbuddy] fs.watch failed, polling safety net active\n');
      });
      // Hybrid mode: run polling alongside fs.watch as a silent safety net
      this.startPollingFallback(true);
    } catch {
      // Directory doesn't exist yet — poll until it appears
      this.pollUntilExists();
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private scheduleProcess(): void {
    if (this.stopped) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.processChange(), this.debounceMs);
  }

  private processChange(): void {
    if (this.stopped) return;

    const next = this.readState();

    if (
      next.currentMode &&
      VALID_MODES.has(next.currentMode) &&
      next.currentMode !== this.prev.currentMode
    ) {
      this.eventBus.emit(TUI_EVENTS.MODE_CHANGED, {
        from: (this.prev.currentMode as 'PLAN' | 'ACT' | 'EVAL' | 'AUTO') ?? null,
        to: next.currentMode as 'PLAN' | 'ACT' | 'EVAL' | 'AUTO',
      });
    }

    if (next.activeAgent && next.activeAgent !== this.prev.activeAgent) {
      this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, {
        agentId: `primary:${next.activeAgent}`,
        name: next.activeAgent,
        role: 'primary',
        isPrimary: true,
      });
    }

    this.prev = next;
  }

  private readState(): HudState {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        currentMode: typeof parsed.currentMode === 'string' ? parsed.currentMode : null,
        activeAgent: typeof parsed.activeAgent === 'string' ? parsed.activeAgent : null,
      };
    } catch {
      return { currentMode: null, activeAgent: null };
    }
  }

  private startPollingFallback(silent: boolean = false): void {
    if (this.stopped || this.pollInterval) return;
    if (!silent) {
      process.stderr.write('[codingbuddy] fs.watch failed, falling back to polling\n');
    }
    try {
      const stat = fs.statSync(this.filePath);
      this.lastMtimeMs = stat.mtimeMs;
    } catch {
      this.lastMtimeMs = 0;
    }
    this.pollInterval = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.pollInterval!);
        this.pollInterval = null;
        return;
      }
      try {
        const stat = fs.statSync(this.filePath);
        if (stat.mtimeMs !== this.lastMtimeMs) {
          this.lastMtimeMs = stat.mtimeMs;
          this.scheduleProcess();
        }
      } catch {
        // File may have been deleted — ignore until it reappears
      }
    }, this.pollIntervalMs);
  }

  private pollUntilExists(): void {
    if (this.stopped) return;
    this.pollInterval = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.pollInterval!);
        this.pollInterval = null;
        return;
      }
      if (fs.existsSync(this.filePath)) {
        clearInterval(this.pollInterval!);
        this.pollInterval = null;
        this.start();
      }
    }, 2000);
  }
}
