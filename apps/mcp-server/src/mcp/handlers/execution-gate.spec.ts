import { describe, it, expect } from 'vitest';
import {
  evaluateExecutionGate,
  suppressDispatchWhileGated,
  type ExecutionGateInput,
  type ExecutionGate,
  type GatedResponseFields,
} from './execution-gate';
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

  // ====================================================================
  // suppressDispatchWhileGated (#1422)
  // ====================================================================

  describe('suppressDispatchWhileGated', () => {
    const sampleDispatchReady = {
      primaryAgent: {
        name: 'software-engineer',
        displayName: 'Software Engineer',
        description: 'Software Engineer - PLAN mode',
        dispatchParams: {
          subagent_type: 'general-purpose' as const,
          prompt: 'You are a software engineer...',
          description: 'Software Engineer - PLAN mode',
        },
      },
      parallelAgents: [
        {
          name: 'security-specialist',
          displayName: 'Security Specialist',
          description: 'Security specialist',
          dispatchParams: {
            subagent_type: 'general-purpose' as const,
            prompt: 'You are a security specialist...',
            description: 'Security specialist',
            run_in_background: true as const,
          },
        },
        {
          name: 'performance-specialist',
          displayName: 'Performance Specialist',
          description: 'Performance specialist',
          dispatchParams: {
            subagent_type: 'general-purpose' as const,
            prompt: 'You are a performance specialist...',
            description: 'Performance specialist',
            run_in_background: true as const,
          },
        },
      ],
    };

    const sampleParallelRecommendation = {
      specialists: ['security-specialist', 'performance-specialist'],
      hint: 'Dispatch specialists for review',
      dispatch: 'auto' as const,
      suggestedStack: 'review',
      stackBased: true,
    };

    // ------------------------------------------------------------------
    // Gated: suppression
    // ------------------------------------------------------------------

    describe('when gated=true', () => {
      const gatedGate: ExecutionGate = {
        gated: true,
        reason: 'Request is ambiguous',
        unblockCondition: 'Resolve clarification',
        deferredSpecialists: ['security-specialist', 'performance-specialist'],
      };

      it('removes dispatchReady entirely', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.dispatchReady).toBeUndefined();
      });

      it('downgrades parallelAgentsRecommendation.dispatch to "deferred"', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: { ...sampleParallelRecommendation, dispatch: 'auto' },
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.parallelAgentsRecommendation?.dispatch).toBe('deferred');
      });

      it('preserves specialist names in parallelAgentsRecommendation for transparency', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.parallelAgentsRecommendation?.specialists).toEqual([
          'security-specialist',
          'performance-specialist',
        ]);
      });

      it('preserves hint in parallelAgentsRecommendation', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.parallelAgentsRecommendation?.hint).toBe('Dispatch specialists for review');
      });

      it('removes executionPlan when gated', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
          executionPlan: { strategy: 'subagent', layers: [] },
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.executionPlan).toBeUndefined();
      });

      it('handles missing dispatchReady gracefully', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.dispatchReady).toBeUndefined();
        expect(result.parallelAgentsRecommendation?.dispatch).toBe('deferred');
      });

      it('handles missing parallelAgentsRecommendation gracefully', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.dispatchReady).toBeUndefined();
        expect(result.parallelAgentsRecommendation).toBeUndefined();
      });

      it('handles all fields missing gracefully', () => {
        const fields: GatedResponseFields = {};

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.dispatchReady).toBeUndefined();
        expect(result.parallelAgentsRecommendation).toBeUndefined();
        expect(result.executionPlan).toBeUndefined();
      });

      it('does not mutate the original fields object', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
          parallelAgentsRecommendation: { ...sampleParallelRecommendation },
        };
        const originalDispatch = fields.parallelAgentsRecommendation?.dispatch;

        suppressDispatchWhileGated(gatedGate, fields);

        // Original should be untouched
        expect(fields.dispatchReady).toBe(sampleDispatchReady);
        expect(fields.parallelAgentsRecommendation?.dispatch).toBe(originalDispatch);
      });

      it('downgrades "recommend" dispatch to "deferred"', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: { ...sampleParallelRecommendation, dispatch: 'recommend' },
        };

        const result = suppressDispatchWhileGated(gatedGate, fields);

        expect(result.parallelAgentsRecommendation?.dispatch).toBe('deferred');
      });
    });

    // ------------------------------------------------------------------
    // Ungated: pass-through
    // ------------------------------------------------------------------

    describe('when gated=false', () => {
      const ungatedGate: ExecutionGate = {
        gated: false,
        reason: 'Request is clear',
      };

      it('preserves dispatchReady unchanged', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(ungatedGate, fields);

        expect(result.dispatchReady).toBe(sampleDispatchReady);
      });

      it('preserves parallelAgentsRecommendation unchanged', () => {
        const fields: GatedResponseFields = {
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(ungatedGate, fields);

        expect(result.parallelAgentsRecommendation).toBe(sampleParallelRecommendation);
      });

      it('preserves executionPlan unchanged', () => {
        const executionPlan = { strategy: 'subagent', layers: [] };
        const fields: GatedResponseFields = {
          executionPlan,
        };

        const result = suppressDispatchWhileGated(ungatedGate, fields);

        expect(result.executionPlan).toBe(executionPlan);
      });
    });

    // ------------------------------------------------------------------
    // Edge: undefined gate
    // ------------------------------------------------------------------

    describe('when gate is undefined', () => {
      it('passes through all fields unchanged', () => {
        const fields: GatedResponseFields = {
          dispatchReady: sampleDispatchReady,
          parallelAgentsRecommendation: sampleParallelRecommendation,
        };

        const result = suppressDispatchWhileGated(undefined, fields);

        expect(result.dispatchReady).toBe(sampleDispatchReady);
        expect(result.parallelAgentsRecommendation).toBe(sampleParallelRecommendation);
      });
    });
  });
});
