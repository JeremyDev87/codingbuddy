import { Injectable, Logger } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TUI_EVENTS } from './types';
import { parseAgentFromToolName } from './parse-agent';

@Injectable()
export class TuiInterceptor {
  private readonly logger = new Logger(TuiInterceptor.name);
  private enabled = false;

  constructor(private readonly eventBus: TuiEventBus) {}

  enable(): void {
    this.enabled = true;
    this.logger.log('TuiInterceptor enabled');
  }

  disable(): void {
    this.enabled = false;
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

    if (!agentInfo) {
      return execute();
    }

    // Emit agent:activated asynchronously to prevent MCP response delay
    setImmediate(() => {
      this.eventBus.emit(TUI_EVENTS.AGENT_ACTIVATED, agentInfo);
    });

    const startTime = Date.now();

    try {
      const result = await execute();

      setImmediate(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
          agentId: agentInfo.agentId,
          reason: 'completed',
          durationMs: Date.now() - startTime,
        });
      });

      return result;
    } catch (error) {
      setImmediate(() => {
        this.eventBus.emit(TUI_EVENTS.AGENT_DEACTIVATED, {
          agentId: agentInfo.agentId,
          reason: 'error',
          durationMs: Date.now() - startTime,
        });
      });

      throw error;
    }
  }
}
