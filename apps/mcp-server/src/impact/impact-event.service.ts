import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ImpactEvent, ImpactEventData, ImpactEventType, IMPACT_EVENTS_FILE } from './impact.types';

@Injectable()
export class ImpactEventService {
  private readonly logger = new Logger(ImpactEventService.name);
  private readonly sessionEvents = new Map<string, ImpactEvent[]>();

  logEvent(sessionId: string, eventType: ImpactEventType, data: ImpactEventData): void {
    const event: ImpactEvent = {
      timestamp: new Date().toISOString(),
      sessionId,
      eventType,
      data,
    };

    // Store in memory
    const events = this.sessionEvents.get(sessionId) ?? [];
    events.push(event);
    this.sessionEvents.set(sessionId, events);

    // Persist to JSONL (fire-and-forget)
    this.persistEvent(event);
  }

  getSessionEvents(sessionId: string): ImpactEvent[] {
    return this.sessionEvents.get(sessionId) ?? [];
  }

  private persistEvent(event: ImpactEvent): void {
    try {
      const filePath = path.resolve(process.cwd(), IMPACT_EVENTS_FILE);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(filePath, JSON.stringify(event) + '\n');
    } catch (error) {
      this.logger.warn(`Failed to persist impact event: ${error}`);
    }
  }
}
