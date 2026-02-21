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
      expect(tddPriority).toBeGreaterThan(brainstormingPriority!);
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
});
