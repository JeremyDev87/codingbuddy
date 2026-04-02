import { Injectable } from '@nestjs/common';
import { RuleEvent, RULE_EVENT_TYPES } from './rule-event.types';

@Injectable()
export class RuleEventCollector {
  private events: RuleEvent[] = [];

  record(event: RuleEvent): void {
    if (!RULE_EVENT_TYPES.includes(event.type)) {
      throw new Error(`Invalid rule event type: ${event.type}`);
    }

    this.events.push({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });
  }

  getEvents(): RuleEvent[] {
    return [...this.events];
  }

  flush(): RuleEvent[] {
    const flushed = [...this.events];
    this.events = [];
    return flushed;
  }
}
