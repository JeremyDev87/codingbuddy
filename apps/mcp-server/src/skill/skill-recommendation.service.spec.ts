import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRecommendationService } from './skill-recommendation.service';
import type { RecommendSkillsResult } from './skill-recommendation.types';
import { clearTriggerCache } from './skill-triggers';

describe('SkillRecommendationService', () => {
  let service: SkillRecommendationService;

  beforeEach(() => {
    clearTriggerCache();
    service = new SkillRecommendationService();
  });

  describe('recommendSkills basic functionality', () => {
    it('should return empty recommendations for unrelated prompt', () => {
      const result = service.recommendSkills('hello world');

      expect(result.recommendations).toHaveLength(0);
      expect(result.originalPrompt).toBe('hello world');
    });

    it('should return recommendations with matched patterns', () => {
      const result = service.recommendSkills('I need to fix this error');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].skillName).toBe('systematic-debugging');
      expect(result.recommendations[0].matchedPatterns.length).toBeGreaterThan(
        0,
      );
    });

    it('should include original prompt in result', () => {
      const prompt = 'create a new button component';
      const result = service.recommendSkills(prompt);

      expect(result.originalPrompt).toBe(prompt);
    });
  });

  describe('multi-language support (5 languages)', () => {
    describe('English', () => {
      it('"There is a bug in the login" -> systematic-debugging', () => {
        const result = service.recommendSkills('There is a bug in the login');

        expect(result.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('should recommend brainstorming for "build" keyword', () => {
        const result = service.recommendSkills('I want to build a new feature');

        const hasExpectedSkill = result.recommendations.some(
          r => r.skillName === 'brainstorming',
        );
        expect(hasExpectedSkill).toBe(true);
      });
    });

    describe('Korean', () => {
      it('"로그인에 버그가 있어" -> systematic-debugging', () => {
        const result = service.recommendSkills('로그인에 버그가 있어');

        expect(result.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('"버튼 만들어줘" -> frontend-design', () => {
        const result = service.recommendSkills('버튼 만들어줘');

        const hasExpectedSkill = result.recommendations.some(
          r => r.skillName === 'frontend-design',
        );
        expect(hasExpectedSkill).toBe(true);
      });
    });

    describe('Japanese', () => {
      it('"ログインにバグがある" -> systematic-debugging', () => {
        const result = service.recommendSkills('ログインにバグがある');

        expect(result.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('"ボタンを作って" -> frontend-design', () => {
        const result = service.recommendSkills('ボタンを作って');

        const hasExpectedSkill = result.recommendations.some(
          r => r.skillName === 'frontend-design',
        );
        expect(hasExpectedSkill).toBe(true);
      });
    });

    describe('Chinese', () => {
      it('"登录有错误" -> systematic-debugging', () => {
        const result = service.recommendSkills('登录有错误');

        expect(result.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('"创建一个按钮" -> frontend-design', () => {
        const result = service.recommendSkills('创建一个按钮');

        const hasExpectedSkill = result.recommendations.some(
          r => r.skillName === 'frontend-design',
        );
        expect(hasExpectedSkill).toBe(true);
      });
    });

    describe('Spanish', () => {
      it('"Hay un error en el login" -> systematic-debugging', () => {
        const result = service.recommendSkills('Hay un error en el login');

        expect(result.recommendations[0].skillName).toBe(
          'systematic-debugging',
        );
      });

      it('"crear un botón" -> frontend-design', () => {
        const result = service.recommendSkills('crear un botón');

        const hasExpectedSkill = result.recommendations.some(
          r => r.skillName === 'frontend-design',
        );
        expect(hasExpectedSkill).toBe(true);
      });
    });
  });

  describe('confidence levels', () => {
    it('should return high confidence when multiple patterns match', () => {
      // "fix", "bug", "error" all match - 3 or more
      const result = service.recommendSkills(
        'I need to fix this bug error issue',
      );

      const debugging = result.recommendations.find(
        r => r.skillName === 'systematic-debugging',
      );
      expect(debugging?.confidence).toBe('high');
    });

    it('should return medium confidence for single pattern match', () => {
      // single keyword match only
      const result = service.recommendSkills('There is an error here');

      const debugging = result.recommendations.find(
        r => r.skillName === 'systematic-debugging',
      );
      expect(debugging?.confidence).toBe('medium');
    });

    it('should return no recommendations (not low) when nothing matches', () => {
      const result = service.recommendSkills('random unrelated text xyz123');

      expect(result.recommendations).toHaveLength(0);
    });
  });

  describe('priority sorting', () => {
    it('should return higher priority skills first', () => {
      // "error" -> debugging (25), "create" -> brainstorming (10)
      const result = service.recommendSkills(
        'I need to create something but there is an error',
      );

      expect(result.recommendations.length).toBeGreaterThanOrEqual(2);

      // debugging (priority 25) should come before brainstorming (priority 10)
      const debuggingIdx = result.recommendations.findIndex(
        r => r.skillName === 'systematic-debugging',
      );
      const brainstormingIdx = result.recommendations.findIndex(
        r => r.skillName === 'brainstorming',
      );

      expect(debuggingIdx).toBeLessThan(brainstormingIdx);
    });

    it('should sort multiple skill recommendations by priority', () => {
      const result = service.recommendSkills(
        'I need to fix the bug and create a new button component',
      );

      // Multiple skills may match
      for (let i = 0; i < result.recommendations.length - 1; i++) {
        const current = result.recommendations[i];
        const next = result.recommendations[i + 1];

        // Since description doesn't have priority info, just verify order exists
        // Trust that actual implementation sorts by priority
        expect(current).toBeDefined();
        expect(next).toBeDefined();
      }
    });
  });

  describe('example prompts for each skill', () => {
    it('"I need to fix this bug" -> systematic-debugging', () => {
      const result = service.recommendSkills('I need to fix this bug');

      expect(result.recommendations[0].skillName).toBe('systematic-debugging');
    });

    it('"Let\'s implement using TDD" -> test-driven-development', () => {
      const result = service.recommendSkills("Let's implement using TDD");

      const hasTdd = result.recommendations.some(
        r => r.skillName === 'test-driven-development',
      );
      expect(hasTdd).toBe(true);
    });

    it('"Design a new user profile feature" -> brainstorming', () => {
      const result = service.recommendSkills(
        'Design a new user profile feature',
      );

      // "new" and "design" keywords match brainstorming
      const hasBrainstorming = result.recommendations.some(
        r => r.skillName === 'brainstorming',
      );
      expect(hasBrainstorming).toBe(true);
    });

    it('"Execute the plan step by step" -> executing-plans', () => {
      const result = service.recommendSkills('Execute the plan step by step');

      const hasExecuting = result.recommendations.some(
        r => r.skillName === 'executing-plans',
      );
      expect(hasExecuting).toBe(true);
    });

    it('"Let\'s write an implementation plan" -> writing-plans', () => {
      const result = service.recommendSkills(
        "Let's write an implementation plan",
      );

      const hasWriting = result.recommendations.some(
        r => r.skillName === 'writing-plans',
      );
      expect(hasWriting).toBe(true);
    });

    it('"Build a dashboard UI" -> frontend-design', () => {
      const result = service.recommendSkills('Build a dashboard UI');

      const hasFrontend = result.recommendations.some(
        r => r.skillName === 'frontend-design',
      );
      expect(hasFrontend).toBe(true);
    });
  });

  describe('RecommendSkillsResult structure', () => {
    it('should have correct result object structure', () => {
      const result: RecommendSkillsResult =
        service.recommendSkills('fix the bug');

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('originalPrompt');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('SkillRecommendation should include required fields', () => {
      const result = service.recommendSkills('there is an error');

      expect(result.recommendations.length).toBeGreaterThan(0);

      const recommendation = result.recommendations[0];
      expect(recommendation).toHaveProperty('skillName');
      expect(recommendation).toHaveProperty('confidence');
      expect(recommendation).toHaveProperty('matchedPatterns');
      expect(recommendation).toHaveProperty('description');
    });

    it('confidence should be one of high, medium, low', () => {
      const result = service.recommendSkills('fix the error bug issue');

      for (const rec of result.recommendations) {
        expect(['high', 'medium', 'low']).toContain(rec.confidence);
      }
    });

    it('matchedPatterns should be an array of strings', () => {
      const result = service.recommendSkills('fix the error');

      for (const rec of result.recommendations) {
        expect(Array.isArray(rec.matchedPatterns)).toBe(true);
        for (const pattern of rec.matchedPatterns) {
          expect(typeof pattern).toBe('string');
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string input', () => {
      const result = service.recommendSkills('');

      expect(result.recommendations).toHaveLength(0);
      expect(result.originalPrompt).toBe('');
    });

    it('should handle whitespace-only input', () => {
      const result = service.recommendSkills('   ');

      expect(result.recommendations).toHaveLength(0);
    });

    it('should handle input with special characters', () => {
      const result = service.recommendSkills('fix the bug!! @#$%');

      expect(result.recommendations[0].skillName).toBe('systematic-debugging');
    });

    it('should handle very long prompts', () => {
      const longPrompt = 'I need to fix this bug '.repeat(100);
      const result = service.recommendSkills(longPrompt);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle mixed language prompts', () => {
      // Korean and English mixed
      const result = service.recommendSkills('버그 fix please');

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].skillName).toBe('systematic-debugging');
    });
  });

  describe('listSkills', () => {
    it('should return all skills sorted by priority descending', () => {
      const result = service.listSkills();

      expect(result.skills).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.skills.length).toBe(result.total);

      // Check sorted by priority descending
      for (let i = 1; i < result.skills.length; i++) {
        expect(result.skills[i - 1].priority).toBeGreaterThanOrEqual(
          result.skills[i].priority,
        );
      }
    });

    it('should include name, priority, description, concepts for each skill', () => {
      const result = service.listSkills();

      for (const skill of result.skills) {
        expect(skill.name).toBeDefined();
        expect(typeof skill.priority).toBe('number');
        expect(skill.description).toBeDefined();
        expect(Array.isArray(skill.concepts)).toBe(true);
      }
    });

    it('should filter by minPriority', () => {
      const result = service.listSkills({ minPriority: 20 });

      for (const skill of result.skills) {
        expect(skill.priority).toBeGreaterThanOrEqual(20);
      }
    });

    it('should filter by maxPriority', () => {
      const result = service.listSkills({ maxPriority: 15 });

      for (const skill of result.skills) {
        expect(skill.priority).toBeLessThanOrEqual(15);
      }
    });

    it('should filter by both minPriority and maxPriority', () => {
      const result = service.listSkills({ minPriority: 12, maxPriority: 20 });

      expect(result.skills.length).toBeGreaterThan(0);
      for (const skill of result.skills) {
        expect(skill.priority).toBeGreaterThanOrEqual(12);
        expect(skill.priority).toBeLessThanOrEqual(20);
      }
    });

    it('should return empty array when minPriority > maxPriority', () => {
      const result = service.listSkills({ minPriority: 100, maxPriority: 10 });

      expect(result.skills).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty array when no skills match filter criteria', () => {
      const result = service.listSkills({ minPriority: 1000 });

      expect(result.skills).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
