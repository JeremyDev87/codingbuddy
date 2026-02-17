import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';
import { buildProgressBar } from './progress-bar.pure';
import { estimateDisplayWidth, truncateToDisplayWidth } from '../utils/display-width';

export function countActiveAgents(agents: AgentState[]): number {
  return agents.filter(a => a.status === 'running').length;
}

export function calculateOverallProgress(agents: AgentState[]): number {
  const running = agents.filter(a => a.status === 'running');
  if (running.length === 0) return 0;
  const sum = running.reduce((acc, a) => acc + a.progress, 0);
  return Math.round(sum / running.length);
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

const COMPACT_FILLED = '▓';
const COMPACT_EMPTY = '░';
const DIVIDER_CHAR = '─';
const SEPARATOR = ' │ ';

const PHASE_COLORS: Readonly<Record<Phase, string>> = {
  Parallel: 'cyan',
  Sequential: 'green',
  Waiting: 'gray',
};

export function getPhaseColor(phase: Phase): string {
  return PHASE_COLORS[phase];
}

export interface CompactStatusParts {
  leftDivider: string;
  mainContent: string;
  phaseContent: string;
  rightDivider: string;
}

export function buildCompactStatusParts(
  activeCount: number,
  skillsText: string,
  progress: number,
  phase: Phase,
  terminalWidth: number,
): CompactStatusParts {
  const safeWidth = Math.max(0, terminalWidth);
  const bar = buildProgressBar(progress, 7, COMPACT_FILLED, COMPACT_EMPTY);
  const mainContent =
    `🤖 ${activeCount} active${SEPARATOR}` +
    `🎹 ${skillsText}${SEPARATOR}` +
    `${bar} ${progress}%${SEPARATOR}`;
  const phaseContent = `⚡ ${phase}`;
  const content = mainContent + phaseContent;
  const contentWidth = estimateDisplayWidth(content);
  // -2 accounts for the spaces added in StatusBar.tsx between dividers and content:
  // `${leftDivider} ${mainContent}...${phaseContent} ${rightDivider}`
  // Note: divider length is a best-effort approximation — terminal emoji rendering
  // may differ from estimateDisplayWidth (some terminals render emojis at 1 or 2 columns).
  const remaining = safeWidth - contentWidth - 2;
  if (remaining <= 0) {
    const maxContent = safeWidth - 4;
    if (maxContent <= 0) {
      return {
        leftDivider: DIVIDER_CHAR.repeat(safeWidth),
        mainContent: '',
        phaseContent: '',
        rightDivider: '',
      };
    }
    const truncated = truncateToDisplayWidth(content, maxContent);
    return {
      leftDivider: DIVIDER_CHAR,
      mainContent: truncated,
      phaseContent: '',
      rightDivider: DIVIDER_CHAR,
    };
  }
  const leftLen = Math.floor(remaining / 2);
  const rightLen = remaining - leftLen;
  return {
    leftDivider: DIVIDER_CHAR.repeat(leftLen),
    mainContent,
    phaseContent,
    rightDivider: DIVIDER_CHAR.repeat(rightLen),
  };
}
