import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { EventBridgeReader, EVENT_TYPES } from './event-bridge-reader';
import type { EventType } from './event-bridge-reader';

/**
 * Real file system tests — No Mocking Principle (augmented-coding.md)
 */
describe('event-bridge-reader', () => {
  let eventsDir: string;

  beforeEach(async () => {
    eventsDir = await fs.mkdtemp(join(tmpdir(), 'event-bridge-test-'));
  });

  afterEach(async () => {
    await fs.rm(eventsDir, { recursive: true, force: true });
  });

  describe('EVENT_TYPES', () => {
    it('should contain all five required event types', () => {
      const required: EventType[] = [
        'tool_call',
        'session_start',
        'session_end',
        'pattern_detected',
        'rule_suggested',
      ];
      for (const t of required) {
        expect(EVENT_TYPES).toContain(t);
      }
    });
  });

  describe('readNewEvents', () => {
    it('should return empty array when file does not exist', async () => {
      const reader = new EventBridgeReader('no-session', eventsDir);
      const events = await reader.readNewEvents();
      expect(events).toEqual([]);
    });

    it('should return empty array when file is empty', async () => {
      const sessionId = 'empty-session';
      await fs.writeFile(join(eventsDir, `${sessionId}.jsonl`), '', 'utf-8');

      const reader = new EventBridgeReader(sessionId, eventsDir);
      const events = await reader.readNewEvents();
      expect(events).toEqual([]);
    });

    it('should parse all JSON lines from the file', async () => {
      const sessionId = 'parse-test';
      const lines = [
        JSON.stringify({
          ts: '2026-01-01T00:00:00Z',
          type: 'session_start',
          session_id: sessionId,
          payload: {},
        }),
        JSON.stringify({
          ts: '2026-01-01T00:00:01Z',
          type: 'tool_call',
          session_id: sessionId,
          payload: { tool_name: 'Bash', success: true },
        }),
      ];
      await fs.writeFile(join(eventsDir, `${sessionId}.jsonl`), lines.join('\n') + '\n', 'utf-8');

      const reader = new EventBridgeReader(sessionId, eventsDir);
      const events = await reader.readNewEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('session_start');
      expect(events[1].type).toBe('tool_call');
    });

    it('should only return new events on subsequent reads', async () => {
      const sessionId = 'incremental';
      const filePath = join(eventsDir, `${sessionId}.jsonl`);
      const line1 =
        JSON.stringify({
          ts: '2026-01-01T00:00:00Z',
          type: 'session_start',
          session_id: sessionId,
          payload: {},
        }) + '\n';
      await fs.writeFile(filePath, line1, 'utf-8');

      const reader = new EventBridgeReader(sessionId, eventsDir);

      // First read: gets line1
      const first = await reader.readNewEvents();
      expect(first).toHaveLength(1);

      // Append line2
      const line2 =
        JSON.stringify({
          ts: '2026-01-01T00:00:01Z',
          type: 'tool_call',
          session_id: sessionId,
          payload: { tool_name: 'Read', success: true },
        }) + '\n';
      await fs.appendFile(filePath, line2, 'utf-8');

      // Second read: only gets line2
      const second = await reader.readNewEvents();
      expect(second).toHaveLength(1);
      expect(second[0].type).toBe('tool_call');
    });

    it('should correctly parse event schema fields', async () => {
      const sessionId = 'schema-test';
      const event = {
        ts: '2026-03-25T06:00:00+00:00',
        type: 'pattern_detected',
        session_id: sessionId,
        payload: { pattern: 'repeated_bash_fail' },
      };
      await fs.writeFile(
        join(eventsDir, `${sessionId}.jsonl`),
        JSON.stringify(event) + '\n',
        'utf-8',
      );

      const reader = new EventBridgeReader(sessionId, eventsDir);
      const events = await reader.readNewEvents();

      expect(events[0]).toEqual(
        expect.objectContaining({
          ts: '2026-03-25T06:00:00+00:00',
          type: 'pattern_detected',
          session_id: sessionId,
          payload: { pattern: 'repeated_bash_fail' },
        }),
      );
    });

    it('should skip malformed JSON lines gracefully', async () => {
      const sessionId = 'malformed';
      const content =
        [
          JSON.stringify({
            ts: '2026-01-01T00:00:00Z',
            type: 'session_start',
            session_id: sessionId,
            payload: {},
          }),
          'NOT VALID JSON{{{',
          JSON.stringify({
            ts: '2026-01-01T00:00:01Z',
            type: 'session_end',
            session_id: sessionId,
            payload: {},
          }),
        ].join('\n') + '\n';
      await fs.writeFile(join(eventsDir, `${sessionId}.jsonl`), content, 'utf-8');

      const reader = new EventBridgeReader(sessionId, eventsDir);
      const events = await reader.readNewEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('session_start');
      expect(events[1].type).toBe('session_end');
    });
  });

  describe('cleanup', () => {
    it('should remove the session event file', async () => {
      const sessionId = 'cleanup-test';
      const filePath = join(eventsDir, `${sessionId}.jsonl`);
      await fs.writeFile(filePath, '{}' + '\n', 'utf-8');

      const reader = new EventBridgeReader(sessionId, eventsDir);
      await reader.cleanup();

      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should not throw when file does not exist', async () => {
      const reader = new EventBridgeReader('nonexistent', eventsDir);
      await expect(reader.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('default eventsDir', () => {
    it('should default to ~/.codingbuddy/events/', () => {
      const reader = new EventBridgeReader('s1');
      const home = process.env.HOME || process.env.USERPROFILE || '';
      expect(reader.eventsDir).toBe(join(home, '.codingbuddy', 'events'));
    });
  });
});
