import { RuleStatsWriter, StatsFile } from './rule-stats-writer';
import { RuleEventCollector } from './rule-event-collector';
import { RuleEvent } from './rule-event.types';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return memfs.fs.promises;
});

vi.mock('fs', async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  return memfs.fs;
});

describe('RuleStatsWriter', () => {
  let writer: RuleStatsWriter;
  let collector: RuleEventCollector;
  const STATS_PATH = '/docs/codingbuddy/rule-stats.json';

  beforeEach(() => {
    vol.reset();
    collector = new RuleEventCollector();
    writer = new RuleStatsWriter(collector, STATS_PATH);
  });

  const recordEvents = (events: Partial<RuleEvent>[]): void => {
    for (const e of events) {
      collector.record({
        type: 'mode_activated',
        timestamp: new Date().toISOString(),
        ...e,
      });
    }
  };

  const readStatsFile = (): StatsFile => {
    const raw = vol.readFileSync(STATS_PATH, 'utf-8') as string;
    return JSON.parse(raw);
  };

  describe('flush()', () => {
    it('should aggregate mode_activated events into rules stats', async () => {
      recordEvents([
        { type: 'mode_activated', rule: 'tdd-first' },
        { type: 'mode_activated', rule: 'tdd-first' },
        { type: 'mode_activated', rule: 'no-any' },
      ]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.rules['tdd-first'].applied).toBe(2);
      expect(stats.rules['tdd-first'].sessions).toBe(2);
      expect(stats.rules['no-any'].applied).toBe(1);
      expect(stats.rules['no-any'].sessions).toBe(1);
    });

    it('should aggregate checklist_generated events into domain stats', async () => {
      recordEvents([
        { type: 'checklist_generated', domain: 'security' },
        { type: 'checklist_generated', domain: 'security' },
        { type: 'checklist_generated', domain: 'accessibility' },
      ]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.domains['security'].checks).toBe(2);
      expect(stats.domains['accessibility'].checks).toBe(1);
    });

    it('should aggregate specialist_dispatched events into domain stats', async () => {
      recordEvents([{ type: 'specialist_dispatched', domain: 'performance' }]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.domains['performance'].checks).toBe(1);
    });

    it('should aggregate violation_caught events into domain stats', async () => {
      recordEvents([
        { type: 'violation_caught', domain: 'security' },
        { type: 'violation_caught', domain: 'security' },
      ]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.domains['security'].issues_prevented).toBe(2);
    });

    it('should skip events without rule or domain as appropriate', async () => {
      recordEvents([
        { type: 'mode_activated' }, // no rule — skip
        { type: 'checklist_generated' }, // no domain — skip
      ]);

      await writer.flush();

      const stats = readStatsFile();
      expect(Object.keys(stats.rules)).toHaveLength(0);
      expect(Object.keys(stats.domains)).toHaveLength(0);
    });

    it('should set lastUpdated timestamp', async () => {
      recordEvents([{ type: 'mode_activated', rule: 'core' }]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.lastUpdated).toBeDefined();
      expect(() => new Date(stats.lastUpdated)).not.toThrow();
    });

    it('should clear collector events after flush', async () => {
      recordEvents([{ type: 'mode_activated', rule: 'core' }]);

      await writer.flush();

      expect(collector.getEvents()).toEqual([]);
    });
  });

  describe('merge with existing stats', () => {
    it('should merge new stats into existing file', async () => {
      const existing: StatsFile = {
        lastUpdated: '2026-01-01T00:00:00Z',
        rules: {
          'tdd-first': { applied: 10, sessions: 5 },
        },
        domains: {
          security: { checks: 3, issues_prevented: 1 },
        },
      };
      vol.mkdirSync('/docs/codingbuddy', { recursive: true });
      vol.writeFileSync(STATS_PATH, JSON.stringify(existing));

      recordEvents([
        { type: 'mode_activated', rule: 'tdd-first' },
        { type: 'checklist_generated', domain: 'security' },
        { type: 'violation_caught', domain: 'security' },
      ]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.rules['tdd-first'].applied).toBe(11);
      expect(stats.rules['tdd-first'].sessions).toBe(6);
      expect(stats.domains['security'].checks).toBe(4);
      expect(stats.domains['security'].issues_prevented).toBe(2);
    });

    it('should add new rules alongside existing ones', async () => {
      const existing: StatsFile = {
        lastUpdated: '2026-01-01T00:00:00Z',
        rules: {
          'existing-rule': { applied: 5, sessions: 3 },
        },
        domains: {},
      };
      vol.mkdirSync('/docs/codingbuddy', { recursive: true });
      vol.writeFileSync(STATS_PATH, JSON.stringify(existing));

      recordEvents([{ type: 'mode_activated', rule: 'new-rule' }]);

      await writer.flush();

      const stats = readStatsFile();
      expect(stats.rules['existing-rule'].applied).toBe(5);
      expect(stats.rules['new-rule'].applied).toBe(1);
    });
  });

  describe('atomic write', () => {
    it('should write to temp file then rename', async () => {
      recordEvents([{ type: 'mode_activated', rule: 'core' }]);

      await writer.flush();

      // Final file should exist
      expect(vol.existsSync(STATS_PATH)).toBe(true);
      // Temp file should NOT remain
      expect(vol.existsSync(STATS_PATH + '.tmp')).toBe(false);
    });
  });

  describe('missing file handling', () => {
    it('should create stats file if it does not exist', async () => {
      expect(vol.existsSync(STATS_PATH)).toBe(false);

      recordEvents([{ type: 'mode_activated', rule: 'core' }]);
      await writer.flush();

      expect(vol.existsSync(STATS_PATH)).toBe(true);
      const stats = readStatsFile();
      expect(stats.rules['core'].applied).toBe(1);
    });

    it('should create parent directories if missing', async () => {
      expect(vol.existsSync('/docs/codingbuddy')).toBe(false);

      recordEvents([{ type: 'mode_activated', rule: 'core' }]);
      await writer.flush();

      expect(vol.existsSync('/docs/codingbuddy')).toBe(true);
    });

    it('should handle corrupted stats file gracefully', async () => {
      vol.mkdirSync('/docs/codingbuddy', { recursive: true });
      vol.writeFileSync(STATS_PATH, 'NOT VALID JSON{{{');

      recordEvents([{ type: 'mode_activated', rule: 'core' }]);
      await writer.flush();

      const stats = readStatsFile();
      expect(stats.rules['core'].applied).toBe(1);
    });
  });

  describe('no-op on empty flush', () => {
    it('should not write file when there are no events', async () => {
      await writer.flush();

      expect(vol.existsSync(STATS_PATH)).toBe(false);
    });
  });
});
