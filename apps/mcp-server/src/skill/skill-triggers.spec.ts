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
        const originalSkill = SKILL_KEYWORDS.find(s => s.skillName === trigger.skillName);
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
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matched = debuggingTrigger?.patterns.some(p => p.test('I have an error'));

        expect(matched).toBe(true);
      });

      it('should not match "error" within another word', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        // "terrorized" contains "error" but should not match with word boundaries
        const errorPatterns = debuggingTrigger?.patterns.filter(
          p => p.source.includes('error') && p.source.includes('\\b'),
        );

        // Word boundary patterns should not match
        const matchesWithinWord = errorPatterns?.some(p => p.test('terrorized'));
        expect(matchesWithinWord).toBe(false);
      });

      it('should match "button" in English', () => {
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        const matched = frontendTrigger?.patterns.some(p => p.test('create a button component'));

        expect(matched).toBe(true);
      });
    });

    describe('Korean patterns (without word boundaries)', () => {
      it('should match "에러" in Korean text', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matched = debuggingTrigger?.patterns.some(p => p.test('에러가 발생했습니다'));

        expect(matched).toBe(true);
      });

      it('should match "버튼" in Korean text', () => {
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        const matched = frontendTrigger?.patterns.some(p => p.test('버튼을 만들어주세요'));

        expect(matched).toBe(true);
      });

      it('should match "계획" for writing-plans', () => {
        const plansTrigger = triggers.find(t => t.skillName === 'writing-plans');
        const matched = plansTrigger?.patterns.some(p => p.test('계획을 세워주세요'));

        expect(matched).toBe(true);
      });
    });

    describe('Japanese patterns (without word boundaries)', () => {
      it('should match "エラー" in Japanese text', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matched = debuggingTrigger?.patterns.some(p => p.test('エラーが出ました'));

        expect(matched).toBe(true);
      });

      it('should match "ボタン" in Japanese text', () => {
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        const matched = frontendTrigger?.patterns.some(p => p.test('ボタンを作成してください'));

        expect(matched).toBe(true);
      });
    });

    describe('Chinese patterns (without word boundaries)', () => {
      it('should match "错误" in Chinese text', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matched = debuggingTrigger?.patterns.some(p => p.test('出现了错误'));

        expect(matched).toBe(true);
      });

      it('should match "按钮" in Chinese text', () => {
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        const matched = frontendTrigger?.patterns.some(p => p.test('创建一个按钮'));

        expect(matched).toBe(true);
      });
    });

    describe('Spanish patterns (with word boundaries)', () => {
      it('should match "error" in Spanish text', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matched = debuggingTrigger?.patterns.some(p => p.test('tengo un error'));

        expect(matched).toBe(true);
      });

      it('should match "botón" in Spanish text', () => {
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        const matched = frontendTrigger?.patterns.some(p => p.test('crear un botón'));

        expect(matched).toBe(true);
      });
    });

    describe('multi-word patterns', () => {
      it('should match "not working" with flexible whitespace', () => {
        const debuggingTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        const matchedNormal = debuggingTrigger?.patterns.some(p => p.test('it is not working'));
        const matchedExtraSpace = debuggingTrigger?.patterns.some(p =>
          p.test('it is not  working'),
        );

        expect(matchedNormal).toBe(true);
        expect(matchedExtraSpace).toBe(true);
      });

      it('should match "step by step" in executing-plans', () => {
        const executingTrigger = triggers.find(t => t.skillName === 'executing-plans');
        const matched = executingTrigger?.patterns.some(p => p.test('do it step by step'));

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
        expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i + 1].priority);
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
      const debuggingPriority = priorities.find(p => p.name === 'systematic-debugging')?.priority;
      const executingPriority = priorities.find(p => p.name === 'executing-plans')?.priority;
      const prReviewPriority = priorities.find(p => p.name === 'pr-review')?.priority;
      const writingPriority = priorities.find(p => p.name === 'writing-plans')?.priority;
      const frontendPriority = priorities.find(p => p.name === 'frontend-design')?.priority;
      const refactoringPriority = priorities.find(p => p.name === 'refactoring')?.priority;
      const techDebtPriority = priorities.find(p => p.name === 'tech-debt')?.priority;
      const tddPriority = priorities.find(p => p.name === 'test-driven-development')?.priority;
      const brainstormingPriority = priorities.find(p => p.name === 'brainstorming')?.priority;

      expect(debuggingPriority).toBeGreaterThan(executingPriority!);
      expect(executingPriority).toBeGreaterThanOrEqual(prReviewPriority!);
      expect(prReviewPriority).toBeGreaterThan(refactoringPriority!);
      expect(refactoringPriority).toBeGreaterThan(writingPriority!);
      expect(writingPriority).toBeGreaterThan(techDebtPriority!);
      expect(techDebtPriority).toBeGreaterThan(frontendPriority!);
      const codeExplanationPriority = priorities.find(p => p.name === 'code-explanation')?.priority;
      const docGenPriority = priorities.find(p => p.name === 'documentation-generation')?.priority;

      expect(frontendPriority).toBeGreaterThan(codeExplanationPriority!);
      expect(codeExplanationPriority).toBeGreaterThan(docGenPriority!);
      expect(docGenPriority).toBeGreaterThan(tddPriority!);
      const agentDesignPriority = priorities.find(p => p.name === 'agent-design')?.priority;
      const ruleAuthoringPriority = priorities.find(p => p.name === 'rule-authoring')?.priority;

      expect(tddPriority).toBeGreaterThan(agentDesignPriority!);
      expect(agentDesignPriority).toBeGreaterThan(ruleAuthoringPriority!);
      expect(ruleAuthoringPriority).toBeGreaterThan(brainstormingPriority!);
    });
  });

  describe('pr-review skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have pr-review skill registered', () => {
      const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
      expect(prReviewTrigger).toBeDefined();
      expect(prReviewTrigger?.priority).toBe(22);
    });

    describe('English triggers', () => {
      it.each([
        'Review this PR',
        'PR review please',
        'code review for this change',
        'review pull request',
        'review the merge request',
        'can you LGTM this',
        'request changes on this PR',
      ])('should match: %s', prompt => {
        const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
        const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        'PR 리뷰 해줘',
        '코드 리뷰 부탁해',
        '이 PR 검토해줘',
        'MR 리뷰 해주세요',
        '풀리퀘스트 리뷰',
      ])('should match: %s', prompt => {
        const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
        const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'PRレビューお願いします',
        'コードレビューしてください',
        'プルリクエストレビュー依頼',
        'LGTMで承認して',
      ])('should match: %s', prompt => {
        const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
        const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each(['PR审查一下', '代码审查请求', '合并请求审查', 'LGTM批准'])(
        'should match: %s',
        prompt => {
          const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
          const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );
    });

    describe('Spanish triggers', () => {
      it.each([
        'por favor revisar PR',
        'necesito revisión de código',
        'revisar pull request ahora',
        'aprobar PR ahora',
      ])('should match: %s', prompt => {
        const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
        const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'review my resume',
        'review the document',
        'approve my vacation request',
        'check my homework',
        'find bugs in my essay',
        'give me feedback on my presentation',
        'security checklist for travel',
      ])('should NOT match: %s', prompt => {
        const prReviewTrigger = triggers.find(t => t.skillName === 'pr-review');
        const matched = prReviewTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });
  });

  describe('refactoring skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have refactoring skill registered', () => {
      const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
      expect(refactoringTrigger).toBeDefined();
      expect(refactoringTrigger?.priority).toBe(21);
    });

    describe('English triggers', () => {
      it.each([
        'refactor this code',
        'I need to refactoring this method',
        'clean up code please',
        'tidy up this function',
        'this is a code smell',
        'there is duplicate code here',
        'extract method from this',
        'extract function please',
        'improve code structure',
        'restructure this class',
      ])('should match: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '이 코드 리팩토링 해줘',
        '리팩터링 부탁해',
        '코드 정리 해줘',
        '코드 개선 해주세요',
        '구조 개선이 필요해',
        '정리해줘',
        '깔끔하게 만들어줘',
        '중복 코드가 있어',
        '메서드 추출해줘',
        '함수 추출 부탁',
      ])('should match: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'リファクタリングして',
        'コード整理お願い',
        'コード改善してください',
        '構造改善が必要',
        '整理してほしい',
        '重複コードがある',
        'メソッド抽出して',
      ])('should match: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '重构这段代码',
        '代码重构一下',
        '代码整理',
        '结构优化',
        '代码改进',
        '整理代码',
        '重复代码',
        '提取方法',
      ])('should match: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'refactorizar este código',
        'refactoring please',
        'reorganizar código',
        'limpiar código',
        'mejorar estructura',
        'código duplicado aquí',
        'extraer método',
      ])('should match: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('priority order with related skills', () => {
      it('should have higher priority than writing-plans (20)', () => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const writingPlansTrigger = triggers.find(t => t.skillName === 'writing-plans');
        // Refactoring (21) should win over writing-plans (20) for "refactor" keyword
        expect(refactoringTrigger?.priority).toBeGreaterThan(writingPlansTrigger!.priority);
      });

      it('should have higher priority than frontend-design (18)', () => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        expect(refactoringTrigger?.priority).toBeGreaterThan(frontendTrigger!.priority);
      });

      it('should have higher priority than test-driven-development (15)', () => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const tddTrigger = triggers.find(t => t.skillName === 'test-driven-development');
        expect(refactoringTrigger?.priority).toBeGreaterThan(tddTrigger!.priority);
      });
    });

    describe('differentiating keywords', () => {
      it.each([
        'execute refactor on this code',
        'apply refactoring to this method',
        'do refactoring here',
        'perform refactoring on this class',
      ])('should match differentiating keyword: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });

      it.each(['리팩토링 실행해줘', '리팩토링 적용해'])(
        'should match Korean differentiating keyword: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );

      it.each(['リファクタリング実行してください', 'リファクタリング適用して'])(
        'should match Japanese differentiating keyword: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );

      it.each(['执行重构这段代码', '应用重构到这个方法'])(
        'should match Chinese differentiating keyword: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );

      it.each(['ejecutar refactorización en este código', 'aplicar refactorización aquí'])(
        'should match Spanish differentiating keyword: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );
    });

    describe('casual language variations', () => {
      it.each(['リファクタリングして', 'コード整理して', '整理してください'])(
        'should match casual Japanese: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );

      it.each(['重构一下', '代码整理下', '整理代码'])('should match casual Chinese: %s', prompt => {
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });

      it.each(['refactorizar esto', 'limpiar código'])(
        'should match casual Spanish: %s',
        prompt => {
          const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
          const matched = refactoringTrigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(true);
        },
      );
    });
  });

  describe('security-audit skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have security-audit skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'security-audit');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(22);
    });

    describe('English triggers', () => {
      it.each([
        'do a security review before shipping',
        'run a security audit on this code',
        'security check on the API endpoints',
        'OWASP compliance check needed',
        'check for vulnerabilities in the code',
        'found a CVE in a dependency',
        'there is an XSS vulnerability here',
        'check for SQL injection risks',
        'scan for hardcoded secrets',
        'check for authentication flaw in login',
        'there is an authorization bypass in this route',
        'review access control implementation',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '보안 검토 해줘',
        '보안 감사 실시해',
        '보안 점검 부탁해',
        'OWASP 체크리스트 확인해',
        '취약점 있는지 봐줘',
        'SQL 인젝션 위험 확인해',
        '하드코딩된 시크릿 스캔해줘',
        '인가 우회 문제 검토해',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'セキュリティレビューをお願いします',
        'セキュリティ監査を実施してください',
        'OWASP準拠チェックが必要です',
        '脆弱性がないか確認してください',
        'SQLインジェクションのリスクを確認',
        '認証の欠陥を調べてください',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '做一次安全审查',
        '进行安全审计',
        'OWASP合规检查',
        '检查漏洞',
        '检查SQL注入风险',
        '检查认证缺陷',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'hacer una revisión de seguridad',
        'realizar auditoría de seguridad',
        'verificar cumplimiento OWASP',
        'buscar vulnerabilidades en el código',
        'revisar inyección SQL',
        'fallo de autenticación detectado',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'review my essay',
        'check the weather',
        'improve performance',
        'add a new feature',
        'write unit tests',
        'update the README',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'security-audit');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });
  });

  describe('documentation-generation skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have documentation-generation skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'documentation-generation');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(16);
    });

    describe('English triggers', () => {
      it.each([
        'write a README for this project',
        'generate documentation for the API',
        'create API docs',
        'update the CHANGELOG',
        'write an ADR for this decision',
        'document this function',
        'generate API reference',
        'create technical documentation',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'documentation-generation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        'README 작성해줘',
        'API 문서 만들어줘',
        'CHANGELOG 업데이트해줘',
        '문서 작성 부탁해',
        '문서화 해줘',
        'ADR 작성해',
        '기술 문서 작성',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'documentation-generation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'READMEを書いてください',
        'APIドキュメントを生成して',
        'CHANGELOGを更新して',
        'ドキュメントを作成して',
        'ADRを書いて',
        '技術文書を作成',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'documentation-generation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '写一个README',
        '生成API文档',
        '更新CHANGELOG',
        '写文档',
        '创建技术文档',
        '编写ADR',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'documentation-generation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'escribir README para el proyecto',
        'generar documentación de la API',
        'actualizar CHANGELOG',
        'escribir documentación técnica',
        'crear ADR para esta decisión',
        'documentar esta función',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'documentation-generation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      describe('English', () => {
        it.each([
          'fix this bug',
          'refactor this function',
          'run performance tests',
          'deploy to production',
          'write unit tests for this',
          'the document is ready',
          'shared document link',
          'open the document',
        ])('should NOT match: %s', prompt => {
          const trigger = triggers.find(t => t.skillName === 'documentation-generation');
          const matched = trigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(false);
        });
      });

      describe('Korean', () => {
        it.each(['버그 고쳐줘', '배포 준비해줘', '리팩토링 해줘', '테스트 작성해줘'])(
          'should NOT match: %s',
          prompt => {
            const trigger = triggers.find(t => t.skillName === 'documentation-generation');
            const matched = trigger?.patterns.some(p => p.test(prompt));
            expect(matched).toBe(false);
          },
        );
      });

      describe('Japanese', () => {
        it.each([
          'バグを修正して',
          'デプロイしてください',
          'リファクタリングして',
          'テストを書いて',
        ])('should NOT match: %s', prompt => {
          const trigger = triggers.find(t => t.skillName === 'documentation-generation');
          const matched = trigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(false);
        });
      });

      describe('Chinese', () => {
        it.each(['修复这个bug', '部署到生产环境', '重构这段代码', '写单元测试'])(
          'should NOT match: %s',
          prompt => {
            const trigger = triggers.find(t => t.skillName === 'documentation-generation');
            const matched = trigger?.patterns.some(p => p.test(prompt));
            expect(matched).toBe(false);
          },
        );
      });

      describe('Spanish', () => {
        it.each([
          'arreglar este error',
          'desplegar en producción',
          'refactorizar este código',
          'escribir pruebas unitarias',
        ])('should NOT match: %s', prompt => {
          const trigger = triggers.find(t => t.skillName === 'documentation-generation');
          const matched = trigger?.patterns.some(p => p.test(prompt));
          expect(matched).toBe(false);
        });
      });
    });
  });

  describe('tech-debt skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have tech-debt skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'tech-debt');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(19);
    });

    describe('English triggers', () => {
      it.each([
        'we have a lot of technical debt',
        'need a tech debt assessment',
        'do a tech health review',
        'run a code health check',
        'this project suffers from code rot',
        'code decay is slowing us down',
        'prioritize our debt paydown',
        'calculate ROI prioritization for this debt',
        'create a debt register for the project',
        'we need to pay down debt this sprint',
        'quarterly tech review of our codebase',
        'what is the velocity impact of this debt',
        'track our debt inventory',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '기술 부채 평가해줘',
        '기술부채 분석 부탁해',
        '부채 우선순위 정해줘',
        'ROI 우선순위 계산해',
        '부채 레지스터 만들어줘',
        '스프린트 용량 계획',
        '부채 상환 계획 세워줘',
        '유지보수성 점검',
        '분기 부채 리뷰 하자',
        '코드 건강 점검',
        '분기 기술 리뷰',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        '技術的負債の評価をお願いします',
        '負債分析してください',
        '負債優先順位を決めて',
        'ROI優先順位を計算して',
        '負債レジスターを作成して',
        '負債返済計画を立てて',
        '保守性を確認して',
        '四半期技術レビューしましょう',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '评估技术债务',
        '技术债分析',
        '债务优先级排序',
        'ROI优先级计算',
        '创建债务登记',
        '偿还债务计划',
        '检查可维护性',
        '季度技术审查进行',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'evaluar la deuda técnica',
        'análisis de deuda tecnológica',
        'priorización de deuda del proyecto',
        'calcular priorización ROI',
        'crear registro de deuda',
        'pagar deuda técnica este sprint',
        'revisar mantenibilidad',
        'revisión trimestral técnica del proyecto',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'create a new component',
        'review this PR',
        'write documentation',
        'financial debt management',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'tech-debt');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order with related skills', () => {
      it('should have lower priority than refactoring (21)', () => {
        const techDebtTrigger = triggers.find(t => t.skillName === 'tech-debt');
        const refactoringTrigger = triggers.find(t => t.skillName === 'refactoring');
        expect(refactoringTrigger?.priority).toBeGreaterThan(techDebtTrigger!.priority);
      });

      it('should have higher priority than frontend-design (18)', () => {
        const techDebtTrigger = triggers.find(t => t.skillName === 'tech-debt');
        const frontendTrigger = triggers.find(t => t.skillName === 'frontend-design');
        expect(techDebtTrigger?.priority).toBeGreaterThan(frontendTrigger!.priority);
      });

      it('should have lower priority than writing-plans (20)', () => {
        const techDebtTrigger = triggers.find(t => t.skillName === 'tech-debt');
        const writingPlansTrigger = triggers.find(t => t.skillName === 'writing-plans');
        expect(writingPlansTrigger?.priority).toBeGreaterThan(techDebtTrigger!.priority);
      });
    });
  });

  describe('code-explanation skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have code-explanation skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'code-explanation');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(17);
    });

    describe('English triggers', () => {
      it.each([
        'explain this code to me',
        'can you explain the authentication flow',
        'walk me through this function',
        'how does this work exactly',
        'what does this do',
        'I need a code walkthrough',
        'give me a codebase overview',
        'I am new to this project, onboarding please',
        'analyze code in this module',
        'architecture overview of the system',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '이 코드 설명해줘',
        '코드 분석 부탁해',
        '이게 뭐야 이 함수',
        '어떻게 동작하는거야',
        '온보딩 자료 만들어줘',
        '프로젝트 구조 설명해 줘',
        '코드 워크스루 해줘',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'このコードを説明してください',
        'コード説明お願いします',
        'どう動くか教えて',
        'オンボーディング資料',
        'アーキテクチャ概要を教えて',
        'コードウォークスルーして',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '解释代码给我',
        '这是什么代码',
        '怎么工作的',
        '代码分析一下',
        '代码库概览',
        '项目结构说明',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'explicar este código',
        'cómo funciona esto',
        'qué hace esto exactamente',
        'análisis de código por favor',
        'visión general de arquitectura',
        'soy nuevo en esto, necesito guía',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'deploy to production',
        'write unit tests',
        'create a new component',
        'optimize performance',
        'update the README',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'code-explanation');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });
  });

  describe('agent-design skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have agent-design skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'agent-design');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(14);
    });

    describe('English triggers', () => {
      it.each([
        'create a new agent for the project',
        'design agent for code review',
        'I need to add agent for security',
        'write an agent definition',
        'build a specialist agent',
        'update the agent JSON schema',
        'write the agent system prompt',
        'check agent differentiation',
        'define agent scope and boundary',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '새 에이전트 만들어줘',
        '에이전트 설계 해주세요',
        '에이전트 추가하고 싶어',
        '에이전트 JSON 작성해줘',
        '에이전트 스키마 확인해',
        '에이전트 중복 검사해줘',
        '전문가 에이전트 정의해',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'エージェント作成してください',
        'エージェント設計お願い',
        '新しいエージェントを追加',
        'エージェントJSON書いて',
        'エージェント差別化を確認',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '创建代理定义',
        '设计代理模板',
        '添加代理到项目',
        '代理JSON配置',
        '检查代理重叠',
        '智能体设计',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'crear agente especialista',
        'diseñar agente para revisión',
        'nuevo agente para el proyecto',
        'esquema de agente JSON',
        'verificar diferenciación de agentes',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'review this PR',
        'optimize performance',
        'write documentation',
        'the travel agent booked my flight',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'agent-design');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have lower priority than TDD (15)', () => {
        const agentDesignTrigger = triggers.find(t => t.skillName === 'agent-design');
        const tddTrigger = triggers.find(t => t.skillName === 'test-driven-development');
        expect(tddTrigger?.priority).toBeGreaterThan(agentDesignTrigger!.priority);
      });

      it('should have higher priority than brainstorming (10)', () => {
        const agentDesignTrigger = triggers.find(t => t.skillName === 'agent-design');
        const brainstormingTrigger = triggers.find(t => t.skillName === 'brainstorming');
        expect(agentDesignTrigger?.priority).toBeGreaterThan(brainstormingTrigger!.priority);
      });
    });
  });

  describe('rule-authoring skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have rule-authoring skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'rule-authoring');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(13);
    });

    describe('English triggers', () => {
      it.each([
        'write a new coding rule for TypeScript',
        'create rule for authentication checks',
        'I need to add a rule to ai-rules',
        'rule authoring for the project',
        'check rule quality and ambiguity',
        'fix this ambiguous rule to be clearer',
        'make rules multi-tool compatible',
        'audit rules for consistency',
        'review rule overlap between files',
        'quarterly audit of coding rules',
        'write a Cursor rule for this pattern',
        'Copilot rule needs updating',
        'write a rule for auth validation',
        'create a rule for TypeScript strict mode',
        'add a rule to the project',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '새 규칙 작성해줘',
        '코딩 규칙 만들어줘',
        '규칙 추가하고 싶어',
        'AI 규칙 정의해줘',
        '규칙 품질 확인해',
        '모호한 규칙 수정해',
        '규칙 호환성 확인해줘',
        '규칙 감사 실시해',
        '규칙 중복 검토해줘',
        '룰 작성 부탁해',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'ルール作成してください',
        '新しいルール追加して',
        'コーディングルールを書いて',
        'ルール品質を確認して',
        'ルールの曖昧さを修正',
        'マルチツール互換ルール',
        'ルール監査お願いします',
        'ルール重複を確認して',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '编写规则给项目',
        '创建新规则',
        '添加编码规则',
        '规则质量检查',
        '模糊规则修正',
        '多工具兼容规则',
        '规则审计进行',
        '规则重叠检查',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'escribir regla de codificación',
        'crear nueva regla para el proyecto',
        'agregar regla AI al sistema',
        'verificar calidad de regla',
        'regla ambigua necesita corrección',
        'compatibilidad de regla multi-herramienta',
        'auditoría de reglas del proyecto',
        'revisar superposición de reglas',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'review this PR',
        'create a new component',
        'optimize performance',
        'write documentation',
        'explain this code',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'rule-authoring');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have lower priority than agent-design (14)', () => {
        const ruleAuthoringTrigger = triggers.find(t => t.skillName === 'rule-authoring');
        const agentDesignTrigger = triggers.find(t => t.skillName === 'agent-design');
        expect(agentDesignTrigger?.priority).toBeGreaterThan(ruleAuthoringTrigger!.priority);
      });

      it('should have higher priority than brainstorming (10)', () => {
        const ruleAuthoringTrigger = triggers.find(t => t.skillName === 'rule-authoring');
        const brainstormingTrigger = triggers.find(t => t.skillName === 'brainstorming');
        expect(ruleAuthoringTrigger?.priority).toBeGreaterThan(brainstormingTrigger!.priority);
      });
    });
  });

  describe('context-management skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have context-management skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'context-management');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(16);
    });

    describe('English triggers', () => {
      it.each([
        'preserve context across sessions',
        'save context before compaction',
        'context management for this task',
        'update the context document',
        'read the context file',
        'session continuity is important',
        'resume session from where I left off',
        'context window is running low',
        'decisions need to persist across sessions',
        'start a new session and check context',
        'end session and save progress',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '컨텍스트 관리 해줘',
        '컨텍스트 보존해줘',
        '세션 재개할게',
        '세션 종료하기 전에 저장해',
        '컨텍스트 문서 업데이트해',
        '결정 사항 기록해줘',
        '컨텍스트 윈도우가 부족해',
        '이전 세션에서 이어서 작업',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'コンテキスト管理をお願いします',
        'コンテキストを保存して',
        'セッション再開します',
        'セッション終了前に保存して',
        'コンテキストドキュメントを更新して',
        '決定事項を記録して',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '上下文管理',
        '保存上下文',
        '会话恢复',
        '会话结束前保存',
        '更新上下文文档',
        '记录决策',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'gestión de contexto por favor',
        'preservar contexto entre sesiones',
        'reanudar sesión anterior',
        'guardar contexto antes de terminar',
        'actualizar documento de contexto',
        'registrar decisiones tomadas',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'review this PR',
        'create a new component',
        'optimize performance',
        'write documentation',
        'explain this code',
        'design a new agent',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'context-management');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have same priority as documentation-generation (16)', () => {
        const contextTrigger = triggers.find(t => t.skillName === 'context-management');
        const docGenTrigger = triggers.find(t => t.skillName === 'documentation-generation');
        expect(contextTrigger?.priority).toBe(docGenTrigger?.priority);
      });

      it('should have higher priority than TDD (15)', () => {
        const contextTrigger = triggers.find(t => t.skillName === 'context-management');
        const tddTrigger = triggers.find(t => t.skillName === 'test-driven-development');
        expect(contextTrigger?.priority).toBeGreaterThan(tddTrigger!.priority);
      });

      it('should have lower priority than code-explanation (17)', () => {
        const contextTrigger = triggers.find(t => t.skillName === 'context-management');
        const codeExplTrigger = triggers.find(t => t.skillName === 'code-explanation');
        expect(codeExplTrigger?.priority).toBeGreaterThan(contextTrigger!.priority);
      });
    });
  });

  describe('mcp-builder skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have mcp-builder skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'mcp-builder');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(13);
    });

    describe('English triggers', () => {
      it.each([
        'build an MCP server for this project',
        'create a new MCP tool for search',
        'add MCP resource for config data',
        'extend MCP with a new prompt',
        'implement Model Context Protocol server',
        'need a tool handler for this feature',
        'design the inputSchema for this tool',
        'add SSE transport to the server',
        'implement stdio transport mode',
        'create an SSE endpoint for the MCP server',
        'define MCP capability for data access',
        'write a resource definition for rules',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        'MCP 서버 구축하자',
        'MCP 도구 추가해줘',
        'MCP 리소스 정의해',
        'MCP 프롬프트 만들어줘',
        'MCP 확장하고 싶어',
        '툴 핸들러 작성해',
        '입력 스키마 설계해줘',
        'SSE 전송 구현해',
        'stdio 모드 설정해줘',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'MCPサーバーを構築して',
        'MCPツールを追加してください',
        'MCPリソースを定義して',
        'ツールハンドラーを作成して',
        'SSEトランスポートを実装して',
        'stdioモードを設定して',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '构建MCP服务器',
        '添加MCP工具',
        '定义MCP资源',
        '创建工具处理器',
        '实现SSE传输',
        '配置stdio模式',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'construir servidor MCP para el proyecto',
        'crear herramienta MCP para búsqueda',
        'agregar recurso MCP para configuración',
        'implementar transporte SSE',
        'configurar modo stdio',
        'definir esquema de entrada para la herramienta',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'review this PR',
        'create a new React component',
        'optimize database queries',
        'write documentation',
        'explain this code',
        'design a new agent',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'mcp-builder');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have same priority as rule-authoring (13)', () => {
        const mcpBuilderTrigger = triggers.find(t => t.skillName === 'mcp-builder');
        const ruleAuthoringTrigger = triggers.find(t => t.skillName === 'rule-authoring');
        expect(mcpBuilderTrigger?.priority).toBe(ruleAuthoringTrigger?.priority);
      });

      it('should have lower priority than agent-design (14)', () => {
        const mcpBuilderTrigger = triggers.find(t => t.skillName === 'mcp-builder');
        const agentDesignTrigger = triggers.find(t => t.skillName === 'agent-design');
        expect(agentDesignTrigger?.priority).toBeGreaterThan(mcpBuilderTrigger!.priority);
      });

      it('should have higher priority than brainstorming (10)', () => {
        const mcpBuilderTrigger = triggers.find(t => t.skillName === 'mcp-builder');
        const brainstormingTrigger = triggers.find(t => t.skillName === 'brainstorming');
        expect(mcpBuilderTrigger?.priority).toBeGreaterThan(brainstormingTrigger!.priority);
      });
    });
  });

  describe('deployment-checklist skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have deployment-checklist skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(23);
    });

    describe('English triggers', () => {
      it.each([
        'deploy to production',
        'deployment checklist for the release',
        'pre-deploy validation steps',
        'run smoke test before shipping',
        'we need a rollback plan',
        'health check after deployment',
        'post-deploy monitoring setup',
        'go live with the new version',
        'canary deploy strategy',
        'blue-green deployment approach',
        'push to production today',
        'promote to production after staging',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '프로덕션 배포 준비해',
        '배포 체크리스트 확인해',
        '배포 전 점검 해야 해',
        '배포 검증 절차 알려줘',
        '롤백 계획 세워줘',
        '배포 후 모니터링 해야 해',
        '헬스 체크 설정해줘',
        '카나리 배포 전략 알려줘',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'デプロイ前の確認をお願いします',
        'デプロイチェックリストを確認して',
        '本番デプロイの準備をして',
        'ロールバック計画を立てて',
        'ヘルスチェックを設定して',
        'カナリアデプロイの戦略を教えて',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '部署前检查清单',
        '部署清单确认',
        '生产部署准备',
        '回滚计划制定',
        '健康检查设置',
        '金丝雀部署策略',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'checklist de despliegue por favor',
        'validación de despliegue previa',
        'preparar despliegue a producción',
        'plan de rollback para el release',
        'health check después del despliegue',
        'despliegue canario para el servicio',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'review this PR',
        'create a new component',
        'optimize performance',
        'explain this code',
        'design a new agent',
        'write documentation',
        'manage context across sessions',
        'production incident occurred',
        'rollback the failed service',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have lower priority than incident-response (24)', () => {
        const deployTrigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const incidentTrigger = triggers.find(t => t.skillName === 'incident-response');
        expect(incidentTrigger?.priority).toBeGreaterThan(deployTrigger!.priority);
      });

      it('should have same priority as performance-optimization (23)', () => {
        const deployTrigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const perfTrigger = triggers.find(t => t.skillName === 'performance-optimization');
        expect(deployTrigger?.priority).toBe(perfTrigger?.priority);
      });

      it('should have higher priority than database-migration (22)', () => {
        const deployTrigger = triggers.find(t => t.skillName === 'deployment-checklist');
        const dbTrigger = triggers.find(t => t.skillName === 'database-migration');
        expect(deployTrigger?.priority).toBeGreaterThan(dbTrigger!.priority);
      });
    });
  });

  describe('error-analysis skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have error-analysis skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'error-analysis');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(24);
    });

    describe('English triggers', () => {
      it.each([
        'I got a stack trace from the server',
        'can you read the stacktrace for me',
        'look at the call stack and tell me what happened',
        'what does this error message mean',
        'read the error and explain it',
        'analyze the error output',
        'classify error type for this exception',
        'what type of error is this',
        'this is a runtime error in production',
        'trace to origin of this crash',
        'where does the error come from',
        'find the root cause of this failure',
        'I need a diagnosis of this error',
        'what could cause this exception',
        'form a hypothesis about why this fails',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '스택 트레이스를 분석해줘',
        '콜 스택을 확인해봐',
        '에러 메시지가 뭘 의미하는지 알려줘',
        '에러 분석 좀 해줘',
        '오류 메시지를 읽어봐',
        '에러 분류 좀 해줘',
        '이 에러 타입이 뭐야',
        '런타임 에러가 발생했어',
        '원인 추적을 해야 해',
        '근본 원인을 찾아줘',
        '에러 진단 좀 해줘',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'スタックトレースを見てください',
        'コールスタックを確認して',
        'エラーメッセージの意味を教えて',
        'エラー分析をお願いします',
        'エラー分類してください',
        'エラータイプは何ですか',
        'ランタイムエラーが発生しました',
        '原因追跡をしてください',
        '根本原因を見つけて',
        'エラー診断をお願いします',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '请查看堆栈跟踪',
        '分析调用栈',
        '这个错误消息是什么意思',
        '错误分析一下',
        '错误分类是什么',
        '这是什么错误类型',
        '运行时错误发生了',
        '追踪根因',
        '找到根本原因',
        '错误诊断',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'muestra el stack trace del servidor',
        'analizar la traza de pila',
        'qué significa este mensaje de error',
        'analizar el error de producción',
        'leer el error y explicarlo',
        'clasificar error de esta excepción',
        'cuál es el tipo de error',
        'error de sintaxis en el código',
        'encontrar la causa raíz',
        'origen del error en el sistema',
        'necesito un diagnóstico de este error',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('negative cases', () => {
      it.each([
        'deploy to production',
        'write a new feature for authentication',
        'refactor the payment module',
        'create a REST API endpoint',
        'optimize database queries',
        'I got an error',
        'fix this error please',
        'there is a bug in the code',
        'the app crashed',
        'debug the login flow',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'error-analysis');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have lower priority than systematic-debugging (25)', () => {
        const errorTrigger = triggers.find(t => t.skillName === 'error-analysis');
        const debugTrigger = triggers.find(t => t.skillName === 'systematic-debugging');
        expect(debugTrigger?.priority).toBeGreaterThan(errorTrigger!.priority);
      });

      it('should have same priority as incident-response (24)', () => {
        const errorTrigger = triggers.find(t => t.skillName === 'error-analysis');
        const incidentTrigger = triggers.find(t => t.skillName === 'incident-response');
        expect(errorTrigger?.priority).toBe(incidentTrigger?.priority);
      });

      it('should have higher priority than deployment-checklist (23)', () => {
        const errorTrigger = triggers.find(t => t.skillName === 'error-analysis');
        const deployTrigger = triggers.find(t => t.skillName === 'deployment-checklist');
        expect(errorTrigger?.priority).toBeGreaterThan(deployTrigger!.priority);
      });
    });
  });

  describe('legacy-modernization skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have legacy-modernization skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(20);
    });

    describe('English triggers', () => {
      it.each([
        'modernize the legacy codebase',
        'migrate from CommonJS to ESM',
        'strangler fig pattern for the old service',
        'branch by abstraction to replace the parser',
        'upgrade from NestJS 9 to NestJS 10',
        'replace callbacks with async await',
        'convert to TypeScript for the old modules',
        'incremental migration of the old module',
        'deprecated API needs replacement',
        'modernization plan for the legacy system',
        'migrate old patterns to modern approach',
        'rewrite the legacy service incrementally',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '레거시 코드 현대화 해줘',
        'CommonJS에서 ESM으로 마이그레이션',
        '스트랭글러 피그 패턴으로 교체해',
        '콜백을 async await로 변환해',
        'NestJS 메이저 버전 업그레이드',
        '레거시 시스템 점진적 전환',
        '구 코드 모던화 계획',
        '프레임워크 마이그레이션 해야 해',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'レガシーコードのモダナイゼーション',
        'CommonJSからESMへ移行して',
        'ストラングラーフィグパターンで置き換え',
        'コールバックをasync awaitに変換',
        'フレームワークのメジャーバージョンアップグレード',
        'レガシーシステムの段階的移行',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '遗留代码现代化',
        '从CommonJS迁移到ESM',
        '绞杀者模式替换旧服务',
        '回调转换为async await',
        '框架大版本升级',
        '遗留系统渐进式迁移',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'modernizar el código legacy',
        'migrar de CommonJS a ESM',
        'patrón strangler fig para el servicio antiguo',
        'convertir callbacks a async await',
        'actualizar la versión mayor del framework',
        'migración incremental del sistema legacy',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'write unit tests',
        'review this PR',
        'deploy to production',
        'create a new component',
        'optimize database queries',
        'explain this code',
        'design a new API',
        'write documentation',
        'production incident occurred',
        'refactor this function',
        'manage technical debt backlog',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have lower priority than refactoring (21)', () => {
        const legacyTrigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const refactorTrigger = triggers.find(t => t.skillName === 'refactoring');
        expect(refactorTrigger?.priority).toBeGreaterThan(legacyTrigger!.priority);
      });

      it('should have same priority as writing-plans (20)', () => {
        const legacyTrigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const plansTrigger = triggers.find(t => t.skillName === 'writing-plans');
        expect(legacyTrigger?.priority).toBe(plansTrigger?.priority);
      });

      it('should have higher priority than tech-debt (19)', () => {
        const legacyTrigger = triggers.find(t => t.skillName === 'legacy-modernization');
        const techDebtTrigger = triggers.find(t => t.skillName === 'tech-debt');
        expect(legacyTrigger?.priority).toBeGreaterThan(techDebtTrigger!.priority);
      });
    });
  });

  describe('prompt-engineering skill triggers', () => {
    let triggers: ReturnType<typeof buildTriggersFromKeywords>;

    beforeAll(() => {
      triggers = buildTriggersFromKeywords(SKILL_KEYWORDS);
    });

    it('should have prompt-engineering skill registered', () => {
      const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
      expect(trigger).toBeDefined();
      expect(trigger?.priority).toBe(14);
    });

    describe('English triggers', () => {
      it.each([
        'I need help with prompt engineering',
        'write a prompt for this agent',
        'create prompt for the code reviewer',
        'design prompt for security analysis',
        'optimize prompt for better results',
        'improve the system prompt',
        'write system prompt for the planner agent',
        'design system prompt for code review',
        'the tool description needs improvement',
        'write tool description for search_rules',
        'improve MCP tool description',
        'test prompt with different inputs',
        'prompt evaluation rubric needed',
        'check prompt quality and consistency',
        'use chain of thought for this',
        'try few-shot approach',
        'use meta-prompting to improve this',
        'update CLAUDE.md instructions',
        'write cursorrules for the project',
        'copilot instructions need updating',
        'make AI-readable instructions',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Korean triggers', () => {
      it.each([
        '프롬프트 엔지니어링 해줘',
        '프롬프트 작성 부탁해',
        '프롬프트 최적화 해줘',
        '프롬프트 개선이 필요해',
        '시스템 프롬프트 작성해줘',
        '에이전트 프롬프트 설계해',
        '도구 설명 개선해줘',
        'MCP 도구 설명 작성해',
        '프롬프트 테스트 해봐',
        '프롬프트 품질 확인해',
        '프롬프트 패턴 적용해',
        'AI 지시문 작성해줘',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Japanese triggers', () => {
      it.each([
        'プロンプトエンジニアリングをお願い',
        'プロンプト作成してください',
        'プロンプト最適化して',
        'システムプロンプト設計して',
        'ツール説明を改善して',
        'MCPツール説明を作成して',
        'プロンプトテストしてください',
        'プロンプト品質を確認して',
        'チェーンオブソートを使って',
        'フューショットで試して',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Chinese triggers', () => {
      it.each([
        '提示词工程帮忙做一下',
        '编写提示词给这个代理',
        '优化提示词效果',
        '系统提示词设计',
        '编写系统提示词',
        '工具描述需要优化',
        '测试提示词效果',
        '提示词质量检查',
        '思维链方法使用',
        '少样本方法尝试',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Spanish triggers', () => {
      it.each([
        'necesito ingeniería de prompts',
        'escribir prompt para el agente',
        'diseñar prompt para revisión de código',
        'optimizar prompt para mejores resultados',
        'escribir prompt del sistema',
        'descripción de herramienta MCP',
        'evaluación de prompt necesaria',
        'cadena de pensamiento para esto',
        'instrucciones AI para el proyecto',
      ])('should match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(true);
      });
    });

    describe('Negative test cases (should NOT match)', () => {
      it.each([
        'fix this bug',
        'refactor this function',
        'write unit tests',
        'deploy to production',
        'review this PR',
        'create a new component',
        'optimize database queries',
        'explain this code',
        'design a new API',
        'security audit needed',
        'migrate the database schema',
        // Ambiguous "prompt" usage - should NOT trigger prompt-engineering
        'prompt the user for input',
        'add a confirmation prompt before delete',
        'show a prompt dialog to the user',
        'command prompt settings',
      ])('should NOT match: %s', prompt => {
        const trigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const matched = trigger?.patterns.some(p => p.test(prompt));
        expect(matched).toBe(false);
      });
    });

    describe('priority order', () => {
      it('should have same priority as agent-design (14)', () => {
        const promptTrigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const agentDesignTrigger = triggers.find(t => t.skillName === 'agent-design');
        expect(promptTrigger?.priority).toBe(agentDesignTrigger?.priority);
      });

      it('should have higher priority than rule-authoring (13)', () => {
        const promptTrigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const ruleAuthoringTrigger = triggers.find(t => t.skillName === 'rule-authoring');
        expect(promptTrigger?.priority).toBeGreaterThan(ruleAuthoringTrigger!.priority);
      });

      it('should have lower priority than TDD (15)', () => {
        const promptTrigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const tddTrigger = triggers.find(t => t.skillName === 'test-driven-development');
        expect(tddTrigger?.priority).toBeGreaterThan(promptTrigger!.priority);
      });

      it('should have higher priority than brainstorming (10)', () => {
        const promptTrigger = triggers.find(t => t.skillName === 'prompt-engineering');
        const brainstormingTrigger = triggers.find(t => t.skillName === 'brainstorming');
        expect(promptTrigger?.priority).toBeGreaterThan(brainstormingTrigger!.priority);
      });
    });
  });
});
