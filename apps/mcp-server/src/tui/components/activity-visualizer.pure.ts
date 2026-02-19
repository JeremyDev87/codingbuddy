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

function renderSubtree(
  nodeId: string,
  agents: Map<string, DashboardNode>,
  childrenOf: Map<string, string[]>,
  visited: Set<string>,
  prefix: string,
  isLast: boolean,
  lines: string[],
  height: number,
  width: number,
): void {
  if (lines.length >= height) return;
  if (visited.has(nodeId)) return; // cycle guard
  visited.add(nodeId);

  const node = agents.get(nodeId);
  if (!node) return;

  const connector = isLast ? '└' : '├';
  const icon = ACTIVITY_STATUS_ICONS[node.status] ?? '?';
  lines.push(truncateToDisplayWidth(`${prefix}${connector} ${icon} ${node.name}`, width));

  const childIds = (childrenOf.get(nodeId) ?? []).filter(id => agents.has(id));
  const nextPrefix = prefix + (isLast ? '   ' : '│  ');
  for (let i = 0; i < childIds.length; i++) {
    if (lines.length >= height) break;
    renderSubtree(
      childIds[i],
      agents,
      childrenOf,
      visited,
      nextPrefix,
      i === childIds.length - 1,
      lines,
      height,
      width,
    );
  }
}

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

  // Recursive subtree rendering with cycle detection
  const visited = new Set<string>([root.id]);
  const rootChildIds = (childrenOf.get(root.id) ?? []).filter(id => agents.has(id));
  const totalChildren = rootChildIds.length + activeSkills.length;

  for (let i = 0; i < rootChildIds.length; i++) {
    if (lines.length >= height) break;
    const isLast = i === totalChildren - 1;
    renderSubtree(rootChildIds[i], agents, childrenOf, visited, '  ', isLast, lines, height, width);
  }

  for (let i = 0; i < activeSkills.length; i++) {
    if (lines.length >= height) break;
    const isLast = rootChildIds.length + i === totalChildren - 1;
    const connector = isLast ? '└' : '├';
    lines.push(truncateToDisplayWidth(`  ${connector} ◉ ${activeSkills[i]} (skill)`, width));
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
