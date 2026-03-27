/**
 * PLAN Mode Screen — Pure rendering functions.
 *
 * Renders agent summoning list (character + status), discussion display,
 * and consensus result for the PLAN mode TUI screen.
 */
import type { DashboardNode } from '../dashboard-types';
import type { DiscussionRound } from '../../collaboration/types';
import { calculateConsensus, STANCE_ICONS } from '../../collaboration/types';

export interface PlanScreenLine {
  type: 'header' | 'agent' | 'discussion' | 'consensus' | 'empty';
  text: string;
}

/**
 * Render the agent summoning list for PLAN mode.
 * Shows each agent with status indicator and role.
 */
export function renderAgentSummonList(
  agents: ReadonlyMap<string, DashboardNode>,
  width: number,
): PlanScreenLine[] {
  const lines: PlanScreenLine[] = [];
  lines.push({ type: 'header', text: '📋 Summoned Agents' });

  if (agents.size === 0) {
    lines.push({ type: 'empty', text: '  (no agents summoned)' });
    return lines;
  }

  for (const agent of agents.values()) {
    const statusIcon = getAgentStatusIcon(agent.status);
    const primaryTag = agent.isPrimary ? ' ★' : '';
    const text = `  ${statusIcon} ${agent.name}${primaryTag} [${agent.status}]`;
    lines.push({ type: 'agent', text: text.slice(0, width) });
  }

  return lines;
}

function getAgentStatusIcon(status: DashboardNode['status']): string {
  switch (status) {
    case 'running':
      return '🔄';
    case 'done':
      return '✅';
    case 'error':
      return '❌';
    case 'idle':
      return '⏳';
    case 'blocked':
      return '🚫';
  }
}

/**
 * Render consensus summary from discussion rounds.
 */
export function renderConsensusSummary(rounds: readonly DiscussionRound[]): PlanScreenLine[] {
  if (rounds.length === 0) {
    return [{ type: 'empty', text: '  (no discussion yet)' }];
  }

  const lastRound = rounds[rounds.length - 1];
  const consensus = calculateConsensus(lastRound.opinions);
  const lines: PlanScreenLine[] = [];

  lines.push({ type: 'header', text: `🗳️ Consensus (Round ${lastRound.roundNumber})` });
  lines.push({
    type: 'consensus',
    text: `  ${STANCE_ICONS.approve} ${consensus.approveCount}  ${STANCE_ICONS.concern} ${consensus.concernCount}  ${STANCE_ICONS.reject} ${consensus.rejectCount}`,
  });
  lines.push({
    type: 'consensus',
    text: consensus.reached ? '  ✅ Consensus reached' : '  ⏳ Consensus not reached',
  });

  return lines;
}

/**
 * Render the complete PLAN mode screen.
 */
export function renderPlanScreen(
  agents: ReadonlyMap<string, DashboardNode>,
  rounds: readonly DiscussionRound[],
  width: number,
): PlanScreenLine[] {
  const lines: PlanScreenLine[] = [];
  lines.push(...renderAgentSummonList(agents, width));
  lines.push({ type: 'empty', text: '' });
  lines.push(...renderConsensusSummary(rounds));
  return lines;
}
