import { describe, it, expect } from 'vitest';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events/types';
import {
  countActiveAgents,
  getActiveSkillName,
  computeOverallProgress,
  resolvePhase,
  buildPhaseLabel,
} from './status-bar.pure';

describe('tui/components/status-bar.pure', () => {
  const makeAgent = (overrides: Partial<AgentState> = {}): AgentState => ({
    id: 'a1',
    name: 'test-agent',
    role: 'specialist',
    status: 'running',
    progress: 50,
    isPrimary: false,
    ...overrides,
  });

  describe('countActiveAgents', () => {
    it('should return 0 for empty array', () => {
      expect(countActiveAgents([])).toBe(0);
    });

    it('should count only running agents', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running' }),
        makeAgent({ id: 'a2', status: 'completed' }),
        makeAgent({ id: 'a3', status: 'running' }),
        makeAgent({ id: 'a4', status: 'idle' }),
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

  describe('getActiveSkillName', () => {
    it('should return null for empty array', () => {
      expect(getActiveSkillName([])).toBeNull();
    });

    it('should return the last skill name', () => {
      const skills: SkillRecommendedEvent[] = [
        { skillName: 'brainstorming', reason: 'r1' },
        { skillName: 'tdd', reason: 'r2' },
      ];
      expect(getActiveSkillName(skills)).toBe('tdd');
    });

    it('should return the only skill name when single', () => {
      const skills: SkillRecommendedEvent[] = [
        { skillName: 'debugging', reason: 'r1' },
      ];
      expect(getActiveSkillName(skills)).toBe('debugging');
    });
  });

  describe('computeOverallProgress', () => {
    it('should return 0 for empty array', () => {
      expect(computeOverallProgress([])).toBe(0);
    });

    it('should average progress of running agents only', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running', progress: 40 }),
        makeAgent({ id: 'a2', status: 'running', progress: 80 }),
        makeAgent({ id: 'a3', status: 'completed', progress: 100 }),
      ];
      expect(computeOverallProgress(agents)).toBe(60);
    });

    it('should return 0 when no agents are running', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'completed', progress: 100 }),
      ];
      expect(computeOverallProgress(agents)).toBe(0);
    });

    it('should round to nearest integer', () => {
      const agents: AgentState[] = [
        makeAgent({ id: 'a1', status: 'running', progress: 33 }),
        makeAgent({ id: 'a2', status: 'running', progress: 33 }),
        makeAgent({ id: 'a3', status: 'running', progress: 34 }),
      ];
      expect(computeOverallProgress(agents)).toBe(33);
    });
  });

  describe('resolvePhase', () => {
    it('should return Waiting when no active agents', () => {
      expect(resolvePhase(0, false)).toBe('Waiting');
    });

    it('should return Parallel when isParallelPhase is true and agents active', () => {
      expect(resolvePhase(3, true)).toBe('Parallel');
    });

    it('should return Sequential when not parallel and agents active', () => {
      expect(resolvePhase(1, false)).toBe('Sequential');
    });

    it('should return Waiting when isParallelPhase true but no active agents', () => {
      expect(resolvePhase(0, true)).toBe('Waiting');
    });
  });

  describe('buildPhaseLabel', () => {
    it('should return "Parallel Phase" for Parallel', () => {
      expect(buildPhaseLabel('Parallel')).toBe('Parallel Phase');
    });

    it('should return "Sequential" for Sequential', () => {
      expect(buildPhaseLabel('Sequential')).toBe('Sequential');
    });

    it('should return "Waiting" for Waiting', () => {
      expect(buildPhaseLabel('Waiting')).toBe('Waiting');
    });
  });
});
