/**
 * File-based event bridge reader for Plugin(Python) → MCP(TypeScript) communication.
 *
 * Reads JSON-lines events from ~/.codingbuddy/events/<session_id>.jsonl,
 * tracking file offset to only return new events on subsequent reads.
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/** All supported event types emitted by the Python plugin. */
export const EVENT_TYPES = [
  'tool_call',
  'session_start',
  'session_end',
  'pattern_detected',
  'rule_suggested',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Schema for a single bridge event (matches Python EventBridge output). */
export interface BridgeEvent {
  ts: string;
  type: EventType;
  session_id: string;
  payload: Record<string, unknown>;
}

/**
 * Reads new events from a session's JSONL file, tracking byte offset
 * so each call only returns events appended since the last read.
 */
export class EventBridgeReader {
  readonly eventsDir: string;
  private readonly sessionId: string;
  private offset = 0;

  constructor(sessionId: string, eventsDir?: string) {
    this.sessionId = sessionId;
    this.eventsDir = eventsDir ?? join(homedir(), '.codingbuddy', 'events');
  }

  private get filePath(): string {
    return join(this.eventsDir, `${this.sessionId}.jsonl`);
  }

  /**
   * Read new events appended since the last call.
   * Returns an empty array if the file does not exist or has no new content.
   * Malformed JSON lines are silently skipped.
   */
  async readNewEvents(): Promise<BridgeEvent[]> {
    let content: string;
    try {
      const buffer = await fs.readFile(this.filePath, 'utf-8');
      content = buffer.slice(this.offset);
      this.offset = buffer.length;
    } catch {
      return [];
    }

    if (!content) {
      return [];
    }

    const events: BridgeEvent[] = [];
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    for (const line of lines) {
      try {
        events.push(JSON.parse(line) as BridgeEvent);
      } catch {
        // Skip malformed JSON lines
      }
    }

    return events;
  }

  /** Remove the session event file if it exists. */
  async cleanup(): Promise<void> {
    try {
      await fs.unlink(this.filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
