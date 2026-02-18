import type { DashboardNode, DashboardNodeStatus, Edge } from '../dashboard-types';
import type { Mode } from '../types';
import { estimateDisplayWidth, truncateToDisplayWidth } from '../utils/display-width';

/**
 * Activity panel status icons per the TUI spec:
 * ● running · ○ done/idle · ⏸ blocked · ! error
 *
 * Intentionally differs from STATUS_ICONS (where done → '✓') to match
 * the issue #551 design: done and idle both render as '○'.
 */
const ACTIVITY_STATUS_ICONS: Readonly<Record<DashboardNodeStatus, string>> = Object.freeze({
  running: '●',
  idle: '○',
  blocked: '⏸',
  error: '!',
  done: '○',
});

type AgentChild = { type: 'agent'; node: DashboardNode };
type SkillChild = { type: 'skill'; name: string };
type TreeChild = AgentChild | SkillChild;

export function renderAgentTree(
  agents: Map<string, DashboardNode>,
  edges: Edge[],
  activeSkills: string[],
  width: number,
  height: number,
): string[] {
  if (height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('📊 Activity', width)];
  if (height <= 1) return lines;

  if (agents.size === 0) {
    lines.push(truncateToDisplayWidth('  No agents', width));
    return lines.slice(0, height);
  }

  // Build adjacency map (parent → children)
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!childrenOf.has(edge.from)) childrenOf.set(edge.from, []);
    childrenOf.get(edge.from)!.push(edge.to);
  }

  // Find root: primary agent or first in map
  const root = [...agents.values()].find(a => a.isPrimary) ?? [...agents.values()][0];

  // Render root node
  const rootIcon = ACTIVITY_STATUS_ICONS[root.status] ?? '?';
  lines.push(truncateToDisplayWidth(`${rootIcon} ${root.name}`, width));

  // Collect children: edge-based agents + activeSkills as leaf nodes
  const childIds = childrenOf.get(root.id) ?? [];
  const agentChildren: TreeChild[] = childIds
    .filter(id => agents.has(id))
    .map(id => ({ type: 'agent', node: agents.get(id)! }));
  const skillChildren: TreeChild[] = activeSkills.map(s => ({ type: 'skill', name: s }));
  const allChildren: TreeChild[] = [...agentChildren, ...skillChildren];

  for (let i = 0; i < allChildren.length; i++) {
    if (lines.length >= height) break;
    const isLast = i === allChildren.length - 1;
    const connector = isLast ? '└' : '├';
    const item = allChildren[i];

    if (item.type === 'agent') {
      const icon = ACTIVITY_STATUS_ICONS[item.node.status] ?? '?';
      lines.push(truncateToDisplayWidth(`  ${connector} ${icon} ${item.node.name}`, width));
    } else {
      lines.push(truncateToDisplayWidth(`  ${connector} ◉ ${item.name} (skill)`, width));
    }
  }

  return lines.slice(0, height);
}

/**
 * Word-wraps text to fit within the given display width.
 * Uses estimateDisplayWidth to correctly handle unicode/emoji characters.
 */
function wordWrap(text: string, width: number): string[] {
  if (width <= 0) return [];
  const words = text.split(' ');
  const result: string[] = [];
  let current = '';
  let currentWidth = 0;
  for (const word of words) {
    const wordWidth = estimateDisplayWidth(word);
    if (current.length === 0) {
      current = wordWidth <= width ? word : truncateToDisplayWidth(word, width);
      currentWidth = estimateDisplayWidth(current);
    } else if (currentWidth + 1 + wordWidth <= width) {
      current += ' ' + word;
      currentWidth += 1 + wordWidth;
    } else {
      result.push(current);
      current = wordWidth <= width ? word : truncateToDisplayWidth(word, width);
      currentWidth = estimateDisplayWidth(current);
    }
  }
  if (current.length > 0) result.push(current);
  return result;
}

export function renderAgentStatusCard(
  focusedAgent: DashboardNode | null,
  currentMode: Mode | null,
  objectives: string[],
  activeSkills: string[],
  width: number,
  height: number,
): string[] {
  if (height <= 0 || width <= 0) return [];

  const lines: string[] = [truncateToDisplayWidth('💬 Live', width)];
  if (height <= 1) return lines;

  lines.push(truncateToDisplayWidth(`⟫ Mode: ${currentMode ?? '—'}`, width));

  if (!focusedAgent) {
    lines.push(truncateToDisplayWidth('  No agent', width));
    return lines.slice(0, height);
  }

  lines.push(truncateToDisplayWidth(`🤖 ${focusedAgent.name}`, width));
  const statusIcon = ACTIVITY_STATUS_ICONS[focusedAgent.status] ?? '?';
  lines.push(truncateToDisplayWidth(`   ${statusIcon} ${focusedAgent.status}`, width));

  const separator = truncateToDisplayWidth('─'.repeat(width), width);
  if (lines.length < height) lines.push(separator);

  // Show first objective only; track whether any content was added
  let objectivesAdded = false;
  if (objectives.length > 0 && lines.length < height) {
    const wrapped = wordWrap(objectives[0], width);
    for (const wline of wrapped) {
      if (lines.length >= height) break;
      lines.push(wline);
      objectivesAdded = true;
    }
  }

  // Only add second separator if objectives were actually shown
  if (objectivesAdded && lines.length < height) lines.push(separator);

  for (const skill of activeSkills) {
    if (lines.length >= height) break;
    lines.push(truncateToDisplayWidth(`⚙ ${skill}`, width));
  }

  return lines.slice(0, height);
}
