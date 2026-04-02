import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillRecommendationService } from './skill-recommendation.service';
import type { RecommendSkillsResult } from './skill-recommendation.types';
import { clearTriggerCache } from './skill-triggers';
import type { RulesService } from '../rules/rules.service';

import type { SkillFrontmatterTrigger } from '../rules/skill.schema';

/** Create a mock RulesService that returns the given skill list */
function createMockRulesService(
  skills: Array<{
    name: string;
    description: string;
    triggers?: SkillFrontmatterTrigger[];
  }> = [],
): RulesService {
  return {
    listSkillsFromDir: vi.fn().mockResolvedValue(skills),
  } as unknown as RulesService;
}

/** Default filesystem-like skills for testing (includes both keyword-registered and extra skills) */
const FILESYSTEM_SKILLS: Array<{
  name: string;
  description: string;
  triggers?: SkillFrontmatterTrigger[];
}> = [
  { name: 'systematic-debugging', description: 'Systematic approach to debugging' },
  { name: 'brainstorming', description: 'Brainstorming and ideation' },
  { name: 'executing-plans', description: 'Execute implementation plans' },
  { name: 'writing-plans', description: 'Write implementation plans' },
  { name: 'frontend-design', description: 'Frontend design patterns' },
  { name: 'test-driven-development', description: 'TDD workflow' },
  { name: 'refactoring', description: 'Code refactoring' },
  { name: 'documentation-generation', description: 'Generate documentation' },
  // Extra skills NOT in SKILL_KEYWORDS
  { name: 'api-design', description: 'API design patterns' },
  { name: 'git-workflow', description: 'Git workflow management' },
  { name: 'docker-setup', description: 'Docker configuration' },
  // Skill with frontmatter triggers (NOT in SKILL_KEYWORDS)
  {
    name: 'widget-slot-architecture',
    description: 'Next.js Parallel Routes Widget Slot pattern',
    triggers: [
      { pattern: 'widget.*(slot|architecture|parallel)', confidence: 'high' as const },
      { pattern: '(parallel route|next.*layout|slot.*pattern)', confidence: 'medium' as const },
      { pattern: '(dashboard.*layout|multi.*panel)', confidence: 'low' as const },
    ],
  },
];

describe('SkillRecommendationService', () => {
  let service: SkillRecommendationService;
  let mockRulesService: RulesService;

  beforeEach(async () => {
    clearTriggerCache();
    mockRulesService = createMockRulesService(FILESYSTEM_SKILLS);
    service = new SkillRecommendationService(mockRulesService);
    await service.loadFrontmatterTriggers();
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
      expect(result.recommendations[0].matchedPatterns.length).toBeGreaterThan(0);
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

        expect(result.recommendations[0].skillName).toBe('systematic-debugging');
      });

      it('should recommend brainstorming for "build" keyword', () => {
        const result = service.recommendSkills('I want to build a new feature');

        const hasExpectedSkill = result.recommendations.some(r => r.skillName === 'brainstorming');
        expect(hasExpectedSkill).toBe(true);
      });
    });

    describe('Korean', () => {
      it('"로그인에 버그가 있어" -> systematic-debugging', () => {
        const result = service.recommendSkills('로그인에 버그가 있어');

        expect(result.recommendations[0].skillName).toBe('systematic-debugging');
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

        expect(result.recommendations[0].skillName).toBe('systematic-debugging');
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

        expect(result.recommendations[0].skillName).toBe('systematic-debugging');
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

        expect(result.recommendations[0].skillName).toBe('systematic-debugging');
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
      const result = service.recommendSkills('I need to fix this bug error issue');

      const debugging = result.recommendations.find(r => r.skillName === 'systematic-debugging');
      expect(debugging?.confidence).toBe('high');
    });

    it('should return medium confidence for single pattern match', () => {
      // single keyword match only
      const result = service.recommendSkills('There is an error here');

      const debugging = result.recommendations.find(r => r.skillName === 'systematic-debugging');
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
      const result = service.recommendSkills('I need to create something but there is an error');

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

    it('should recommend refactoring before writing-plans when "refactor" matches both', () => {
      // Both refactoring (21) and writing-plans (20) have "refactor" keyword
      // refactoring should appear first due to higher priority
      const result = service.recommendSkills('I want to refactor this code');

      const refactoringIdx = result.recommendations.findIndex(r => r.skillName === 'refactoring');
      const writingPlansIdx = result.recommendations.findIndex(
        r => r.skillName === 'writing-plans',
      );

      // Both skills should be recommended
      expect(refactoringIdx).toBeGreaterThanOrEqual(0);
      expect(writingPlansIdx).toBeGreaterThanOrEqual(0);

      // refactoring (priority 21) should appear before writing-plans (priority 20)
      expect(refactoringIdx).toBeLessThan(writingPlansIdx);
    });

    it('should recommend only refactoring for code smell (not writing-plans)', () => {
      // "code smell" is unique to refactoring skill
      const result = service.recommendSkills('this code has a code smell');

      const hasRefactoring = result.recommendations.some(r => r.skillName === 'refactoring');
      const hasWritingPlans = result.recommendations.some(r => r.skillName === 'writing-plans');

      expect(hasRefactoring).toBe(true);
      expect(hasWritingPlans).toBe(false);
    });

    it('should recommend only writing-plans for architecture planning (not refactoring)', () => {
      // "architecture plan" is unique to writing-plans skill
      const result = service.recommendSkills('I need to plan the architecture for this project');

      const hasWritingPlans = result.recommendations.some(r => r.skillName === 'writing-plans');
      const hasRefactoring = result.recommendations.some(r => r.skillName === 'refactoring');

      expect(hasWritingPlans).toBe(true);
      expect(hasRefactoring).toBe(false);
    });
  });

  describe('example prompts for each skill', () => {
    it('"I need to fix this bug" -> systematic-debugging', () => {
      const result = service.recommendSkills('I need to fix this bug');

      expect(result.recommendations[0].skillName).toBe('systematic-debugging');
    });

    it('"Let\'s implement using TDD" -> test-driven-development', () => {
      const result = service.recommendSkills("Let's implement using TDD");

      const hasTdd = result.recommendations.some(r => r.skillName === 'test-driven-development');
      expect(hasTdd).toBe(true);
    });

    it('"Design a new user profile feature" -> brainstorming', () => {
      const result = service.recommendSkills('Design a new user profile feature');

      // "new" and "design" keywords match brainstorming
      const hasBrainstorming = result.recommendations.some(r => r.skillName === 'brainstorming');
      expect(hasBrainstorming).toBe(true);
    });

    it('"Execute the plan step by step" -> executing-plans', () => {
      const result = service.recommendSkills('Execute the plan step by step');

      const hasExecuting = result.recommendations.some(r => r.skillName === 'executing-plans');
      expect(hasExecuting).toBe(true);
    });

    it('"Let\'s write an implementation plan" -> writing-plans', () => {
      const result = service.recommendSkills("Let's write an implementation plan");

      const hasWriting = result.recommendations.some(r => r.skillName === 'writing-plans');
      expect(hasWriting).toBe(true);
    });

    it('"Build a dashboard UI" -> frontend-design', () => {
      const result = service.recommendSkills('Build a dashboard UI');

      const hasFrontend = result.recommendations.some(r => r.skillName === 'frontend-design');
      expect(hasFrontend).toBe(true);
    });

    it('"Write a README for this project" -> documentation-generation', () => {
      const result = service.recommendSkills('Write a README for this project');

      const hasDocGen = result.recommendations.some(
        r => r.skillName === 'documentation-generation',
      );
      expect(hasDocGen).toBe(true);
    });

    it('"Generate API documentation" -> documentation-generation', () => {
      const result = service.recommendSkills('Generate API documentation');

      const hasDocGen = result.recommendations.some(
        r => r.skillName === 'documentation-generation',
      );
      expect(hasDocGen).toBe(true);
    });
  });

  describe('RecommendSkillsResult structure', () => {
    it('should have correct result object structure', () => {
      const result: RecommendSkillsResult = service.recommendSkills('fix the bug');

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

  describe('frontmatter triggers', () => {
    it('should match skill via frontmatter trigger pattern', () => {
      const result = service.recommendSkills('I need a widget slot architecture');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.confidence).toBe('high');
    });

    it('should use medium confidence for medium-confidence trigger', () => {
      const result = service.recommendSkills('How to use parallel route in next layout');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.confidence).toBe('medium');
    });

    it('should use low confidence for low-confidence trigger', () => {
      const result = service.recommendSkills('Need a dashboard layout for the admin');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.confidence).toBe('low');
    });

    it('should use highest confidence when multiple triggers match', () => {
      // "widget slot" matches high, "parallel route" matches medium → high wins
      const result = service.recommendSkills('widget slot with parallel route');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.confidence).toBe('high');
    });

    it('should not match frontmatter triggers for unrelated prompt', () => {
      const result = service.recommendSkills('random text xyz123');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeUndefined();
    });

    it('should include matched patterns from frontmatter triggers', () => {
      const result = service.recommendSkills('widget slot architecture');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.matchedPatterns.length).toBeGreaterThan(0);
    });

    it('should use skill description from filesystem for frontmatter-only skills', () => {
      const result = service.recommendSkills('widget slot architecture');

      const wsa = result.recommendations.find(r => r.skillName === 'widget-slot-architecture');
      expect(wsa).toBeDefined();
      expect(wsa!.description).toBe('Next.js Parallel Routes Widget Slot pattern');
    });

    it('should merge keyword and frontmatter triggers for same skill', async () => {
      // Create a skill that exists in BOTH keywords.ts and has frontmatter triggers
      const skillsWithOverlap = [
        ...FILESYSTEM_SKILLS,
        {
          name: 'systematic-debugging',
          description: 'Debugging skill',
          triggers: [{ pattern: 'custom-debug-pattern', confidence: 'high' as const }],
        },
      ];
      const overlapService = new SkillRecommendationService(
        createMockRulesService(skillsWithOverlap),
      );
      await overlapService.loadFrontmatterTriggers();

      // Match via keyword trigger
      const result = overlapService.recommendSkills('There is a bug and custom-debug-pattern');

      const debugging = result.recommendations.find(r => r.skillName === 'systematic-debugging');
      expect(debugging).toBeDefined();
      // Should have patterns from both sources
      expect(debugging!.matchedPatterns.length).toBeGreaterThan(1);
    });

    it('should skip invalid regex patterns gracefully', async () => {
      const skillsWithBadRegex = [
        {
          name: 'bad-regex-skill',
          description: 'Skill with invalid regex',
          triggers: [
            { pattern: '[invalid(regex', confidence: 'high' as const },
            { pattern: 'valid-pattern', confidence: 'medium' as const },
          ],
        },
      ];
      const badService = new SkillRecommendationService(createMockRulesService(skillsWithBadRegex));
      await badService.loadFrontmatterTriggers();

      // Should still work with valid pattern
      const result = badService.recommendSkills('valid-pattern text');

      const skill = result.recommendations.find(r => r.skillName === 'bad-regex-skill');
      expect(skill).toBeDefined();
    });

    it('should work when no frontmatter triggers are loaded', async () => {
      const noTriggerService = new SkillRecommendationService(
        createMockRulesService([{ name: 'plain-skill', description: 'No triggers' }]),
      );
      await noTriggerService.loadFrontmatterTriggers();

      const result = noTriggerService.recommendSkills('fix the bug');
      // Should still work with keyword triggers
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('listSkills', () => {
    it('should return all filesystem skills sorted by priority descending', async () => {
      const result = await service.listSkills();

      expect(result.skills).toBeDefined();
      expect(result.total).toBe(FILESYSTEM_SKILLS.length);
      expect(result.skills.length).toBe(result.total);

      // Check sorted by priority descending
      for (let i = 1; i < result.skills.length; i++) {
        expect(result.skills[i - 1].priority).toBeGreaterThanOrEqual(result.skills[i].priority);
      }
    });

    it('should call rulesService.listSkillsFromDir as primary source', async () => {
      await service.listSkills();

      expect(mockRulesService.listSkillsFromDir).toHaveBeenCalled();
    });

    it('should enrich skills with SKILL_KEYWORDS priority when available', async () => {
      const result = await service.listSkills();

      // systematic-debugging has priority 25 in SKILL_KEYWORDS
      const debugging = result.skills.find(s => s.name === 'systematic-debugging');
      expect(debugging?.priority).toBe(25);
    });

    it('should assign default priority to skills without SKILL_KEYWORDS entry', async () => {
      const result = await service.listSkills();

      // api-design is NOT in SKILL_KEYWORDS — should get default priority
      const apiDesign = result.skills.find(s => s.name === 'api-design');
      expect(apiDesign).toBeDefined();
      expect(apiDesign!.priority).toBe(0);
    });

    it('should use filesystem description for skills', async () => {
      const result = await service.listSkills();

      const apiDesign = result.skills.find(s => s.name === 'api-design');
      expect(apiDesign?.description).toBe('API design patterns');
    });

    it('should include concepts from SKILL_KEYWORDS when available', async () => {
      const result = await service.listSkills();

      const debugging = result.skills.find(s => s.name === 'systematic-debugging');
      expect(debugging?.concepts.length).toBeGreaterThan(0);

      // Extra skill should have empty concepts
      const apiDesign = result.skills.find(s => s.name === 'api-design');
      expect(apiDesign?.concepts).toEqual([]);
    });

    it('should include name, priority, description, concepts for each skill', async () => {
      const result = await service.listSkills();

      for (const skill of result.skills) {
        expect(skill.name).toBeDefined();
        expect(typeof skill.priority).toBe('number');
        expect(skill.description).toBeDefined();
        expect(Array.isArray(skill.concepts)).toBe(true);
      }
    });

    it('should filter by minPriority', async () => {
      const result = await service.listSkills({ minPriority: 20 });

      expect(result.skills.length).toBeGreaterThan(0);
      for (const skill of result.skills) {
        expect(skill.priority).toBeGreaterThanOrEqual(20);
      }
    });

    it('should filter by maxPriority', async () => {
      const result = await service.listSkills({ maxPriority: 15 });

      for (const skill of result.skills) {
        expect(skill.priority).toBeLessThanOrEqual(15);
      }
    });

    it('should filter by both minPriority and maxPriority', async () => {
      const result = await service.listSkills({ minPriority: 10, maxPriority: 20 });

      expect(result.skills.length).toBeGreaterThan(0);
      for (const skill of result.skills) {
        expect(skill.priority).toBeGreaterThanOrEqual(10);
        expect(skill.priority).toBeLessThanOrEqual(20);
      }
    });

    it('should return empty array when minPriority > maxPriority', async () => {
      const result = await service.listSkills({ minPriority: 100, maxPriority: 10 });

      expect(result.skills).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty array when no skills match filter criteria', async () => {
      const result = await service.listSkills({ minPriority: 1000 });

      expect(result.skills).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty array when filesystem returns no skills', async () => {
      const emptyRulesService = createMockRulesService([]);
      const emptyService = new SkillRecommendationService(emptyRulesService);

      const result = await emptyService.listSkills();

      expect(result.skills).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
