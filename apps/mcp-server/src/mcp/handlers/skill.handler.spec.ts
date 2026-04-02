import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillHandler } from './skill.handler';
import { SkillRecommendationService } from '../../skill/skill-recommendation.service';
import { RulesService } from '../../rules/rules.service';

describe('SkillHandler', () => {
  let handler: SkillHandler;
  let mockSkillRecommendationService: SkillRecommendationService;
  let mockRulesService: RulesService;

  beforeEach(() => {
    mockSkillRecommendationService = {
      recommendSkills: vi.fn().mockReturnValue({
        originalPrompt: 'test prompt',
        recommendations: [{ skillName: 'test-skill', matchedPatterns: [] }],
      }),
      listSkills: vi.fn().mockResolvedValue({
        skills: [{ name: 'test-skill', priority: 1 }],
        total: 1,
      }),
    } as unknown as SkillRecommendationService;

    mockRulesService = {
      getSkill: vi.fn().mockResolvedValue({
        name: 'test-skill',
        description: 'Test skill description',
        content: 'Test skill content',
        path: 'skills/test-skill/SKILL.md',
      }),
    } as unknown as RulesService;

    handler = new SkillHandler(mockSkillRecommendationService, mockRulesService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should handle recommend_skills with valid prompt', async () => {
      const result = await handler.handle('recommend_skills', {
        prompt: 'test prompt',
      });

      expect(result?.isError).toBeFalsy();
      expect(mockSkillRecommendationService.recommendSkills).toHaveBeenCalledWith('test prompt');
    });

    it('should include nextAction hint when recommendations exist', async () => {
      const result = await handler.handle('recommend_skills', {
        prompt: 'test prompt',
      });

      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.nextAction).toBeDefined();
      expect(parsed.nextAction).toContain('get_skill');
    });

    it('should not include nextAction when no recommendations', async () => {
      mockSkillRecommendationService.recommendSkills = vi.fn().mockReturnValue({
        originalPrompt: 'no match',
        recommendations: [],
      });

      const result = await handler.handle('recommend_skills', {
        prompt: 'no match',
      });

      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.nextAction).toBeUndefined();
    });

    it('should return error for recommend_skills without prompt', async () => {
      const result = await handler.handle('recommend_skills', {});

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Missing required parameter: prompt'),
      });
    });

    it('should return error for recommend_skills with non-string prompt', async () => {
      const result = await handler.handle('recommend_skills', { prompt: 123 });

      expect(result?.isError).toBe(true);
    });

    it('should handle list_skills without options', async () => {
      const result = await handler.handle('list_skills', {});

      expect(result?.isError).toBeFalsy();
      expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({});
    });

    it('should handle list_skills with priority filters', async () => {
      const result = await handler.handle('list_skills', {
        minPriority: 1,
        maxPriority: 3,
      });

      expect(result?.isError).toBeFalsy();
      expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({
        minPriority: 1,
        maxPriority: 3,
      });
    });

    it('should ignore non-number priority filters', async () => {
      const result = await handler.handle('list_skills', {
        minPriority: 'invalid',
        maxPriority: null,
      });

      expect(result?.isError).toBeFalsy();
      expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith({});
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for recommend_skills, list_skills, and get_skill', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions.map(d => d.name)).toEqual([
        'recommend_skills',
        'list_skills',
        'get_skill',
      ]);
    });

    it('should have correct schema for recommend_skills', () => {
      const definitions = handler.getToolDefinitions();
      const recommendSkills = definitions.find(d => d.name === 'recommend_skills');

      expect(recommendSkills?.inputSchema.required).toContain('prompt');
      expect(recommendSkills?.inputSchema.properties.prompt).toBeDefined();
    });

    it('should include get_skill chaining hint in recommend_skills description', () => {
      const definitions = handler.getToolDefinitions();
      const recommendSkills = definitions.find(d => d.name === 'recommend_skills');

      expect(recommendSkills?.description).toContain('get_skill');
    });

    it('should have correct schema for get_skill', () => {
      const definitions = handler.getToolDefinitions();
      const getSkill = definitions.find(d => d.name === 'get_skill');

      expect(getSkill?.inputSchema.required).toContain('skillName');
      expect(getSkill?.inputSchema.properties.skillName).toBeDefined();
    });
  });

  describe('get_skill handler', () => {
    it('should handle get_skill with valid skillName', async () => {
      const result = await handler.handle('get_skill', {
        skillName: 'brainstorming',
      });

      expect(result?.isError).toBeFalsy();
      expect(mockRulesService.getSkill).toHaveBeenCalledWith('brainstorming');
    });

    it('should return error for get_skill without skillName', async () => {
      const result = await handler.handle('get_skill', {});

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Missing required parameter: skillName'),
      });
    });

    it('should return error when skill not found', async () => {
      mockRulesService.getSkill = vi
        .fn()
        .mockRejectedValue(new Error('Skill not found: unknown-skill'));

      const result = await handler.handle('get_skill', {
        skillName: 'unknown-skill',
      });

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Skill not found'),
      });
    });
  });

  describe('error handling', () => {
    it('should return error response when service throws', async () => {
      mockSkillRecommendationService.recommendSkills = vi.fn().mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await handler.handle('recommend_skills', {
        prompt: 'test',
      });

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Service error'),
      });
    });
  });
});
