import { describe, it, expect } from 'vitest';
import { resolvePlanningStage, type PlanningStageMetadata } from './planning-stage';
import type { ClarificationMetadata } from './clarification-gate';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function ambiguousClarification(
  overrides: Partial<ClarificationMetadata> = {},
): ClarificationMetadata {
  return {
    clarificationNeeded: true,
    planReady: false,
    questionBudget: 2,
    nextQuestion: 'What should change?',
    clarificationTopics: ['vague-intent'],
    ...overrides,
  };
}

function clearClarification(overrides: Partial<ClarificationMetadata> = {}): ClarificationMetadata {
  return {
    clarificationNeeded: false,
    planReady: true,
    questionBudget: 3,
    ...overrides,
  };
}

function budgetExhaustedClarification(): ClarificationMetadata {
  return {
    clarificationNeeded: false,
    planReady: true,
    questionBudget: 0,
    assumptionNote: 'Proceeding with assumptions.',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('planning-stage', () => {
  describe('resolvePlanningStage', () => {
    // ------------------------------------------------------------------
    // Stage routing
    // ------------------------------------------------------------------

    describe('stage routing', () => {
      it('routes ambiguous prompt to discover', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.currentStage).toBe('discover');
      });

      it('routes clear prompt directly to plan (skip discover + design)', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.currentStage).toBe('plan');
      });

      it('routes budget-exhausted prompt to plan', () => {
        const result = resolvePlanningStage(budgetExhaustedClarification());

        expect(result.currentStage).toBe('plan');
      });

      it('routes explicit stageHint=design to design', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.currentStage).toBe('design');
      });

      it('routes explicit stageHint=plan to plan even if ambiguous', () => {
        const result = resolvePlanningStage(ambiguousClarification(), {
          stageHint: 'plan',
        });

        expect(result.currentStage).toBe('plan');
      });

      it('routes explicit stageHint=discover to discover even if clear', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'discover',
        });

        expect(result.currentStage).toBe('discover');
      });
    });

    // ------------------------------------------------------------------
    // Stage descriptions
    // ------------------------------------------------------------------

    describe('stage descriptions', () => {
      it('has a description for discover stage', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.stageDescription).toContain('Discover');
        expect(result.stageDescription).toContain('questions');
      });

      it('has a description for design stage', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.stageDescription).toContain('Design');
        expect(result.stageDescription).toContain('trade-offs');
      });

      it('has a description for plan stage', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.stageDescription).toContain('Plan');
        expect(result.stageDescription).toContain('implementation');
      });
    });

    // ------------------------------------------------------------------
    // Stage transitions
    // ------------------------------------------------------------------

    describe('stage transitions', () => {
      it('discover → nextStage is design', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.nextStage).toBe('design');
      });

      it('design → nextStage is plan', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.nextStage).toBe('plan');
      });

      it('plan → nextStage is undefined (terminal)', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.nextStage).toBeUndefined();
      });
    });

    // ------------------------------------------------------------------
    // Stage transition hints
    // ------------------------------------------------------------------

    describe('stage transition hints', () => {
      it('has a transition hint for discover stage', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.stageTransitionHint).toBeTruthy();
        expect(result.stageTransitionHint).toContain('Design');
      });

      it('has a transition hint for design stage', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.stageTransitionHint).toBeTruthy();
        expect(result.stageTransitionHint).toContain('Plan');
      });

      it('has no transition hint for plan stage (terminal)', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.stageTransitionHint).toBeUndefined();
      });
    });

    // ------------------------------------------------------------------
    // Agent selection per stage
    // ------------------------------------------------------------------

    describe('agent selection', () => {
      it('recommends solution-architect for discover', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.recommendedAgent).toBe('solution-architect');
      });

      it('recommends solution-architect for design', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.recommendedAgent).toBe('solution-architect');
      });

      it('recommends technical-planner for plan', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.recommendedAgent).toBe('technical-planner');
      });
    });

    // ------------------------------------------------------------------
    // Skill selection per stage
    // ------------------------------------------------------------------

    describe('skill selection', () => {
      it('recommends brainstorming skill for discover', () => {
        const result = resolvePlanningStage(ambiguousClarification());

        expect(result.recommendedSkill).toBe('brainstorming');
      });

      it('has no recommended skill for design', () => {
        const result = resolvePlanningStage(clearClarification(), {
          stageHint: 'design',
        });

        expect(result.recommendedSkill).toBeUndefined();
      });

      it('recommends writing-plans skill for plan', () => {
        const result = resolvePlanningStage(clearClarification());

        expect(result.recommendedSkill).toBe('writing-plans');
      });
    });

    // ------------------------------------------------------------------
    // Backward compatibility
    // ------------------------------------------------------------------

    describe('backward compatibility', () => {
      it('clear prompt produces planReady + plan stage with no intermediate steps', () => {
        const clarification = clearClarification();
        const result = resolvePlanningStage(clarification);

        expect(result.currentStage).toBe('plan');
        expect(result.nextStage).toBeUndefined();
        expect(result.stageTransitionHint).toBeUndefined();
      });

      it('all fields are present in the return type', () => {
        const result: PlanningStageMetadata = resolvePlanningStage(ambiguousClarification());

        expect(result).toHaveProperty('currentStage');
        expect(result).toHaveProperty('stageDescription');
        expect(result).toHaveProperty('nextStage');
        expect(result).toHaveProperty('stageTransitionHint');
        expect(result).toHaveProperty('recommendedAgent');
        expect(result).toHaveProperty('recommendedSkill');
      });
    });
  });
});
