import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { RuleTracker, type RuleStats } from './rule-tracker';

describe('RuleTracker', () => {
  let tracker: RuleTracker;
  const mockStatsPath = '/tmp/.codingbuddy/rule_stats.json';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.writeFile).mockResolvedValue();
    tracker = new RuleTracker(mockStatsPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackRuleUsage', () => {
    it('should record a new rule with count 1', () => {
      tracker.trackRuleUsage(['core']);

      const stats = tracker.getStats();
      expect(stats['core']).toBeDefined();
      expect(stats['core'].count).toBe(1);
    });

    it('should increment count for an already-tracked rule', () => {
      tracker.trackRuleUsage(['core']);
      tracker.trackRuleUsage(['core']);

      const stats = tracker.getStats();
      expect(stats['core'].count).toBe(2);
    });

    it('should update lastUsed timestamp on each call', () => {
      const before = Date.now();
      tracker.trackRuleUsage(['core']);
      const after = Date.now();

      const stats = tracker.getStats();
      expect(stats['core'].lastUsed).toBeGreaterThanOrEqual(before);
      expect(stats['core'].lastUsed).toBeLessThanOrEqual(after);
    });

    it('should track multiple rules in a single call', () => {
      tracker.trackRuleUsage(['core', 'project', 'augmented-coding']);

      const stats = tracker.getStats();
      expect(Object.keys(stats)).toHaveLength(3);
      expect(stats['core'].count).toBe(1);
      expect(stats['project'].count).toBe(1);
      expect(stats['augmented-coding'].count).toBe(1);
    });

    it('should ignore empty rule names', () => {
      tracker.trackRuleUsage(['', 'core', '']);

      const stats = tracker.getStats();
      expect(Object.keys(stats)).toHaveLength(1);
      expect(stats['core']).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return empty object when no rules tracked', () => {
      const stats = tracker.getStats();
      expect(stats).toEqual({});
    });

    it('should return a copy that does not mutate internal state', () => {
      tracker.trackRuleUsage(['core']);
      const stats = tracker.getStats();
      stats['core'].count = 999;

      expect(tracker.getStats()['core'].count).toBe(1);
    });
  });

  describe('detectUnusedRules', () => {
    it('should detect rules not used within the threshold days', () => {
      // Simulate a rule used 10 days ago
      tracker.trackRuleUsage(['old-rule']);
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      // Directly set internal state for testing via load
      tracker['stats']['old-rule'].lastUsed = tenDaysAgo;

      const unused = tracker.detectUnusedRules(['old-rule', 'never-seen'], 7);

      expect(unused).toContain('old-rule');
      expect(unused).toContain('never-seen');
    });

    it('should not flag recently used rules', () => {
      tracker.trackRuleUsage(['active-rule']);

      const unused = tracker.detectUnusedRules(['active-rule'], 7);

      expect(unused).toHaveLength(0);
    });

    it('should flag rules that have never been tracked', () => {
      const unused = tracker.detectUnusedRules(['unknown-rule'], 7);

      expect(unused).toContain('unknown-rule');
    });
  });

  describe('generateReport', () => {
    it('should generate a report sorted by count descending', () => {
      tracker.trackRuleUsage(['core']);
      tracker.trackRuleUsage(['core']);
      tracker.trackRuleUsage(['core']);
      tracker.trackRuleUsage(['project']);

      const report = tracker.generateReport();

      expect(report.totalRulesTracked).toBe(2);
      expect(report.entries).toHaveLength(2);
      expect(report.entries[0].name).toBe('core');
      expect(report.entries[0].count).toBe(3);
      expect(report.entries[1].name).toBe('project');
      expect(report.entries[1].count).toBe(1);
    });

    it('should include generatedAt timestamp', () => {
      const before = Date.now();
      const report = tracker.generateReport();
      const after = Date.now();

      expect(report.generatedAt).toBeGreaterThanOrEqual(before);
      expect(report.generatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('persistence', () => {
    it('should save stats to the configured file path', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      tracker.trackRuleUsage(['core']);

      await tracker.save();

      expect(fs.writeFile).toHaveBeenCalledWith(mockStatsPath, expect.any(String), 'utf-8');
      const written = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
      expect(written['core'].count).toBe(1);
    });

    it('should create directory if it does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      tracker.trackRuleUsage(['core']);

      await tracker.save();

      expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should load stats from file on init', async () => {
      const savedStats: Record<string, RuleStats> = {
        core: { count: 5, lastUsed: Date.now() - 1000 },
      };
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedStats));

      const loaded = await RuleTracker.fromFile(mockStatsPath);
      const stats = loaded.getStats();

      expect(stats['core'].count).toBe(5);
    });

    it('should start fresh if stats file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const loaded = await RuleTracker.fromFile(mockStatsPath);

      expect(loaded.getStats()).toEqual({});
    });
  });
});
