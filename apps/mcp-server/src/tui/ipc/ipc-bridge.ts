import type { TuiEventBus } from '../events/event-bus';
import { TUI_EVENTS, type TuiEventName, type TuiEventMap } from '../events/types';
import type { TuiIpcServer } from './ipc-server';
import type { IpcMessage } from './ipc.types';

/** Handler type matching TuiEventBus's generic listener signature */
type AnyEventHandler = (payload: TuiEventMap[TuiEventName]) => void;

/**
 * Bridges TuiEventBus events to IPC server for remote TUI clients.
 * Subscribes to all TUI events and broadcasts them over Unix socket.
 */
export class TuiIpcBridge {
  private readonly handlers = new Map<TuiEventName, AnyEventHandler>();

  constructor(
    private readonly eventBus: TuiEventBus,
    private readonly ipcServer: TuiIpcServer,
  ) {
    const eventNames = Object.values(TUI_EVENTS) as TuiEventName[];
    for (const eventName of eventNames) {
      const handler: AnyEventHandler = payload => {
        this.ipcServer.broadcast({ type: eventName, payload } as IpcMessage);
      };
      this.handlers.set(eventName, handler);
      this.subscribe(eventName, handler);
    }
  }

  destroy(): void {
    for (const [event, handler] of this.handlers) {
      this.unsubscribe(event, handler);
    }
    this.handlers.clear();
  }

  /**
   * Subscribe to an event. Cast is needed because TypeScript cannot narrow
   * the TuiEventName union type within a loop over Object.values(TUI_EVENTS).
   * Safety: eventName and handler always match by construction.
   */
  private subscribe(event: TuiEventName, handler: AnyEventHandler): void {
    (this.eventBus.on as (e: string, h: AnyEventHandler) => void)(event, handler);
  }

  private unsubscribe(event: TuiEventName, handler: AnyEventHandler): void {
    (this.eventBus.off as (e: string, h: AnyEventHandler) => void)(event, handler);
  }
}
