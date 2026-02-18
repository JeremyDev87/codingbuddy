import { Injectable, Logger } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import { parseAgentFromToolName } from './parse-agent';
import { extractEventsFromResponse, type ExtractedEvent } from './response-event-extractor';
import type { Mode } from '../types';

@Injectable()
export class TuiInterceptor {
  private readonly logger = new Logger(TuiInterceptor.name);
  private enabled = false;
  private currentMode: Mode | null = null;
  private currentPrimaryAgentId: string | null = null;

  constructor(private readonly eventBus: TuiEventBus) {}

  enable(): void {
    this.enabled = true;
    this.logger.log('TuiInterceptor enabled');
  }

  disable(): void {
    this.enabled = false;
    this.currentMode = null;
    this.currentPrimaryAgentId = null;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Safely defer event emission to avoid blocking MCP responses.
   */
  private safeDefer(fn: () => void): void {
    setImmediate(() => {
      try {
        fn();
      } catch (error) {
        this.logger.error('Event emission failed', error);
      }
    });
  }

  async intercept<T>(
    toolName: string,
    args: Record<string, unknown> | undefined,
    execute: () => Promise<T>,
  ): Promise<T> {
    if (!this.enabled) {
      return execute();
    }

    const agentInfo = parseAgentFromToolName(toolName, args);

    if (agentInfo) {
      // Emit agent:activated asynchronously to prevent MCP response delay
      this.safeDefer(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, agentInfo);
      });
    }

    // Emit tool:invoked for every tool call
    this.safeDefer(() => {
      this.eventBus.emit(TUI_EVENTS.TOOL_INVOKED, {
        toolName,
        agentId: agentInfo?.agentId ?? null,
        timestamp: Date.now(),
      });
    });

    const startTime = Date.now();

    try {
      const result = await execute();
      const endTime = Date.now();

      // Separate safeDefer calls to prevent cascade failure
      if (agentInfo) {
        this.safeDefer(() => {
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: agentInfo.agentId,
            reason: 'completed',
            durationMs: endTime - startTime,
          });
        });
      }

      // Extract and emit semantic events from tool response
      this.safeDefer(() => {
        const semanticEvents = extractEventsFromResponse(toolName, result);
        for (const evt of semanticEvents) {
          this.emitSemanticEvent(evt);
        }
      });

      return result;
    } catch (error) {
      const endTime = Date.now();

      if (agentInfo) {
        this.safeDefer(() => {
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: agentInfo.agentId,
            reason: 'error',
            durationMs: endTime - startTime,
          });
        });
      }

      throw error;
    }
  }

  /**
   * Emits SESSION_RESET and clears internal session state.
   * Public for testability — prefer auto-trigger via emitSemanticEvent().
   */
  resetSession(reason: string): void {
    this.eventBus.emit(TUI_EVENTS.SESSION_RESET, { reason });
    this.currentMode = null;
    this.currentPrimaryAgentId = null;
  }

  private emitSemanticEvent(evt: ExtractedEvent): void {
    switch (evt.event) {
      case TUI_EVENTS.MODE_CHANGED: {
        const targetMode = evt.payload.to;
        if ((targetMode === 'PLAN' || targetMode === 'AUTO') && this.currentMode !== null) {
          this.resetSession('new-plan-session');
        }
        const payload = { ...evt.payload, from: this.currentMode };
        this.currentMode = evt.payload.to;
        this.eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);
        break;
      }
      case TUI_EVENTS.AGENT_ACTIVATED: {
        if (this.currentPrimaryAgentId) {
          // durationMs: 0 signals "replaced before tool-level deactivation" (not measured)
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: this.currentPrimaryAgentId,
            reason: 'replaced',
            durationMs: 0,
          });
        }
        this.currentPrimaryAgentId = evt.payload.agentId;
        this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, evt.payload);
        break;
      }
      case TUI_EVENTS.SKILL_RECOMMENDED:
        this.eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, evt.payload);
        break;
      case TUI_EVENTS.PARALLEL_STARTED:
        this.eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, evt.payload);
        break;
      case TUI_EVENTS.AGENT_RELATIONSHIP:
        this.eventBus.emit(TUI_EVENTS.AGENT_RELATIONSHIP, evt.payload);
        break;
      case TUI_EVENTS.TASK_SYNCED:
        this.eventBus.emit(TUI_EVENTS.TASK_SYNCED, evt.payload);
        break;
      case TUI_EVENTS.OBJECTIVE_SET:
        this.eventBus.emit(TUI_EVENTS.OBJECTIVE_SET, evt.payload);
        break;
      default: {
        const _exhaustive: never = evt;
        this.logger.warn(`Unhandled semantic event: ${(_exhaustive as { event: string }).event}`);
      }
    }
  }
}
