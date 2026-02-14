import { describe, it, expect } from 'vitest';
import {
  countActiveAgents,
  calculateOverallProgress,
  buildStatusProgressBar,
  determinePhase,
  buildSkillsDisplay,
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

  describe('buildStatusProgressBar', () => {
    it('should render a full bar for value 100', () => {
      expect(buildStatusProgressBar(100, 10)).toBe('▲▲▲▲▲▲▲▲▲▲');
    });

    it('should render an empty bar for value 0', () => {
      expect(buildStatusProgressBar(0, 10)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    it('should render proportional fill for value 50', () => {
      expect(buildStatusProgressBar(50, 10)).toBe('▲▲▲▲▲▱▱▱▱▱');
    });

    it('should render proportional fill for value 70', () => {
      expect(buildStatusProgressBar(70, 10)).toBe('▲▲▲▲▲▲▲▱▱▱');
    });

    it('should return empty string for width 0', () => {
      expect(buildStatusProgressBar(50, 0)).toBe('');
    });

    it('should clamp values below 0', () => {
      expect(buildStatusProgressBar(-10, 10)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    it('should clamp values above 100', () => {
      expect(buildStatusProgressBar(150, 10)).toBe('▲▲▲▲▲▲▲▲▲▲');
    });

    it('should handle NaN value', () => {
      expect(buildStatusProgressBar(NaN, 10)).toBe('▱▱▱▱▱▱▱▱▱▱');
    });

    it('should treat negative width as 0', () => {
      expect(buildStatusProgressBar(50, -5)).toBe('');
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
});
