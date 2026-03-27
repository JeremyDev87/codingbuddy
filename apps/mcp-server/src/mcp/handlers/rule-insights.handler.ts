import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { AbstractHandler } from './abstract-handler';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { createJsonResponse } from '../response.utils';
import { RuleInsightsService } from '../../rules/rule-insights.service';
import { RuleTracker } from '../../rules/rule-tracker';
import { RulesService } from '../../rules/rules.service';
import { extractOptionalString } from '../../shared/validation.constants';

const DEFAULT_STATS_PATH = join(process.cwd(), 'docs', 'codingbuddy', 'rule-stats.json');

@Injectable()
export class RuleInsightsHandler extends AbstractHandler {
  constructor(
    private readonly insightsService: RuleInsightsService,
    private readonly rulesService: RulesService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['get_rule_insights'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const statsPath = extractOptionalString(args, 'statsPath') ?? DEFAULT_STATS_PATH;

    let stats: Record<string, { count: number; lastUsed: number }> = {};
    try {
      const tracker = await RuleTracker.fromFile(statsPath);
      stats = tracker.getStats();
    } catch {
      // No stats file yet — will return empty insights
    }

    const allRuleNames = await this.getAllRuleNames();
    const insights = this.insightsService.generateInsights(stats, allRuleNames);

    return createJsonResponse(insights);
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_rule_insights',
        description:
          'Analyze accumulated rule tracking data to provide effectiveness insights: violation frequency, unused/redundant rules, trend analysis, and improvement suggestions',
        inputSchema: {
          type: 'object' as const,
          properties: {
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

  private async getAllRuleNames(): Promise<string[]> {
    try {
      const results = await this.rulesService.searchRules('*');
      return results.map(r => r.file.replace(/^rules\//, '').replace(/\.md$/, ''));
    } catch {
      return [];
    }
  }
}
