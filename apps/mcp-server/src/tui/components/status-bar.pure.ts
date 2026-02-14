import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';
import { buildProgressBar } from './progress-bar.pure';

const STATUS_FILLED = '▲';
const STATUS_EMPTY = '▱';

export function countActiveAgents(agents: AgentState[]): number {
  return agents.filter(a => a.status === 'running').length;
}

export function calculateOverallProgress(agents: AgentState[]): number {
  const running = agents.filter(a => a.status === 'running');
  if (running.length === 0) return 0;
  const sum = running.reduce((acc, a) => acc + a.progress, 0);
  return Math.round(sum / running.length);
}

export function buildStatusProgressBar(value: number, width: number): string {
  return buildProgressBar(value, width, STATUS_FILLED, STATUS_EMPTY);
}

export type Phase = 'Parallel' | 'Sequential' | 'Waiting';

export function determinePhase(agents: AgentState[]): Phase {
  const runningCount = countActiveAgents(agents);
  if (runningCount >= 2) return 'Parallel';
  if (runningCount === 1) return 'Sequential';
  return 'Waiting';
}

export function buildSkillsDisplay(skills: SkillRecommendedEvent[]): string {
  if (skills.length === 0) return '-';
  return skills.map(s => s.skillName).join(', ');
}
