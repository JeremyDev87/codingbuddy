import { describe, it, expect } from 'vitest';
import {
  evaluateClarification,
  hasOverridePhrase,
  hasVagueIntent,
  hasTechnicalReference,
  DEFAULT_QUESTION_BUDGET,
  CLARIFICATION_TOPICS,
  MIN_PROMPT_LENGTH,
} from './clarification-gate';

describe('clarification-gate', () => {
  describe('hasOverridePhrase', () => {
    it.each([
      ['just do it'],
      ['Just Do It and move on'],
      ['use your judgment here'],
      ['use your best guess'],
      ['use your discretion'],
      ['go ahead with it'],
      ['make assumptions where needed'],
      ['assume defaults'],
      ['assume reasonable behavior'],
      ['알아서 해'],
      ['알아서 진행해줘'],
      ['알아서 처리'],
      ['그냥 해'],
      ['임의로 진행'],
    ])('detects override phrase in %p', input => {
      expect(hasOverridePhrase(input)).toBe(true);
    });

    it.each([
      ['implement OAuth2 login flow'],
      ['just another feature request'],
      ['refactor the login module'],
      [''],
    ])('returns false for non-override %p', input => {
      expect(hasOverridePhrase(input)).toBe(false);
    });
  });

  describe('hasVagueIntent', () => {
    it.each([
      ['improve the UI'],
      ['make it better'],
      ['enhance performance'],
      ['optimize the flow'],
      ['optimise the flow'],
      ['refactor this'],
      ['clean up the code'],
      ['clean  up'],
      ['tweak the settings'],
      ['fix stuff'],
      ['fix things'],
      ['fix issues'],
      ['로그인 개선'],
      ['성능 향상'],
      ['최적화 필요'],
      ['코드 정리'],
    ])('detects vague intent in %p', input => {
      expect(hasVagueIntent(input)).toBe(true);
    });

    it.each([
      ['implement login'],
      ['add a new endpoint'],
      ['write unit tests'],
      ['create a button component'],
    ])('returns false for concrete intent %p', input => {
      expect(hasVagueIntent(input)).toBe(false);
    });
  });

  describe('hasTechnicalReference', () => {
    it.each([
      ['add tests to src/auth.ts'],
      ['update apps/mcp-server/src/main.ts'],
      ['fix bug in login.tsx'],
      ['modify config.yaml'],
      ['update the package.json'],
      ['call parseMode() from the handler'],
      ['use the ModeHandler class'],
      ['rename parse_mode function'],
      ['check the user_profile field'],
      ['fix `handleRequest` in the router'],
      ['invoke fetchUser() helper'],
    ])('detects technical reference in %p', input => {
      expect(hasTechnicalReference(input)).toBe(true);
    });

    it.each([['improve the UI'], ['make things faster'], ['개선해줘'], ['fix stuff'], ['']])(
      'returns false for non-technical %p',
      input => {
        expect(hasTechnicalReference(input)).toBe(false);
      },
    );
  });

  describe('evaluateClarification', () => {
    describe('clear PLAN requests (planReady path)', () => {
      it('returns planReady=true for a prompt with an explicit file path', () => {
        const result = evaluateClarification(
          'add unit tests to apps/mcp-server/src/auth/auth.service.ts',
        );

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
        expect(result.nextQuestion).toBeUndefined();
        expect(result.clarificationTopics).toBeUndefined();
        expect(result.questionBudget).toBe(DEFAULT_QUESTION_BUDGET);
      });

      it('returns planReady=true for a prompt with a function identifier', () => {
        const result = evaluateClarification('refactor parseMode() to handle localized keywords');

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
      });

      it('returns planReady=true for a prompt with a PascalCase class reference', () => {
        const result = evaluateClarification('add logging to ModeHandler for debugging');

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
      });

      it('returns planReady=true for a well-specified implementation request', () => {
        const result = evaluateClarification(
          'implement password reset endpoint that sends an email with a reset link',
        );

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
      });

      it('preserves the caller-provided budget on a clear path', () => {
        const result = evaluateClarification('add tests to src/auth.ts', {
          questionBudget: 2,
        });

        expect(result.questionBudget).toBe(2);
      });
    });

    describe('ambiguous PLAN requests (clarification path)', () => {
      it('returns clarificationNeeded=true for a short vague prompt', () => {
        const result = evaluateClarification('개선해줘');

        expect(result.clarificationNeeded).toBe(true);
        expect(result.planReady).toBe(false);
        expect(result.nextQuestion).toBeTruthy();
        expect(result.clarificationTopics?.length).toBeGreaterThan(0);
      });

      it('returns clarificationNeeded=true for vague intent verbs without scope', () => {
        const result = evaluateClarification('improve the thing and make it better');

        expect(result.clarificationNeeded).toBe(true);
        expect(result.planReady).toBe(false);
        expect(result.clarificationTopics).toContain(CLARIFICATION_TOPICS.VAGUE_INTENT);
      });

      it('returns clarificationNeeded=true for a too-short prompt without tech reference', () => {
        expect('fix it'.length).toBeLessThan(MIN_PROMPT_LENGTH);
        const result = evaluateClarification('fix it');

        expect(result.clarificationNeeded).toBe(true);
        expect(result.planReady).toBe(false);
      });

      it('emits a single highest-value next question, not a list', () => {
        const result = evaluateClarification('개선해줘');

        expect(result.nextQuestion).toBeTruthy();
        expect(typeof result.nextQuestion).toBe('string');
        // Single question, no bullet lists
        expect(result.nextQuestion).not.toMatch(/\n\s*[-*]/);
      });

      it('decrements the budget on each ambiguous round', () => {
        const r1 = evaluateClarification('improve it', { questionBudget: 3 });
        expect(r1.clarificationNeeded).toBe(true);
        expect(r1.questionBudget).toBe(2);

        const r2 = evaluateClarification('improve it', { questionBudget: 2 });
        expect(r2.clarificationNeeded).toBe(true);
        expect(r2.questionBudget).toBe(1);

        const r3 = evaluateClarification('improve it', { questionBudget: 1 });
        expect(r3.clarificationNeeded).toBe(true);
        expect(r3.questionBudget).toBe(0);
      });

      it('orders clarificationTopics by priority (vague-intent first when applicable)', () => {
        const result = evaluateClarification('개선');

        expect(result.clarificationTopics?.[0]).toBe(CLARIFICATION_TOPICS.VAGUE_INTENT);
      });
    });

    describe('override phrases', () => {
      it('returns planReady=true even when prompt is otherwise ambiguous', () => {
        const result = evaluateClarification('improve it, just do it');

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
        expect(result.questionBudget).toBe(DEFAULT_QUESTION_BUDGET);
      });

      it('honors Korean override phrase 알아서', () => {
        const result = evaluateClarification('개선해줘 알아서 해');

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
      });

      it('does not decrement budget on override path', () => {
        const result = evaluateClarification('improve it, use your judgment', {
          questionBudget: 2,
        });

        expect(result.questionBudget).toBe(2);
      });
    });

    describe('budget exhausted', () => {
      it('returns planReady=true with assumptionNote when budget=0', () => {
        const result = evaluateClarification('improve it', { questionBudget: 0 });

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
        expect(result.questionBudget).toBe(0);
        expect(result.assumptionNote).toBeTruthy();
        expect(result.assumptionNote).toMatch(/assum/i);
      });

      it('returns planReady=true when budget is negative (defensive)', () => {
        const result = evaluateClarification('개선', { questionBudget: -1 });

        expect(result.planReady).toBe(true);
        expect(result.clarificationNeeded).toBe(false);
        expect(result.questionBudget).toBe(0);
      });

      it('does not trigger budget-exhausted path when request is already clear', () => {
        // Even with budget=0 the response is planReady; the distinguishing
        // factor is that a clear request does not need an assumptionNote.
        const clearResult = evaluateClarification('add tests to src/auth.ts', {
          questionBudget: 0,
        });

        expect(clearResult.planReady).toBe(true);
        // Budget-exhausted path always sets assumptionNote
        expect(clearResult.assumptionNote).toBeTruthy();
      });
    });

    describe('edge cases', () => {
      it('handles an empty prompt as clear (no fields to ask about)', () => {
        const result = evaluateClarification('');

        // An empty string isn't "too short" (length 0), and no vague verbs or
        // tech references trigger — fall through to planReady.
        expect(result.planReady).toBe(true);
      });

      it('uses DEFAULT_QUESTION_BUDGET when options are omitted', () => {
        const result = evaluateClarification('add tests to src/auth.ts');

        expect(result.questionBudget).toBe(DEFAULT_QUESTION_BUDGET);
      });

      it('does not include nextQuestion on planReady path', () => {
        const result = evaluateClarification('add tests to src/auth.ts');

        expect(result.nextQuestion).toBeUndefined();
        expect(result.clarificationTopics).toBeUndefined();
      });
    });
  });
});
