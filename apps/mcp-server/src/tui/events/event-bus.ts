import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import type { TuiEventMap, TuiEventName } from './types';

type EventHandler<T> = (payload: T) => void;

/**
 * TuiEventBus - Type-safe event bus for TUI Agent Monitor
 *
 * Wraps EventEmitter2 to provide type-safe emit/on/off/once operations
 * for TUI events. Registered as NestJS Injectable for DI sharing.
 */
@Injectable()
export class TuiEventBus {
  private readonly logger = new Logger(TuiEventBus.name);
  private readonly emitter = new EventEmitter2();

  emit<K extends TuiEventName>(event: K, payload: TuiEventMap[K]): void {
    this.logger.debug(`Emitting event: ${event}`);
    this.emitter.emit(event, payload);
  }

  on<K extends TuiEventName>(event: K, handler: EventHandler<TuiEventMap[K]>): void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
  }

  off<K extends TuiEventName>(event: K, handler: EventHandler<TuiEventMap[K]>): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }

  once<K extends TuiEventName>(event: K, handler: EventHandler<TuiEventMap[K]>): void {
    this.emitter.once(event, handler as (...args: unknown[]) => void);
  }

  removeAllListeners(event?: TuiEventName): void {
    this.emitter.removeAllListeners(event);
  }

  listenerCount(event: TuiEventName): number {
    return this.emitter.listenerCount(event);
  }
}
