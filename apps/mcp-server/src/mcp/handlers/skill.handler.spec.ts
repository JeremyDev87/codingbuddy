import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillHandler } from './skill.handler';
import { SkillRecommendationService } from '../../skill/skill-recommendation.service';

describe('SkillHandler', () => {
  let handler: SkillHandler;
  let mockSkillRecommendationService: SkillRecommendationService;

  beforeEach(() => {
    mockSkillRecommendationService = {
      recommendSkills: vi.fn().mockReturnValue({
        originalPrompt: 'test prompt',
        recommendations: [{ skillName: 'test-skill', matchedPatterns: [] }],
      }),
      listSkills: vi.fn().mockReturnValue({
        skills: [{ name: 'test-skill', priority: 1 }],
        total: 1,
      }),
    } as unknown as SkillRecommendationService;

    handler = new SkillHandler(mockSkillRecommendationService);
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
      expect(
        mockSkillRecommendationService.recommendSkills,
      ).toHaveBeenCalledWith('test prompt');
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
      expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith(
        {},
      );
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
      expect(mockSkillRecommendationService.listSkills).toHaveBeenCalledWith(
        {},
      );
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for recommend_skills and list_skills', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.name)).toEqual([
        'recommend_skills',
        'list_skills',
      ]);
    });

    it('should have correct schema for recommend_skills', () => {
      const definitions = handler.getToolDefinitions();
      const recommendSkills = definitions.find(
        d => d.name === 'recommend_skills',
      );

      expect(recommendSkills?.inputSchema.required).toContain('prompt');
      expect(recommendSkills?.inputSchema.properties.prompt).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return error response when service throws', async () => {
      mockSkillRecommendationService.recommendSkills = vi
        .fn()
        .mockImplementation(() => {
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
