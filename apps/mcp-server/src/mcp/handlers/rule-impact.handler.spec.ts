import { RuleImpactHandler } from './rule-impact.handler';
import { RuleInsightsService } from '../../rules/rule-insights.service';
import type { RuleInsight } from '../../rules/rule-insights.service';
import { RuleTracker } from '../../rules/rule-tracker';
import { RulesService } from '../../rules/rules.service';

vi.mock('../../rules/rule-tracker');

describe('RuleImpactHandler', () => {
  let handler: RuleImpactHandler;
  let mockInsightsService: RuleInsightsService;
  let mockRulesService: RulesService;

  const now = 1700000000000;

  const mockInsight: RuleInsight = {
    generatedAt: now,
    summary: {
      totalRulesTracked: 5,
      totalUsageCount: 42,
      activeRules: 3,
      staleRules: 1,
    },
    topRules: [
      { name: 'core', count: 15, lastUsed: now, classification: 'high' },
      { name: 'project', count: 12, lastUsed: now, classification: 'high' },
      { name: 'augmented-coding', count: 8, lastUsed: now - 86400000, classification: 'medium' },
      { name: 'security', count: 5, lastUsed: now - 172800000, classification: 'low' },
      { name: 'testing', count: 2, lastUsed: now - 2592000000, classification: 'low' },
    ],
    unusedRules: ['old-deprecated-rule', 'legacy-rule'],
    trends: {
      recentlyActive: ['core', 'project', 'augmented-coding'],
      declining: ['testing'],
      emerging: ['security'],
    },
    suggestions: ['Some suggestion about high-frequency rules'],
  };

  beforeEach(() => {
    vi.mocked(RuleTracker.fromFile).mockResolvedValue({
      getStats: vi.fn().mockReturnValue({
        core: { count: 15, lastUsed: now },
        project: { count: 12, lastUsed: now },
        'augmented-coding': { count: 8, lastUsed: now - 86400000 },
        security: { count: 5, lastUsed: now - 172800000 },
        testing: { count: 2, lastUsed: now - 2592000000 },
      }),
    } as unknown as RuleTracker);

    mockInsightsService = {
      generateInsights: vi.fn().mockReturnValue(mockInsight),
    } as unknown as RuleInsightsService;

    mockRulesService = {
      searchRules: vi.fn().mockResolvedValue([
        { file: 'rules/core.md', matches: [], score: 1 },
        { file: 'rules/project.md', matches: [], score: 1 },
      ]),
    } as unknown as RulesService;

    handler = new RuleImpactHandler(mockInsightsService, mockRulesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  describe('get_rule_impact_report', () => {
    it('should return a formatted markdown report', async () => {
      const result = await handler.handle('get_rule_impact_report', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();

      const text = result!.content[0].text;
      // Should contain markdown headings for each section
      expect(text).toContain('# Rule Impact Report');
      expect(text).toContain('## Summary');
      expect(text).toContain('## Top Rules');
      expect(text).toContain('## Domain Coverage');
      expect(text).toContain('## Unused Rules');
    });

    it('should include summary statistics in the report', async () => {
      const result = await handler.handle('get_rule_impact_report', {});
      const text = result!.content[0].text;

      expect(text).toContain('42'); // total usage count
      expect(text).toContain('5'); // total rules tracked
    });

    it('should include time saved estimation', async () => {
      const result = await handler.handle('get_rule_impact_report', {});
      const text = result!.content[0].text;

      // Each violation caught saves ~15 min, each checklist check saves ~5 min
      expect(text).toContain('Estimated Time Saved');
    });

    it('should include top rules as a table', async () => {
      const result = await handler.handle('get_rule_impact_report', {});
      const text = result!.content[0].text;

      // Markdown table header
      expect(text).toContain('| Rule | Applications | Classification |');
      expect(text).toContain('core');
      expect(text).toContain('project');
    });

    it('should list unused rules', async () => {
      const result = await handler.handle('get_rule_impact_report', {});
      const text = result!.content[0].text;

      expect(text).toContain('old-deprecated-rule');
      expect(text).toContain('legacy-rule');
    });

    it('should include trend information', async () => {
      const result = await handler.handle('get_rule_impact_report', {});
      const text = result!.content[0].text;

      expect(text).toContain('Trend');
    });

    it('should handle empty/missing stats gracefully', async () => {
      vi.mocked(RuleTracker.fromFile).mockRejectedValue(new Error('ENOENT'));

      const emptyInsight: RuleInsight = {
        generatedAt: now,
        summary: { totalRulesTracked: 0, totalUsageCount: 0, activeRules: 0, staleRules: 0 },
        topRules: [],
        unusedRules: [],
        trends: { recentlyActive: [], declining: [], emerging: [] },
        suggestions: [
          'No tracking data available yet — use parse_mode to start collecting rule usage data',
        ],
      };
      (mockInsightsService.generateInsights as ReturnType<typeof vi.fn>).mockReturnValue(
        emptyInsight,
      );

      const result = await handler.handle('get_rule_impact_report', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();
      const text = result!.content[0].text;
      expect(text).toContain('No data collected yet');
    });

    it('should accept optional period parameter', async () => {
      const result = await handler.handle('get_rule_impact_report', { period: 'week' });

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();
    });

    it('should pass statsPath to RuleTracker.fromFile', async () => {
      await handler.handle('get_rule_impact_report', { statsPath: '/custom/path.json' });

      expect(RuleTracker.fromFile).toHaveBeenCalledWith('/custom/path.json');
    });

    it('should use default statsPath when not provided', async () => {
      await handler.handle('get_rule_impact_report', {});

      expect(RuleTracker.fromFile).toHaveBeenCalledWith(expect.stringContaining('rule-stats.json'));
    });
  });

  describe('getToolDefinitions', () => {
    it('should return get_rule_impact_report definition', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('get_rule_impact_report');
      expect(definitions[0].inputSchema.properties).toHaveProperty('period');
      expect(definitions[0].inputSchema.properties).toHaveProperty('statsPath');
    });

    it('should have a descriptive description', () => {
      const definitions = handler.getToolDefinitions();
      expect(definitions[0].description).toContain('impact');
    });
  });
});
