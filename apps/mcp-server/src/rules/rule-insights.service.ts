import { Injectable } from '@nestjs/common';
import type { RuleStats } from './rule-tracker';

export interface RuleInsight {
  generatedAt: number;
  summary: {
    totalRulesTracked: number;
    totalUsageCount: number;
    activeRules: number;
    staleRules: number;
  };
  topRules: Array<{
    name: string;
    count: number;
    lastUsed: number;
    classification: 'high' | 'medium' | 'low';
  }>;
  unusedRules: string[];
  trends: {
    recentlyActive: string[];
    declining: string[];
    emerging: string[];
  };
  suggestions: string[];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_RULES_LIMIT = 10;
const EMERGING_THRESHOLD = 3;
const SUGGESTION_UNUSED_PREVIEW = 5;

@Injectable()
export class RuleInsightsService {
  generateInsights(
    stats: Record<string, RuleStats>,
    allRuleNames: string[],
    now: number = Date.now(),
  ): RuleInsight {
    const entries = Object.entries(stats);
    const totalUsageCount = entries.reduce((sum, [, s]) => sum + s.count, 0);
    const avgCount = entries.length > 0 ? totalUsageCount / entries.length : 0;

    const topRules = this.buildTopRules(entries, avgCount);
    const unusedRules = this.findUnusedRules(stats, allRuleNames, now);
    const activeRules = entries.filter(([, s]) => now - s.lastUsed <= WEEK_MS).length;
    const staleRules = entries.filter(([, s]) => now - s.lastUsed > MONTH_MS).length;
    const trends = this.analyzeTrends(entries, avgCount, now);
    const suggestions = this.generateSuggestions(topRules, unusedRules, trends.declining, entries.length);

    return {
      generatedAt: now,
      summary: {
        totalRulesTracked: entries.length,
        totalUsageCount,
        activeRules,
        staleRules,
      },
      topRules: topRules.slice(0, TOP_RULES_LIMIT),
      unusedRules,
      trends,
      suggestions,
    };
  }

  private buildTopRules(
    entries: Array<[string, RuleStats]>,
    avgCount: number,
  ): RuleInsight['topRules'] {
    return entries
      .map(([name, s]) => ({
        name,
        count: s.count,
        lastUsed: s.lastUsed,
        classification: this.classifyFrequency(s.count, avgCount),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private classifyFrequency(count: number, avgCount: number): 'high' | 'medium' | 'low' {
    if (avgCount === 0) return 'low';
    if (count > avgCount * 2) return 'high';
    if (count > avgCount) return 'medium';
    return 'low';
  }

  private findUnusedRules(
    stats: Record<string, RuleStats>,
    allRuleNames: string[],
    now: number,
  ): string[] {
    return allRuleNames.filter(name => {
      const s = stats[name];
      return !s || now - s.lastUsed > MONTH_MS;
    });
  }

  private analyzeTrends(
    entries: Array<[string, RuleStats]>,
    avgCount: number,
    now: number,
  ): RuleInsight['trends'] {
    const recentlyActive = entries
      .filter(([, s]) => now - s.lastUsed <= WEEK_MS)
      .map(([name]) => name);

    const declining = entries
      .filter(([, s]) => now - s.lastUsed > MONTH_MS && s.count > avgCount)
      .map(([name]) => name);

    const emerging = entries
      .filter(([, s]) => now - s.lastUsed <= WEEK_MS && s.count <= EMERGING_THRESHOLD)
      .map(([name]) => name);

    return { recentlyActive, declining, emerging };
  }

  private generateSuggestions(
    topRules: RuleInsight['topRules'],
    unusedRules: string[],
    declining: string[],
    totalTracked: number,
  ): string[] {
    const suggestions: string[] = [];

    if (totalTracked === 0) {
      suggestions.push(
        'No tracking data available yet — use parse_mode to start collecting rule usage data',
      );
      return suggestions;
    }

    const highFreq = topRules.filter(r => r.classification === 'high');
    if (highFreq.length > 0) {
      suggestions.push(
        `High-frequency rules [${highFreq.map(r => r.name).join(', ')}] may need stricter enforcement or developer education`,
      );
    }

    if (unusedRules.length > 0) {
      const preview = unusedRules.slice(0, SUGGESTION_UNUSED_PREVIEW).join(', ');
      suggestions.push(
        `${unusedRules.length} unused/stale rules detected — consider removing or updating: ${preview}`,
      );
    }

    if (declining.length > 0) {
      suggestions.push(
        `Rules [${declining.join(', ')}] were once active but have declined — verify they are still relevant`,
      );
    }

    return suggestions;
  }
}
