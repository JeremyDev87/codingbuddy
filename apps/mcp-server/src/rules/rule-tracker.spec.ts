import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RuleTracker } from './rule-tracker';
import type { RuleStats } from './rule-tracker';

describe('RuleTracker', () => {
  let tmpDir: string;
  let statsPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rule-tracker-test-'));
    statsPath = path.join(tmpDir, 'rule_stats.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('recordUsage', () => {
    it('should record first usage of a rule with correct stats', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core', 'security'], 'PLAN');

      const coreStats = tracker.getStats('core');
      expect(coreStats).toBeDefined();
      expect(coreStats!.name).toBe('core');
      expect(coreStats!.callCount).toBe(1);
      expect(coreStats!.modes).toEqual({ PLAN: 1 });
      expect(coreStats!.firstUsedAt).toBeTruthy();
      expect(coreStats!.lastUsedAt).toBeTruthy();
    });

    it('should increment call count on repeated usage', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core'], 'PLAN');
      tracker.recordUsage(['core'], 'ACT');
      tracker.recordUsage(['core'], 'PLAN');

      const stats = tracker.getStats('core');
      expect(stats!.callCount).toBe(3);
      expect(stats!.modes).toEqual({ PLAN: 2, ACT: 1 });
    });

    it('should preserve firstUsedAt across multiple calls', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core'], 'PLAN');
      const firstUsedAt = tracker.getStats('core')!.firstUsedAt;

      tracker.recordUsage(['core'], 'ACT');
      expect(tracker.getStats('core')!.firstUsedAt).toBe(firstUsedAt);
    });
  });

  describe('save and load', () => {
    it('should persist stats to disk and reload them', () => {
      const tracker1 = new RuleTracker(statsPath);
      tracker1.recordUsage(['core', 'security'], 'PLAN');
      tracker1.save();

      const tracker2 = new RuleTracker(statsPath);
      expect(tracker2.getStats('core')!.callCount).toBe(1);
      expect(tracker2.getStats('security')!.callCount).toBe(1);
    });

    it('should handle missing stats file gracefully', () => {
      const tracker = new RuleTracker(path.join(tmpDir, 'nonexistent', 'stats.json'));
      expect(tracker.getAllStats()).toEqual([]);
    });

    it('should recover from corrupt stats file', () => {
      fs.writeFileSync(statsPath, '{invalid json!!!');
      const tracker = new RuleTracker(statsPath);
      expect(tracker.getAllStats()).toEqual([]);
    });
  });

  describe('getAllStats', () => {
    it('should return all recorded rule stats', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core', 'security', 'performance'], 'PLAN');

      const allStats = tracker.getAllStats();
      expect(allStats).toHaveLength(3);
      const names = allStats.map((s: RuleStats) => s.name).sort();
      expect(names).toEqual(['core', 'performance', 'security']);
    });
  });

  describe('getUnusedRules', () => {
    it('should detect rules not used within N days', () => {
      const tracker = new RuleTracker(statsPath);
      // 'core' was used, 'security' and 'performance' were never used
      tracker.recordUsage(['core'], 'PLAN');

      const allKnown = ['core', 'security', 'performance'];
      const unused = tracker.getUnusedRules(30, allKnown);
      expect(unused.sort()).toEqual(['performance', 'security']);
    });

    it('should detect rules with stale lastUsedAt beyond N days', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core'], 'PLAN');

      // Manually set lastUsedAt to 60 days ago
      const stats = tracker.getStats('core')!;
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      stats.lastUsedAt = oldDate.toISOString();

      const unused = tracker.getUnusedRules(30, ['core']);
      expect(unused).toEqual(['core']);
    });
  });

  describe('generateReport', () => {
    it('should generate a complete effectiveness report', () => {
      const tracker = new RuleTracker(statsPath);
      tracker.recordUsage(['core'], 'PLAN');
      tracker.recordUsage(['core'], 'ACT');
      tracker.recordUsage(['security'], 'EVAL');

      const allKnown = ['core', 'security', 'performance', 'accessibility'];
      const report = tracker.generateReport(allKnown);

      expect(report.totalRules).toBe(4);
      expect(report.activeRules).toHaveLength(2);
      expect(report.unusedRules.sort()).toEqual(['accessibility', 'performance']);
      expect(report.topRules[0].name).toBe('core');
      expect(report.topRules[0].callCount).toBe(2);
      expect(report.generatedAt).toBeTruthy();
    });

    it('should limit topRules to 10 entries', () => {
      const tracker = new RuleTracker(statsPath);
      // Create 15 rules with different call counts
      for (let i = 0; i < 15; i++) {
        const name = `rule-${i}`;
        for (let j = 0; j <= i; j++) {
          tracker.recordUsage([name], 'PLAN');
        }
      }

      const report = tracker.generateReport();
      expect(report.topRules).toHaveLength(10);
      // Top rule should have highest call count
      expect(report.topRules[0].callCount).toBeGreaterThanOrEqual(
        report.topRules[9].callCount,
      );
    });
  });
});
