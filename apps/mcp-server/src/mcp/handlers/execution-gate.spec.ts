import { describe, it, expect } from 'vitest';
import { evaluateExecutionGate, type ExecutionGateInput } from './execution-gate';
import type { ClarificationMetadata } from './clarification-gate';
import type { PlanningStageMetadata } from './planning-stage';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

function ambiguousClarification(): ClarificationMetadata {
  return {
    clarificationNeeded: true,
    planReady: false,
    questionBudget: 2,
    nextQuestion: 'What should change?',
    clarificationTopics: ['vague-intent'],
  };
}

function clearClarification(): ClarificationMetadata {
  return {
    clarificationNeeded: false,
    planReady: true,
    questionBudget: 3,
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

function discoverStage(): PlanningStageMetadata {
  return {
    currentStage: 'discover',
    stageDescription: 'Discover: Surface questions...',
    nextStage: 'design',
    stageTransitionHint: 'Answer clarification to proceed.',
    recommendedAgent: 'solution-architect',
    recommendedSkill: 'brainstorming',
  };
}

function designStage(): PlanningStageMetadata {
  return {
    currentStage: 'design',
    stageDescription: 'Design: Synthesize approaches...',
    nextStage: 'plan',
    stageTransitionHint: 'Confirm approach to proceed.',
    recommendedAgent: 'solution-architect',
  };
}

function planStage(): PlanningStageMetadata {
  return {
    currentStage: 'plan',
    stageDescription: 'Plan: Produce implementation plan.',
    recommendedAgent: 'technical-planner',
    recommendedSkill: 'writing-plans',
  };
}

const SAMPLE_SPECIALISTS = [
  'security-specialist',
  'performance-specialist',
  'code-quality-specialist',
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('execution-gate', () => {
  describe('evaluateExecutionGate', () => {
    // ------------------------------------------------------------------
    // Gated scenarios
    // ------------------------------------------------------------------

    describe('gated (ambiguous / early stage)', () => {
      it('gates when clarificationNeeded=true', () => {
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(true);
        expect(result.reason).toContain('ambiguous');
        expect(result.unblockCondition).toBeTruthy();
        expect(result.deferredSpecialists).toEqual(SAMPLE_SPECIALISTS);
      });

      it('gates when currentStage=discover', () => {
        const input: ExecutionGateInput = {
          clarification: { clarificationNeeded: false, planReady: false },
          planningStage: discoverStage(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(true);
        expect(result.reason).toContain('discover');
        expect(result.unblockCondition).toContain('Design');
      });

      it('gates when currentStage=design', () => {
        const input: ExecutionGateInput = {
          clarification: { clarificationNeeded: false, planReady: false },
          planningStage: designStage(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(true);
        expect(result.reason).toContain('design');
        expect(result.unblockCondition).toContain('Plan');
      });

      it('defers specialists list when gated', () => {
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
          specialists: ['security-specialist', 'accessibility-specialist'],
        };

        const result = evaluateExecutionGate(input);

        expect(result.deferredSpecialists).toEqual([
          'security-specialist',
          'accessibility-specialist',
        ]);
      });

      it('omits deferredSpecialists when no specialists provided', () => {
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(true);
        expect(result.deferredSpecialists).toBeUndefined();
      });

      it('omits deferredSpecialists when specialists list is empty', () => {
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
          specialists: [],
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(true);
        expect(result.deferredSpecialists).toBeUndefined();
      });
    });

    // ------------------------------------------------------------------
    // Ungated scenarios
    // ------------------------------------------------------------------

    describe('ungated (clear / plan stage)', () => {
      it('does not gate when planReady=true', () => {
        const input: ExecutionGateInput = {
          clarification: clearClarification(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(false);
        expect(result.reason).toContain('clear');
        expect(result.unblockCondition).toBeUndefined();
        expect(result.deferredSpecialists).toBeUndefined();
      });

      it('does not gate when currentStage=plan', () => {
        const input: ExecutionGateInput = {
          clarification: clearClarification(),
          planningStage: planStage(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(false);
      });

      it('does not gate when budget is exhausted (planReady forced)', () => {
        const input: ExecutionGateInput = {
          clarification: budgetExhaustedClarification(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(false);
      });

      it('planReady=true overrides discover stage', () => {
        const input: ExecutionGateInput = {
          clarification: clearClarification(),
          planningStage: discoverStage(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        // planReady takes precedence over stage
        expect(result.gated).toBe(false);
      });

      it('planReady=true overrides design stage', () => {
        const input: ExecutionGateInput = {
          clarification: clearClarification(),
          planningStage: designStage(),
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(false);
      });
    });

    // ------------------------------------------------------------------
    // Priority / edge cases
    // ------------------------------------------------------------------

    describe('priority and edge cases', () => {
      it('clarificationNeeded takes priority over planningStage', () => {
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
          planningStage: planStage(), // even though stage says plan
          specialists: SAMPLE_SPECIALISTS,
        };

        const result = evaluateExecutionGate(input);

        // clarificationNeeded=true is checked before stage
        expect(result.gated).toBe(true);
        expect(result.reason).toContain('ambiguous');
      });

      it('works without planningStage metadata', () => {
        const input: ExecutionGateInput = {
          clarification: clearClarification(),
          // no planningStage
        };

        const result = evaluateExecutionGate(input);

        expect(result.gated).toBe(false);
      });

      it('does not mutate the input specialists array', () => {
        const specialists = ['a', 'b', 'c'];
        const input: ExecutionGateInput = {
          clarification: ambiguousClarification(),
          specialists,
        };

        const result = evaluateExecutionGate(input);

        expect(result.deferredSpecialists).toEqual(['a', 'b', 'c']);
        expect(result.deferredSpecialists).not.toBe(specialists); // different reference
      });
    });
  });
});
