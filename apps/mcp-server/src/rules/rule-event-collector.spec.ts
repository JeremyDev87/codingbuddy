import { RuleEventCollector } from './rule-event-collector';
import { RuleEvent } from './rule-event.types';

describe('RuleEventCollector', () => {
  let collector: RuleEventCollector;

  beforeEach(() => {
    collector = new RuleEventCollector();
  });

  const createEvent = (overrides: Partial<RuleEvent> = {}): RuleEvent => ({
    type: 'mode_activated',
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  describe('record()', () => {
    it('should add an event to the buffer', () => {
      const event = createEvent();
      collector.record(event);

      const events = collector.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('mode_activated');
    });

    it('should auto-generate timestamp if not provided', () => {
      const { timestamp: _, ...eventWithoutTimestamp } = createEvent();
      collector.record(eventWithoutTimestamp as RuleEvent);

      const events = collector.getEvents();
      expect(events[0].timestamp).toBeDefined();
      expect(() => new Date(events[0].timestamp)).not.toThrow();
    });

    it('should preserve provided timestamp', () => {
      const timestamp = '2026-01-01T00:00:00.000Z';
      collector.record(createEvent({ timestamp }));

      expect(collector.getEvents()[0].timestamp).toBe(timestamp);
    });

    it('should store multiple events in order', () => {
      collector.record(createEvent({ type: 'mode_activated' }));
      collector.record(createEvent({ type: 'checklist_generated' }));
      collector.record(createEvent({ type: 'violation_caught' }));

      const events = collector.getEvents();
      expect(events).toHaveLength(3);
      expect(events.map(e => e.type)).toEqual([
        'mode_activated',
        'checklist_generated',
        'violation_caught',
      ]);
    });

    it('should store optional fields (domain, rule, details)', () => {
      collector.record(
        createEvent({
          domain: 'security',
          rule: 'no-eval',
          details: { file: 'app.ts' },
        }),
      );

      const event = collector.getEvents()[0];
      expect(event.domain).toBe('security');
      expect(event.rule).toBe('no-eval');
      expect(event.details).toEqual({ file: 'app.ts' });
    });

    it('should throw on invalid event type', () => {
      expect(() => collector.record({ type: 'invalid_type' } as unknown as RuleEvent)).toThrow(
        'Invalid rule event type: invalid_type',
      );
    });
  });

  describe('getEvents()', () => {
    it('should return empty array when no events recorded', () => {
      expect(collector.getEvents()).toEqual([]);
    });

    it('should return a copy of events (not the internal buffer)', () => {
      collector.record(createEvent());

      const events1 = collector.getEvents();
      const events2 = collector.getEvents();
      expect(events1).toEqual(events2);
      expect(events1).not.toBe(events2);
    });
  });

  describe('flush()', () => {
    it('should return all events and clear the buffer', () => {
      collector.record(createEvent({ type: 'mode_activated' }));
      collector.record(createEvent({ type: 'checklist_generated' }));

      const flushed = collector.flush();
      expect(flushed).toHaveLength(2);
      expect(collector.getEvents()).toEqual([]);
    });

    it('should return empty array when buffer is empty', () => {
      expect(collector.flush()).toEqual([]);
    });

    it('should allow recording new events after flush', () => {
      collector.record(createEvent({ type: 'mode_activated' }));
      collector.flush();

      collector.record(createEvent({ type: 'violation_caught' }));
      expect(collector.getEvents()).toHaveLength(1);
      expect(collector.getEvents()[0].type).toBe('violation_caught');
    });
  });
});
