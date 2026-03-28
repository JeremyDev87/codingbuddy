import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import { ImpactEventService } from './impact-event.service';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

describe('ImpactEventService', () => {
  let service: ImpactEventService;

  beforeEach(() => {
    service = new ImpactEventService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logEvent', () => {
    it('should create an event with timestamp and sessionId', () => {
      service.logEvent('test-session', 'mode_activated', { mode: 'PLAN' });

      const events = service.getSessionEvents('test-session');
      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe('test-session');
      expect(events[0].eventType).toBe('mode_activated');
      expect(events[0].data.mode).toBe('PLAN');
      expect(events[0].timestamp).toBeDefined();
    });

    it('should append event to JSONL file', () => {
      service.logEvent('test-session', 'mode_activated', { mode: 'PLAN' });

      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);
      const writtenData = vi.mocked(fs.appendFileSync).mock.calls[0][1] as string;
      expect(writtenData).toContain('"eventType":"mode_activated"');
      expect(writtenData).toMatch(/\n$/);
    });

    it('should accumulate multiple events for same session', () => {
      service.logEvent('s1', 'mode_activated', { mode: 'PLAN' });
      service.logEvent('s1', 'agent_dispatched', { agent: 'security-specialist' });
      service.logEvent('s1', 'checklist_generated', { domain: 'security', count: 5 });

      const events = service.getSessionEvents('s1');
      expect(events).toHaveLength(3);
    });

    it('should isolate events by session', () => {
      service.logEvent('s1', 'mode_activated', { mode: 'PLAN' });
      service.logEvent('s2', 'mode_activated', { mode: 'ACT' });

      expect(service.getSessionEvents('s1')).toHaveLength(1);
      expect(service.getSessionEvents('s2')).toHaveLength(1);
    });

    it('should not throw on file write error', () => {
      vi.mocked(fs.appendFileSync).mockImplementation(() => {
        throw new Error('disk full');
      });

      expect(() => {
        service.logEvent('s1', 'mode_activated', { mode: 'PLAN' });
      }).not.toThrow();

      // Event should still be in memory
      expect(service.getSessionEvents('s1')).toHaveLength(1);
    });
  });

  describe('getSessionEvents', () => {
    it('should return empty array for unknown session', () => {
      expect(service.getSessionEvents('unknown')).toEqual([]);
    });
  });
});
