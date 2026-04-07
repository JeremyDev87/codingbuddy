import { resolvePlanningContract, PLANNING_CONTRACT } from './planning-contract';

describe('planning-contract', () => {
  describe('PLANNING_CONTRACT', () => {
    it('should be a readonly array with expected length', () => {
      expect(PLANNING_CONTRACT).toHaveLength(5);
    });

    it('should contain question-first guidance rules', () => {
      expect(PLANNING_CONTRACT[0]).toContain('clarifying question');
      expect(PLANNING_CONTRACT[1]).toContain('Wait for user confirmation');
    });
  });

  describe('resolvePlanningContract', () => {
    it('should return contract for PLAN mode with technical-planner', () => {
      const result = resolvePlanningContract('PLAN', 'technical-planner');
      expect(result).toBe(PLANNING_CONTRACT);
    });

    it('should return contract for PLAN mode with solution-architect', () => {
      const result = resolvePlanningContract('PLAN', 'solution-architect');
      expect(result).toBe(PLANNING_CONTRACT);
    });

    it('should return contract for PLAN mode with plan-mode', () => {
      const result = resolvePlanningContract('PLAN', 'plan-mode');
      expect(result).toBe(PLANNING_CONTRACT);
    });

    it('should return contract for AUTO mode with auto-mode', () => {
      const result = resolvePlanningContract('AUTO', 'auto-mode');
      expect(result).toBe(PLANNING_CONTRACT);
    });

    it('should return contract for AUTO mode with technical-planner', () => {
      const result = resolvePlanningContract('AUTO', 'technical-planner');
      expect(result).toBe(PLANNING_CONTRACT);
    });

    it('should return undefined for ACT mode', () => {
      const result = resolvePlanningContract('ACT', 'technical-planner');
      expect(result).toBeUndefined();
    });

    it('should return undefined for EVAL mode', () => {
      const result = resolvePlanningContract('EVAL', 'technical-planner');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-planning agents in PLAN mode', () => {
      const result = resolvePlanningContract('PLAN', 'code-reviewer');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-planning agents in AUTO mode', () => {
      const result = resolvePlanningContract('AUTO', 'frontend-developer');
      expect(result).toBeUndefined();
    });

    it('should handle case-insensitive mode matching', () => {
      expect(resolvePlanningContract('plan', 'technical-planner')).toBe(PLANNING_CONTRACT);
      expect(resolvePlanningContract('Plan', 'technical-planner')).toBe(PLANNING_CONTRACT);
      expect(resolvePlanningContract('auto', 'auto-mode')).toBe(PLANNING_CONTRACT);
    });

    it('should return undefined when agentId is undefined', () => {
      const result = resolvePlanningContract('PLAN');
      expect(result).toBeUndefined();
    });

    it('should return undefined when agentId is undefined in AUTO mode', () => {
      const result = resolvePlanningContract('AUTO');
      expect(result).toBeUndefined();
    });
  });
});
