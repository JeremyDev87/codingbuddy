import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  buildTriggersFromKeywords,
  buildPatternForLanguage,
  getSkillTriggers,
  getSortedTriggers,
  clearTriggerCache,
} from './skill-triggers';
import { SKILL_KEYWORDS } from './i18n/keywords';
import type { SkillKeywordConfig } from './i18n/keywords.types';

describe('skill-triggers', () => {
  beforeEach(() => {
    clearTriggerCache();
  });

  describe('buildPatternForLanguage', () => {
    it('should create pattern with word boundaries for English', () => {
      const pattern = buildPatternForLanguage(['error', 'bug'], 'en');

      expect(pattern.source).toContain('\\b');
      expect(pattern.test('found an error')).toBe(true);
      expect(pattern.test('found a bug')).toBe(true);
      expect(pattern.test('terrorize')).toBe(false); // should not match "error" within word
    });

    it('should create pattern without word boundaries for Korean', () => {
      const pattern = buildPatternForLanguage(['에러', '버그'], 'ko');

      expect(pattern.source).not.toContain('\\b');
      expect(pattern.test('에러가 발생')).toBe(true);
      expect(pattern.test('버그수정')).toBe(true);
    });

    it('should create pattern without word boundaries for Japanese', () => {
      const pattern = buildPatternForLanguage(['エラー'], 'ja');

      expect(pattern.source).not.toContain('\\b');
      expect(pattern.test('エラーです')).toBe(true);
    });

    it('should create pattern without word boundaries for Chinese', () => {
      const pattern = buildPatternForLanguage(['错误'], 'zh');

      expect(pattern.source).not.toContain('\\b');
      expect(pattern.test('出现错误')).toBe(true);
    });

    it('should create pattern with word boundaries for Spanish', () => {
      const pattern = buildPatternForLanguage(['error'], 'es');

      expect(pattern.source).toContain('\\b');
      expect(pattern.test('hay un error')).toBe(true);
    });

    it('should handle flexible whitespace in multi-word keywords', () => {
      const pattern = buildPatternForLanguage(['not working'], 'en');

      expect(pattern.test('not working')).toBe(true);
      expect(pattern.test('not  working')).toBe(true);
    });

    it('should escape special regex characters', () => {
      // Use Korean (no word boundaries) to test regex escaping without boundary interference
      const pattern = buildPatternForLanguage(['test?', 'hello*'], 'ko');

      expect(pattern.test('test?')).toBe(true);
      expect(pattern.test('tests')).toBe(false); // ? should not be regex quantifier
      expect(pattern.test('hello*')).toBe(true);
      expect(pattern.test('hellooooo')).toBe(false); // * should not be regex quantifier
    });
  });

  describe('buildTriggersFromKeywords', () => {
    it('should generate triggers for all skills in provided config', () => {
      const triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);

      expect(triggers).toHaveLength(SKILL_KEYWORDS.length);

      const skillNames = triggers.map(t => t.skillName);
      for (const skill of SKILL_KEYWORDS) {
        expect(skillNames).toContain(skill.skillName);
      }
    });

    it('should preserve priority from config', () => {
      const triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);

      for (const trigger of triggers) {
        const originalSkill = SKILL_KEYWORDS.find(
          s => s.skillName === trigger.skillName,
        );
        expect(trigger.priority).toBe(originalSkill?.priority);
      }
    });

    it('should generate RegExp patterns for each concept and language', () => {
      const triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);

      for (const trigger of triggers) {
        expect(trigger.patterns.length).toBeGreaterThan(0);
        for (const pattern of trigger.patterns) {
          expect(pattern).toBeInstanceOf(RegExp);
        }
      }
    });

    it('should work with custom config parameter', () => {
      const customConfig: SkillKeywordConfig[] = [
        {
          skillName: 'custom-skill',
          priority: 50,
          description: 'Custom skill for testing',
          concepts: {
            action: {
              en: ['custom', 'test'],
              ko: ['커스텀'],
              ja: ['カスタム'],
              zh: ['自定义'],
              es: ['personalizado'],
            },
          },
        },
      ];

      const triggers = buildTriggersFromKeywords(customConfig);

      expect(triggers).toHaveLength(1);
      expect(triggers[0].skillName).toBe('custom-skill');
      expect(triggers[0].priority).toBe(50);
      expect(triggers[0].patterns.length).toBe(5); // One per language
    });

    it('should return empty array for empty config', () => {
      const triggers = buildTriggersFromKeywords([]);

      expect(triggers).toEqual([]);
    });
  });

  describe('multi-language pattern matching', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    describe('English patterns (with word boundaries)', () => {
      it('should match "error" as a whole word', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matched = debuggingTrigger?.patterns.some(p =>
          p.test('I have an error'),
        );

        expect(matched).toBe(true);
      });

      it('should not match "error" within another word', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        // "terrorized" contains "error" but should not match with word boundaries
        const errorPatterns = debuggingTrigger?.patterns.filter(
          p => p.source.includes('error') && p.source.includes('\\b'),
        );

        // Word boundary patterns should not match
        const matchesWithinWord = errorPatterns?.some(p =>
          p.test('terrorized'),
        );
        expect(matchesWithinWord).toBe(false);
      });

      it('should match "button" in English', () => {
        const frontendTrigger = triggers.find(
          t => t.skillName === 'frontend-design',
        );
        const matched = frontendTrigger?.patterns.some(p =>
          p.test('create a button component'),
        );

        expect(matched).toBe(true);
      });
    });

    describe('Korean patterns (without word boundaries)', () => {
      it('should match "에러" in Korean text', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matched = debuggingTrigger?.patterns.some(p =>
          p.test('에러가 발생했습니다'),
        );

        expect(matched).toBe(true);
      });

      it('should match "버튼" in Korean text', () => {
        const frontendTrigger = triggers.find(
          t => t.skillName === 'frontend-design',
        );
        const matched = frontendTrigger?.patterns.some(p =>
          p.test('버튼을 만들어주세요'),
        );

        expect(matched).toBe(true);
      });

      it('should match "계획" for writing-plans', () => {
        const plansTrigger = triggers.find(
          t => t.skillName === 'writing-plans',
        );
        const matched = plansTrigger?.patterns.some(p =>
          p.test('계획을 세워주세요'),
        );

        expect(matched).toBe(true);
      });
    });

    describe('Japanese patterns (without word boundaries)', () => {
      it('should match "エラー" in Japanese text', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matched = debuggingTrigger?.patterns.some(p =>
          p.test('エラーが出ました'),
        );

        expect(matched).toBe(true);
      });

      it('should match "ボタン" in Japanese text', () => {
        const frontendTrigger = triggers.find(
          t => t.skillName === 'frontend-design',
        );
        const matched = frontendTrigger?.patterns.some(p =>
          p.test('ボタンを作成してください'),
        );

        expect(matched).toBe(true);
      });
    });

    describe('Chinese patterns (without word boundaries)', () => {
      it('should match "错误" in Chinese text', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matched = debuggingTrigger?.patterns.some(p =>
          p.test('出现了错误'),
        );

        expect(matched).toBe(true);
      });

      it('should match "按钮" in Chinese text', () => {
        const frontendTrigger = triggers.find(
          t => t.skillName === 'frontend-design',
        );
        const matched = frontendTrigger?.patterns.some(p =>
          p.test('创建一个按钮'),
        );

        expect(matched).toBe(true);
      });
    });

    describe('Spanish patterns (with word boundaries)', () => {
      it('should match "error" in Spanish text', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matched = debuggingTrigger?.patterns.some(p =>
          p.test('tengo un error'),
        );

        expect(matched).toBe(true);
      });

      it('should match "botón" in Spanish text', () => {
        const frontendTrigger = triggers.find(
          t => t.skillName === 'frontend-design',
        );
        const matched = frontendTrigger?.patterns.some(p =>
          p.test('crear un botón'),
        );

        expect(matched).toBe(true);
      });
    });

    describe('multi-word patterns', () => {
      it('should match "not working" with flexible whitespace', () => {
        const debuggingTrigger = triggers.find(
          t => t.skillName === 'systematic-debugging',
        );
        const matchedNormal = debuggingTrigger?.patterns.some(p =>
          p.test('it is not working'),
        );
        const matchedExtraSpace = debuggingTrigger?.patterns.some(p =>
          p.test('it is not  working'),
        );

        expect(matchedNormal).toBe(true);
        expect(matchedExtraSpace).toBe(true);
      });

      it('should match "step by step" in executing-plans', () => {
        const executingTrigger = triggers.find(
          t => t.skillName === 'executing-plans',
        );
        const matched = executingTrigger?.patterns.some(p =>
          p.test('do it step by step'),
        );

        expect(matched).toBe(true);
      });
    });
  });

  describe('getSkillTriggers', () => {
    it('should return cached triggers on subsequent calls', () => {
      const first = getSkillTriggers();
      const second = getSkillTriggers();

      expect(first).toBe(second); // Same reference = cached
    });

    it('should return new triggers after cache is cleared', () => {
      const first = getSkillTriggers();
      clearTriggerCache();
      const second = getSkillTriggers();

      expect(first).not.toBe(second); // Different reference = rebuilt
    });
  });

  describe('getSortedTriggers', () => {
    it('should return triggers sorted by priority in descending order', () => {
      const sorted = getSortedTriggers();

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].priority).toBeGreaterThanOrEqual(
          sorted[i + 1].priority,
        );
      }
    });

    it('should have systematic-debugging (priority 25) as the first trigger', () => {
      const sorted = getSortedTriggers();

      expect(sorted[0].skillName).toBe('systematic-debugging');
      expect(sorted[0].priority).toBe(25);
    });

    it('should have brainstorming (priority 10) as the last trigger', () => {
      const sorted = getSortedTriggers();
      const last = sorted[sorted.length - 1];

      expect(last.skillName).toBe('brainstorming');
      expect(last.priority).toBe(10);
    });

    it('should not mutate the cached triggers array', () => {
      const cached = getSkillTriggers();
      const cachedOrder = cached.map(t => t.skillName);

      getSortedTriggers();

      const cachedOrderAfter = getSkillTriggers().map(t => t.skillName);
      expect(cachedOrder).toEqual(cachedOrderAfter);
    });
  });

  describe('priority order', () => {
    it('should have correct priority hierarchy', () => {
      const sorted = getSortedTriggers();
      const priorities = sorted.map(t => ({
        name: t.skillName,
        priority: t.priority,
      }));

      // Verify expected order
      const debuggingPriority = priorities.find(
        p => p.name === 'systematic-debugging',
      )?.priority;
      const executingPriority = priorities.find(
        p => p.name === 'executing-plans',
      )?.priority;
      const writingPriority = priorities.find(
        p => p.name === 'writing-plans',
      )?.priority;
      const frontendPriority = priorities.find(
        p => p.name === 'frontend-design',
      )?.priority;
      const tddPriority = priorities.find(
        p => p.name === 'test-driven-development',
      )?.priority;
      const brainstormingPriority = priorities.find(
        p => p.name === 'brainstorming',
      )?.priority;

      expect(debuggingPriority).toBeGreaterThan(executingPriority!);
      expect(executingPriority).toBeGreaterThan(writingPriority!);
      expect(writingPriority).toBeGreaterThan(frontendPriority!);
      expect(frontendPriority).toBeGreaterThan(tddPriority!);
      expect(tddPriority).toBeGreaterThan(brainstormingPriority!);
    });
  });
});
