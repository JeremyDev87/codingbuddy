import { RuleInsightsHandler } from './rule-insights.handler';
import { RuleInsightsService } from '../../rules/rule-insights.service';
import type { RuleInsight } from '../../rules/rule-insights.service';
import { RuleTracker } from '../../rules/rule-tracker';
import { RulesService } from '../../rules/rules.service';

vi.mock('../../rules/rule-tracker');

describe('RuleInsightsHandler', () => {
  let handler: RuleInsightsHandler;
  let mockInsightsService: RuleInsightsService;
  let mockRulesService: RulesService;

  const mockInsight: RuleInsight = {
    generatedAt: Date.now(),
    summary: {
      totalRulesTracked: 3,
      totalUsageCount: 18,
      activeRules: 2,
      staleRules: 1,
    },
    topRules: [{ name: 'core', count: 10, lastUsed: Date.now(), classification: 'high' }],
    unusedRules: ['old-rule'],
    trends: {
      recentlyActive: ['core'],
      declining: ['old-rule'],
      emerging: ['new-rule'],
    },
    suggestions: ['Some suggestion'],
  };

  beforeEach(() => {
    vi.mocked(RuleTracker.fromFile).mockResolvedValue({
      getStats: vi.fn().mockReturnValue({ core: { count: 10, lastUsed: Date.now() } }),
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

    handler = new RuleInsightsHandler(mockInsightsService, mockRulesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  describe('get_rule_insights', () => {
    it('should return insights successfully', async () => {
      const result = await handler.handle('get_rule_insights', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.summary.totalRulesTracked).toBe(3);
    });

    it('should pass statsPath to RuleTracker.fromFile', async () => {
      await handler.handle('get_rule_insights', { statsPath: '/custom/path.json' });

      expect(RuleTracker.fromFile).toHaveBeenCalledWith('/custom/path.json');
    });

    it('should use default statsPath when not provided', async () => {
      await handler.handle('get_rule_insights', {});

      expect(RuleTracker.fromFile).toHaveBeenCalledWith(expect.stringContaining('rule-stats.json'));
    });

    it('should extract rule names from search results', async () => {
      await handler.handle('get_rule_insights', {});

      expect(mockRulesService.searchRules).toHaveBeenCalledWith('*');
      expect(mockInsightsService.generateInsights).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining(['core', 'project']),
      );
    });

    it('should handle RuleTracker file read error gracefully', async () => {
      vi.mocked(RuleTracker.fromFile).mockRejectedValue(new Error('ENOENT'));

      const result = await handler.handle('get_rule_insights', {});

      expect(result?.isError).toBeFalsy();
    });
  });

  describe('getToolDefinitions', () => {
    it('should return get_rule_insights definition', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('get_rule_insights');
      expect(definitions[0].inputSchema.properties).toHaveProperty('statsPath');
    });
  });
});
