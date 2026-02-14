import { describe, it, expect } from 'vitest';
import {
  countActiveAgents,
  calculateOverallProgress,
  determinePhase,
  buildSkillsDisplay,
  buildCompactStatusParts,
  getPhaseColor,
} from './status-bar.pure';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';

function makeAgent(overrides: Partial<AgentState> = {}): AgentState {
  return {
    id: 'a1',
    name: 'test',
    role: 'tester',
    status: 'idle',
    progress: 0,
    isPrimary: false,
    ...overrides,
  };
}

describe('tui/components/status-bar.pure', () => {
  describe('countActiveAgents', () => {
    it('should return 0 for empty array', () => {
      expect(countActiveAgents([])).toBe(0);
    });

    it('should count only running agents', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'idle' }),
        makeAgent({ id: 'a3', status: 'running' }),
        makeAgent({ id: 'a4', status: 'completed' }),
      ];
      expect(countActiveAgents(agents)).toBe(2);
    });

    it('should return 0 when no agents are running', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'completed' }),
        makeAgent({ id: 'a2', status: 'failed' }),
      ];
      expect(countActiveAgents(agents)).toBe(0);
    });
  });

  describe('calculateOverallProgress', () => {
    it('should return 0 for empty array', () => {
      expect(calculateOverallProgress([])).toBe(0);
    });

    it('should return 0 when no agents are running', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'completed', progress: 100 }),
      ];
      expect(calculateOverallProgress(agents)).toBe(0);
    });

    it('should average progress of running agents only', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running', progress: 60 }),
        makeAgent({ id: 'a2', status: 'running', progress: 80 }),
        makeAgent({ id: 'a3', status: 'completed', progress: 100 }),
      ];
      expect(calculateOverallProgress(agents)).toBe(70);
    });

    it('should round to nearest integer', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running', progress: 33 }),
        makeAgent({ id: 'a2', status: 'running', progress: 67 }),
      ];
      expect(calculateOverallProgress(agents)).toBe(50);
    });
  });

  describe('determinePhase', () => {
    it('should return Waiting when no agents are running', () => {
      expect(determinePhase([])).toBe('Waiting');
    });

    it('should return Sequential when exactly 1 agent is running', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'idle' }),
      ];
      expect(determinePhase(agents)).toBe('Sequential');
    });

    it('should return Parallel when 2 or more agents are running', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'running' }),
      ];
      expect(determinePhase(agents)).toBe('Parallel');
    });

    it('should return Parallel for 3 running agents', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'running' }),
        makeAgent({ id: 'a3', status: 'running' }),
      ];
      expect(determinePhase(agents)).toBe('Parallel');
    });

    it('should only count running agents for phase determination', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'completed' }),
        makeAgent({ id: 'a3', status: 'failed' }),
      ];
      expect(determinePhase(agents)).toBe('Sequential');
    });
  });

  describe('buildSkillsDisplay', () => {
    it('should return "-" for empty skills array', () => {
      expect(buildSkillsDisplay([])).toBe('-');
    });

    it('should return single skill name', () => {
      const skills: SkillRecommendedEvent[] = [
        { skillName: 'brainstorming', reason: 'test' },
      ];
      expect(buildSkillsDisplay(skills)).toBe('brainstorming');
    });

    it('should join multiple skills with comma', () => {
      const skills: SkillRecommendedEvent[] = [
        { skillName: 'brainstorming', reason: 'r1' },
        { skillName: 'tdd', reason: 'r2' },
      ];
      expect(buildSkillsDisplay(skills)).toBe('brainstorming, tdd');
    });

    it('should display all skills in order', () => {
      const skills: SkillRecommendedEvent[] = [
        { skillName: 'brainstorming', reason: 'r1' },
        { skillName: 'tdd', reason: 'r2' },
        { skillName: 'debugging', reason: 'r3' },
      ];
      expect(buildSkillsDisplay(skills)).toBe('brainstorming, tdd, debugging');
    });
  });

  describe('getPhaseColor', () => {
    it('should return cyan for Parallel', () => {
      expect(getPhaseColor('Parallel')).toBe('cyan');
    });

    it('should return green for Sequential', () => {
      expect(getPhaseColor('Sequential')).toBe('green');
    });

    it('should return gray for Waiting', () => {
      expect(getPhaseColor('Waiting')).toBe('gray');
    });
  });

  describe('buildCompactStatusParts', () => {
    it('should return separate mainContent and phaseContent', () => {
      const parts = buildCompactStatusParts(2, 'tdd', 50, 'Parallel', 80);
      expect(parts.mainContent).toContain('🤖 2 active');
      expect(parts.mainContent).toContain('🎹 tdd');
      expect(parts.mainContent).toContain('50%');
      expect(parts.phaseContent).toBe('⚡ Parallel');
      expect(parts.leftDivider).toMatch(/^─+$/);
      expect(parts.rightDivider).toMatch(/^─+$/);
    });

    it('should return empty phaseContent when truncated for narrow terminal', () => {
      const parts = buildCompactStatusParts(1, 'skill', 50, 'Sequential', 40);
      expect(parts.phaseContent).toBe('');
    });

    it('should not overshoot terminal width when remaining space is small', () => {
      // Use a width that leaves only a few columns for dividers
      const parts = buildCompactStatusParts(1, '-', 0, 'Waiting', 60);
      const totalWidth =
        parts.leftDivider.length +
        1 + // space after left divider
        parts.mainContent.length +
        parts.phaseContent.length +
        1 + // space before right divider
        parts.rightDivider.length;
      expect(totalWidth).toBeLessThanOrEqual(60);
    });
  });
});
