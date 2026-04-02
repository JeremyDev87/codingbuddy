import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { AbstractHandler } from './abstract-handler';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import type { RuleInsight } from '../../rules/rule-insights.service';
import { RuleInsightsService } from '../../rules/rule-insights.service';
import { RuleTracker } from '../../rules/rule-tracker';
import { RulesService } from '../../rules/rules.service';
import { extractOptionalString } from '../../shared/validation.constants';

const DEFAULT_STATS_PATH = join(process.cwd(), 'docs', 'codingbuddy', 'rule-stats.json');

/** Minutes saved per violation caught */
const MINUTES_PER_VIOLATION = 15;
/** Minutes saved per checklist check */
const MINUTES_PER_CHECK = 5;

type Period = 'week' | 'month' | 'all';
const VALID_PERIODS: ReadonlySet<string> = new Set(['week', 'month', 'all']);

@Injectable()
export class RuleImpactHandler extends AbstractHandler {
  constructor(
    private readonly insightsService: RuleInsightsService,
    private readonly rulesService: RulesService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_rule_impact_report'];
  }

  protected async handleTool(
    _toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const statsPath = extractOptionalString(args, 'statsPath') ?? DEFAULT_STATS_PATH;
    const period = this.extractPeriod(args);

    let stats: Record<string, { count: number; lastUsed: number }> = {};
    try {
      const tracker = await RuleTracker.fromFile(statsPath);
      stats = tracker.getStats();
    } catch {
      // No stats file yet
    }

    const allRuleNames = await this.getAllRuleNames();
    const insights = this.insightsService.generateInsights(stats, allRuleNames);

    if (insights.summary.totalRulesTracked === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No data collected yet. Run some sessions to populate stats.',
          },
        ],
      };
    }

    const report = this.formatReport(insights, period);
    return {
      content: [{ type: 'text', text: report }],
    };
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_rule_impact_report',
        description:
          'Generate a formatted markdown impact report showing rule effectiveness: top rules by usage, unused rules, domain coverage, estimated time saved, and trend analysis',
        inputSchema: {
          type: 'object' as const,
          properties: {
            period: {
              type: 'string',
              description: 'Report period: "week", "month", or "all" (default: "all")',
              enum: ['week', 'month', 'all'],
            },
            statsPath: {
              type: 'string',
              description:
                'Path to rule-stats.json file. Defaults to docs/codingbuddy/rule-stats.json',
            },
          },
          required: [],
        },
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private extractPeriod(args: Record<string, unknown> | undefined): Period {
    const raw = extractOptionalString(args, 'period');
    if (raw && VALID_PERIODS.has(raw)) return raw as Period;
    return 'all';
  }

  private async getAllRuleNames(): Promise<string[]> {
    try {
      const results = await this.rulesService.searchRules('*');
      return results.map(r => r.file.replace(/^rules\//, '').replace(/\.md$/, ''));
    } catch {
      return [];
    }
  }

  private formatReport(insights: RuleInsight, period: Period): string {
    const lines: string[] = [];

    lines.push('# Rule Impact Report');
    lines.push('');
    lines.push(
      `> Period: **${period}** | Generated: ${new Date(insights.generatedAt).toISOString()}`,
    );
    lines.push('');

    // Summary
    this.appendSummary(lines, insights);

    // Top Rules
    this.appendTopRules(lines, insights);

    // Domain Coverage
    this.appendDomainCoverage(lines, insights);

    // Unused Rules
    this.appendUnusedRules(lines, insights);

    // Trends
    this.appendTrends(lines, insights);

    // Suggestions
    this.appendSuggestions(lines, insights);

    return lines.join('\n');
  }

  private appendSummary(lines: string[], insights: RuleInsight): void {
    const { summary } = insights;
    const timeSavedMin =
      summary.totalUsageCount * MINUTES_PER_VIOLATION +
      summary.totalRulesTracked * MINUTES_PER_CHECK;
    const timeSavedHours = (timeSavedMin / 60).toFixed(1);

    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Total Rule Applications | ${summary.totalUsageCount} |`);
    lines.push(`| Rules Tracked | ${summary.totalRulesTracked} |`);
    lines.push(`| Active Rules (last 7d) | ${summary.activeRules} |`);
    lines.push(`| Stale Rules (>30d) | ${summary.staleRules} |`);
    lines.push(
      `| **Estimated Time Saved** | **~${timeSavedHours} hours** (~${timeSavedMin} min) |`,
    );
    lines.push('');
  }

  private appendTopRules(lines: string[], insights: RuleInsight): void {
    lines.push('## Top Rules');
    lines.push('');

    if (insights.topRules.length === 0) {
      lines.push('_No rule usage data yet._');
      lines.push('');
      return;
    }

    lines.push('| Rule | Applications | Classification |');
    lines.push('| --- | ---: | --- |');
    for (const rule of insights.topRules) {
      const badge =
        rule.classification === 'high'
          ? '**HIGH**'
          : rule.classification === 'medium'
            ? 'medium'
            : 'low';
      lines.push(`| ${rule.name} | ${rule.count} | ${badge} |`);
    }
    lines.push('');
  }

  private appendDomainCoverage(lines: string[], insights: RuleInsight): void {
    lines.push('## Domain Coverage');
    lines.push('');

    const domainMap = new Map<string, { checks: number; rules: string[] }>();
    for (const rule of insights.topRules) {
      const domain = this.inferDomain(rule.name);
      const entry = domainMap.get(domain) ?? { checks: 0, rules: [] };
      entry.checks += rule.count;
      entry.rules.push(rule.name);
      domainMap.set(domain, entry);
    }

    if (domainMap.size === 0) {
      lines.push('_No domain coverage data yet._');
      lines.push('');
      return;
    }

    lines.push('| Domain | Checks | Rules |');
    lines.push('| --- | ---: | --- |');
    const sorted = [...domainMap.entries()].sort((a, b) => b[1].checks - a[1].checks);
    for (const [domain, data] of sorted) {
      lines.push(`| ${domain} | ${data.checks} | ${data.rules.join(', ')} |`);
    }
    lines.push('');
  }

  private appendUnusedRules(lines: string[], insights: RuleInsight): void {
    lines.push('## Unused Rules');
    lines.push('');

    if (insights.unusedRules.length === 0) {
      lines.push('All rules are actively used.');
      lines.push('');
      return;
    }

    lines.push(
      `${insights.unusedRules.length} rule(s) with 0 applications — consider removing or promoting:`,
    );
    lines.push('');
    for (const rule of insights.unusedRules) {
      lines.push(`- \`${rule}\``);
    }
    lines.push('');
  }

  private appendTrends(lines: string[], insights: RuleInsight): void {
    lines.push('## Trend');
    lines.push('');

    const { trends } = insights;

    if (trends.recentlyActive.length > 0) {
      lines.push(`**Recently Active:** ${trends.recentlyActive.join(', ')}`);
      lines.push('');
    }
    if (trends.emerging.length > 0) {
      lines.push(`**Emerging:** ${trends.emerging.join(', ')}`);
      lines.push('');
    }
    if (trends.declining.length > 0) {
      lines.push(`**Declining:** ${trends.declining.join(', ')}`);
      lines.push('');
    }

    if (
      trends.recentlyActive.length === 0 &&
      trends.emerging.length === 0 &&
      trends.declining.length === 0
    ) {
      lines.push('_No trend data available._');
      lines.push('');
    }
  }

  private appendSuggestions(lines: string[], insights: RuleInsight): void {
    if (insights.suggestions.length === 0) return;

    lines.push('## Suggestions');
    lines.push('');
    for (const s of insights.suggestions) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  /**
   * Infers a high-level domain from a rule name.
   * Falls back to "general" when no specific domain is detected.
   */
  private inferDomain(ruleName: string): string {
    const lower = ruleName.toLowerCase();
    if (lower.includes('security') || lower.includes('auth')) return 'security';
    if (lower.includes('test') || lower.includes('tdd')) return 'testing';
    if (lower.includes('perf') || lower.includes('bundle')) return 'performance';
    if (lower.includes('access') || lower.includes('a11y') || lower.includes('aria'))
      return 'accessibility';
    if (lower.includes('seo') || lower.includes('meta')) return 'seo';
    return 'general';
  }
}
