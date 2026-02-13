import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events/types';

export type Phase = 'Parallel' | 'Sequential' | 'Waiting';

export function countActiveAgents(agents: AgentState[]): number {
  return agents.filter(a => a.status === 'running').length;
}

export function getActiveSkillName(
  skills: SkillRecommendedEvent[],
): string | null {
  if (skills.length === 0) return null;
  return skills[skills.length - 1].skillName;
}

export function computeOverallProgress(agents: AgentState[]): number {
  const running = agents.filter(a => a.status === 'running');
  if (running.length === 0) return 0;
  const sum = running.reduce((acc, a) => acc + a.progress, 0);
  return Math.round(sum / running.length);
}

export function resolvePhase(
  activeCount: number,
  isParallelPhase: boolean,
): Phase {
  if (activeCount === 0) return 'Waiting';
  return isParallelPhase ? 'Parallel' : 'Sequential';
}

export function buildPhaseLabel(phase: Phase): string {
  if (phase === 'Parallel') return 'Parallel Phase';
  return phase;
}
