import type { IpcMessage } from './ipc.types';

/**
 * Minimal EventBus interface for state caching.
 * Uses string signatures to avoid TuiEventBus generic narrowing issues.
 */
export interface StateCacheEventBus {
  on(event: string, handler: (payload: unknown) => void): void;
  off(event: string, handler: (payload: unknown) => void): void;
}

/**
 * Caches the latest TUI event payloads for late-connecting IPC clients.
 * When a new TUI client connects, it receives a snapshot of the current state
 * so it can reconstruct the UI without waiting for new events.
 *
 * Cache strategies:
 * - Simple: last payload per event name (MODE_CHANGED, AGENTS_LOADED)
 * - Compound: per-entity keying (AGENT_ACTIVATED by agentId)
 * - Toggle: on-event caches, off-event clears (PARALLEL_STARTED/COMPLETED)
 *
 * Intentionally excluded (ephemeral/transient):
 *   - SKILL_RECOMMENDED: one-shot notification, no persistent state to reconstruct
 */
export class IpcStateCache {
  private readonly latestState = new Map<string, IpcMessage>();
  private readonly removers: Array<() => void> = [];

  constructor(private readonly eventBus: StateCacheEventBus) {}

  /** Cache last payload per event name */
  trackSimple(eventName: string): void {
    const handler = (payload: unknown): void => {
      this.latestState.set(eventName, {
        type: eventName,
        payload,
      } as IpcMessage);
    };
    this.eventBus.on(eventName, handler);
    this.removers.push(() => this.eventBus.off(eventName, handler));
  }

  /**
   * Cache per-entity state with compound keys.
   * activateEvent adds entries keyed by `activateEvent:keyFn(payload)`.
   * deactivateEvent removes the corresponding entry.
   */
  trackCompound(
    activateEvent: string,
    deactivateEvent: string,
    keyFn: (payload: unknown) => string,
  ): void {
    const activateHandler = (payload: unknown): void => {
      const key = `${activateEvent}:${keyFn(payload)}`;
      this.latestState.set(key, {
        type: activateEvent,
        payload,
      } as IpcMessage);
    };
    this.eventBus.on(activateEvent, activateHandler);
    this.removers.push(() => this.eventBus.off(activateEvent, activateHandler));

    const deactivateHandler = (payload: unknown): void => {
      this.latestState.delete(`${activateEvent}:${keyFn(payload)}`);
    };
    this.eventBus.on(deactivateEvent, deactivateHandler);
    this.removers.push(() => this.eventBus.off(deactivateEvent, deactivateHandler));
  }

  /**
   * Cache on startEvent, clear on endEvent.
   * Used for transient states like parallel execution runs.
   */
  trackToggle(startEvent: string, endEvent: string): void {
    const startHandler = (payload: unknown): void => {
      this.latestState.set(startEvent, {
        type: startEvent,
        payload,
      } as IpcMessage);
    };
    this.eventBus.on(startEvent, startHandler);
    this.removers.push(() => this.eventBus.off(startEvent, startHandler));

    const endHandler = (): void => {
      this.latestState.delete(startEvent);
    };
    this.eventBus.on(endEvent, endHandler);
    this.removers.push(() => this.eventBus.off(endEvent, endHandler));
  }

  /** Return snapshot of all cached state for late-connecting clients */
  getSnapshot(): IpcMessage[] {
    return [...this.latestState.values()];
  }

  /** Remove all event listeners and clear cached state */
  destroy(): void {
    for (const remove of this.removers) remove();
    this.removers.length = 0;
    this.latestState.clear();
  }
}
