import { RuleInsightsService } from './rule-insights.service';
import type { RuleStats } from './rule-tracker';

describe('RuleInsightsService', () => {
  let service: RuleInsightsService;
  const NOW = 1711612800000; // Fixed timestamp for deterministic tests
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;
  const MONTH_MS = 30 * DAY_MS;

  beforeEach(() => {
    service = new RuleInsightsService();
  });

  describe('generateInsights', () => {
    it('should return empty insights when no stats exist', () => {
      const result = service.generateInsights({}, [], NOW);

      expect(result.summary.totalRulesTracked).toBe(0);
      expect(result.summary.totalUsageCount).toBe(0);
      expect(result.topRules).toEqual([]);
      expect(result.unusedRules).toEqual([]);
      expect(result.suggestions).toContain(
        'No tracking data available yet — use parse_mode to start collecting rule usage data',
      );
    });

    it('should calculate summary correctly', () => {
      const stats: Record<string, RuleStats> = {
        core: { count: 10, lastUsed: NOW - DAY_MS },
        'augmented-coding': { count: 5, lastUsed: NOW - 2 * DAY_MS },
        project: { count: 3, lastUsed: NOW - 3 * DAY_MS },
      };

      const result = service.generateInsights(stats, ['core', 'augmented-coding', 'project'], NOW);

      expect(result.summary.totalRulesTracked).toBe(3);
      expect(result.summary.totalUsageCount).toBe(18);
      expect(result.generatedAt).toBe(NOW);
    });

    it('should classify rules by frequency', () => {
      const stats: Record<string, RuleStats> = {
        core: { count: 20, lastUsed: NOW - DAY_MS },
        'augmented-coding': { count: 5, lastUsed: NOW - 2 * DAY_MS },
        project: { count: 1, lastUsed: NOW - 3 * DAY_MS },
      };

      const result = service.generateInsights(stats, [], NOW);

      const coreRule = result.topRules.find(r => r.name === 'core');
      const projectRule = result.topRules.find(r => r.name === 'project');

      expect(coreRule?.classification).toBe('high');
      expect(projectRule?.classification).toBe('low');
    });

    it('should sort topRules by count descending', () => {
      const stats: Record<string, RuleStats> = {
        low: { count: 1, lastUsed: NOW },
        high: { count: 100, lastUsed: NOW },
        mid: { count: 10, lastUsed: NOW },
      };

      const result = service.generateInsights(stats, [], NOW);

      expect(result.topRules.map(r => r.name)).toEqual(['high', 'mid', 'low']);
    });

    it('should limit topRules to 10 entries', () => {
      const stats: Record<string, RuleStats> = {};
      for (let i = 0; i < 15; i++) {
        stats[`rule-${i}`] = { count: 15 - i, lastUsed: NOW };
      }

      const result = service.generateInsights(stats, [], NOW);

      expect(result.topRules).toHaveLength(10);
    });

    it('should detect unused rules from allRuleNames', () => {
      const stats: Record<string, RuleStats> = {
        core: { count: 10, lastUsed: NOW - DAY_MS },
      };

      const result = service.generateInsights(
        stats,
        ['core', 'unused-rule-a', 'unused-rule-b'],
        NOW,
      );

      expect(result.unusedRules).toContain('unused-rule-a');
      expect(result.unusedRules).toContain('unused-rule-b');
      expect(result.unusedRules).not.toContain('core');
    });

    it('should detect stale rules as unused', () => {
      const stats: Record<string, RuleStats> = {
        core: { count: 10, lastUsed: NOW - DAY_MS },
        stale: { count: 5, lastUsed: NOW - MONTH_MS - DAY_MS },
      };

      const result = service.generateInsights(stats, ['core', 'stale'], NOW);

      expect(result.unusedRules).toContain('stale');
      expect(result.unusedRules).not.toContain('core');
    });

    it('should count active and stale rules in summary', () => {
      const stats: Record<string, RuleStats> = {
        active1: { count: 5, lastUsed: NOW - DAY_MS },
        active2: { count: 3, lastUsed: NOW - 2 * DAY_MS },
        recent: { count: 2, lastUsed: NOW - 2 * WEEK_MS },
        stale1: { count: 10, lastUsed: NOW - MONTH_MS - DAY_MS },
        stale2: { count: 8, lastUsed: NOW - 2 * MONTH_MS },
      };

      const result = service.generateInsights(stats, [], NOW);

      expect(result.summary.activeRules).toBe(2);
      expect(result.summary.staleRules).toBe(2);
    });

    describe('trends', () => {
      it('should identify recently active rules', () => {
        const stats: Record<string, RuleStats> = {
          active: { count: 5, lastUsed: NOW - DAY_MS },
          old: { count: 10, lastUsed: NOW - 2 * MONTH_MS },
        };

        const result = service.generateInsights(stats, [], NOW);

        expect(result.trends.recentlyActive).toContain('active');
        expect(result.trends.recentlyActive).not.toContain('old');
      });

      it('should identify declining rules (high count but stale)', () => {
        // avg = (50 + 2) / 2 = 26; 'once-popular' count 50 > avg so it's declining
        const stats: Record<string, RuleStats> = {
          'once-popular': { count: 50, lastUsed: NOW - MONTH_MS - DAY_MS },
          'still-low': { count: 2, lastUsed: NOW - MONTH_MS - DAY_MS },
        };

        const result = service.generateInsights(stats, [], NOW);

        expect(result.trends.declining).toContain('once-popular');
        expect(result.trends.declining).not.toContain('still-low');
      });

      it('should identify emerging rules (recent but low count)', () => {
        const stats: Record<string, RuleStats> = {
          'new-rule': { count: 2, lastUsed: NOW - DAY_MS },
          established: { count: 50, lastUsed: NOW - DAY_MS },
        };

        const result = service.generateInsights(stats, [], NOW);

        expect(result.trends.emerging).toContain('new-rule');
        expect(result.trends.emerging).not.toContain('established');
      });
    });

    describe('suggestions', () => {
      it('should suggest enforcement for high-frequency rules', () => {
        const stats: Record<string, RuleStats> = {
          core: { count: 100, lastUsed: NOW },
          other1: { count: 1, lastUsed: NOW },
          other2: { count: 1, lastUsed: NOW },
          other3: { count: 1, lastUsed: NOW },
        };

        const result = service.generateInsights(stats, [], NOW);

        expect(
          result.suggestions.some(s => s.includes('core') && s.includes('High-frequency')),
        ).toBe(true);
      });

      it('should suggest removing unused rules', () => {
        const result = service.generateInsights(
          { core: { count: 5, lastUsed: NOW } },
          ['core', 'unused-a', 'unused-b'],
          NOW,
        );

        expect(result.suggestions.some(s => s.includes('unused/stale rules detected'))).toBe(true);
      });

      it('should suggest reviewing declining rules', () => {
        const stats: Record<string, RuleStats> = {
          declining: { count: 50, lastUsed: NOW - MONTH_MS - DAY_MS },
          active: { count: 1, lastUsed: NOW },
        };

        const result = service.generateInsights(stats, [], NOW);

        expect(
          result.suggestions.some(s => s.includes('declining') && s.includes('declined')),
        ).toBe(true);
      });

      it('should suggest starting tracking when no data exists', () => {
        const result = service.generateInsights({}, [], NOW);

        expect(result.suggestions.some(s => s.includes('No tracking data'))).toBe(true);
      });
    });
  });
});
