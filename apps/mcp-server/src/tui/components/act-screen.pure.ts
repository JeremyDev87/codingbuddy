/**
 * ACT Mode Screen — Pure rendering functions.
 *
 * Renders TDD phase progress bar (RED/GREEN/REFACTOR),
 * step-by-step agent status, and overall progress for the ACT mode TUI screen.
 */
import type { TddPhase, TddStep, DashboardNode } from '../dashboard-types';

export interface ActScreenLine {
  type: 'header' | 'phase-bar' | 'step' | 'progress' | 'empty';
  text: string;
}

const PHASE_ICONS: Record<TddPhase, string> = {
  RED: '🔴',
  GREEN: '🟢',
  REFACTOR: '🔧',
};

const PHASE_COLORS: Record<TddPhase, string> = {
  RED: 'red',
  GREEN: 'green',
  REFACTOR: 'yellow',
};

export { PHASE_COLORS };

/**
 * Render the TDD phase indicator bar.
 * Shows RED → GREEN → REFACTOR with the current phase highlighted.
 */
export function renderTddPhaseBar(currentPhase: TddPhase | null, _width: number): ActScreenLine[] {
  const lines: ActScreenLine[] = [];
  lines.push({ type: 'header', text: '🧪 TDD Cycle' });

  const phases: TddPhase[] = ['RED', 'GREEN', 'REFACTOR'];
  const parts = phases.map(phase => {
    const icon = PHASE_ICONS[phase];
    const active = phase === currentPhase;
    const marker = active ? '►' : ' ';
    return `${marker}${icon} ${phase}`;
  });

  lines.push({ type: 'phase-bar', text: `  ${parts.join('  →  ')}` });
  return lines;
}

/**
 * Render a progress bar string of given width.
 */
export function renderProgressBar(percent: number, barWidth: number): string {
  const filled = Math.round((percent / 100) * barWidth);
  const empty = barWidth - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
}

/**
 * Render TDD steps with their status.
 */
export function renderTddSteps(steps: readonly TddStep[], width: number): ActScreenLine[] {
  const lines: ActScreenLine[] = [];
  lines.push({ type: 'header', text: '📝 Steps' });

  if (steps.length === 0) {
    lines.push({ type: 'empty', text: '  (no steps yet)' });
    return lines;
  }

  for (const step of steps) {
    const statusIcon = getStepStatusIcon(step.status);
    const phaseIcon = PHASE_ICONS[step.phase];
    const agent = step.agentId ? ` [${step.agentId}]` : '';
    const text = `  ${statusIcon} ${phaseIcon} ${step.label}${agent}`;
    lines.push({ type: 'step', text: text.slice(0, width) });
  }

  return lines;
}

function getStepStatusIcon(status: TddStep['status']): string {
  switch (status) {
    case 'pending':
      return '○';
    case 'active':
      return '●';
    case 'done':
      return '✓';
    case 'failed':
      return '✗';
  }
}

/**
 * Render overall progress based on agent and step completion.
 */
export function renderOverallProgress(
  agents: ReadonlyMap<string, DashboardNode>,
  steps: readonly TddStep[],
  width: number,
): ActScreenLine[] {
  const lines: ActScreenLine[] = [];

  // Calculate step-based progress
  const totalSteps = steps.length;
  const doneSteps = steps.filter(s => s.status === 'done').length;
  const stepPercent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  // Calculate agent-based progress
  const agentArr = Array.from(agents.values()).filter(a => a.status !== 'idle' || a.isParallel);
  const agentPercent =
    agentArr.length > 0
      ? Math.round(agentArr.reduce((sum, a) => sum + a.progress, 0) / agentArr.length)
      : 0;

  const overallPercent = totalSteps > 0 ? stepPercent : agentPercent;
  const barWidth = Math.max(10, Math.min(40, width - 20));

  lines.push({ type: 'header', text: '📊 Overall Progress' });
  lines.push({ type: 'progress', text: `  ${renderProgressBar(overallPercent, barWidth)}` });
  if (totalSteps > 0) {
    lines.push({ type: 'progress', text: `  Steps: ${doneSteps}/${totalSteps}` });
  }

  return lines;
}

/**
 * Render the complete ACT mode screen.
 */
export function renderActScreen(
  currentPhase: TddPhase | null,
  steps: readonly TddStep[],
  agents: ReadonlyMap<string, DashboardNode>,
  width: number,
): ActScreenLine[] {
  const lines: ActScreenLine[] = [];
  lines.push(...renderTddPhaseBar(currentPhase, width));
  lines.push({ type: 'empty', text: '' });
  lines.push(...renderTddSteps(steps, width));
  lines.push({ type: 'empty', text: '' });
  lines.push(...renderOverallProgress(agents, steps, width));
  return lines;
}
