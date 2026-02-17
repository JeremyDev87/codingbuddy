import { Injectable, Logger } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import { parseAgentFromToolName } from './parse-agent';
import { extractEventsFromResponse, type ExtractedEvent } from './response-event-extractor';
import type { Mode } from '../../keyword/keyword.types';

@Injectable()
export class TuiInterceptor {
  private readonly logger = new Logger(TuiInterceptor.name);
  private enabled = false;
  private currentMode: Mode | null = null;

  constructor(private readonly eventBus: TuiEventBus) {}

  enable(): void {
    this.enabled = true;
    this.logger.log('TuiInterceptor enabled');
  }

  disable(): void {
    this.enabled = false;
    this.currentMode = null;
  }

  isEnabled(): boolean {
    return this.enabled;
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
      setImmediate(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, agentInfo);
      });
    }

    const startTime = Date.now();

    try {
      const result = await execute();

      setImmediate(() => {
        if (agentInfo) {
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: agentInfo.agentId,
            reason: 'completed',
            durationMs: Date.now() - startTime,
          });
        }

        // Extract and emit semantic events from tool response
        const semanticEvents = extractEventsFromResponse(toolName, result);
        for (const evt of semanticEvents) {
          this.emitSemanticEvent(evt);
        }
      });

      return result;
    } catch (error) {
      if (agentInfo) {
        setImmediate(() => {
          this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
            agentId: agentInfo.agentId,
            reason: 'error',
            durationMs: Date.now() - startTime,
          });
        });
      }

      throw error;
    }
  }

  private emitSemanticEvent(evt: ExtractedEvent): void {
    switch (evt.event) {
      case TUI_EVENTS.MODE_CHANGED: {
        const payload = { ...evt.payload, from: this.currentMode };
        this.currentMode = evt.payload.to;
        this.eventBus.emit(TUI_EVENTS.MODE_CHANGED, payload);
        break;
      }
      case TUI_EVENTS.SKILL_RECOMMENDED:
        this.eventBus.emit(TUI_EVENTS.SKILL_RECOMMENDED, evt.payload);
        break;
      case TUI_EVENTS.PARALLEL_STARTED:
        this.eventBus.emit(TUI_EVENTS.PARALLEL_STARTED, evt.payload);
        break;
    }
  }
}
