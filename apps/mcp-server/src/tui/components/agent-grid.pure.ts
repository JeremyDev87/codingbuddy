import type { AgentMetadata, AgentCategory } from '../events';

/** Responsive column breakpoints per issue #344 */
const BREAKPOINTS = [
  { maxWidth: 80, columns: 1, cardWidth: -1 },
  { maxWidth: 100, columns: 2, cardWidth: 45 },
  { maxWidth: 120, columns: 3, cardWidth: 35 },
  { maxWidth: Infinity, columns: 5, cardWidth: 22 },
] as const;

export function groupByCategory(
  agents: AgentMetadata[],
): Map<AgentCategory, AgentMetadata[]> {
  const map = new Map<AgentCategory, AgentMetadata[]>();
  for (const agent of agents) {
    const list = map.get(agent.category);
    if (list) {
      list.push(agent);
    } else {
      map.set(agent.category, [agent]);
    }
  }
  return map;
}

export function sortCategoriesByActivity(
  categories: AgentCategory[],
  activeAgentIds: Set<string>,
  agentsByCategory: Map<AgentCategory, AgentMetadata[]>,
): AgentCategory[] {
  const hasActive = (cat: AgentCategory): boolean => {
    const agents = agentsByCategory.get(cat) ?? [];
    return agents.some(a => activeAgentIds.has(a.id));
  };

  const active: AgentCategory[] = [];
  const inactive: AgentCategory[] = [];

  for (const cat of categories) {
    if (hasActive(cat)) {
      active.push(cat);
    } else {
      inactive.push(cat);
    }
  }

  return [...active, ...inactive];
}

export function computeColumns(terminalWidth: number): number {
  for (const bp of BREAKPOINTS) {
    if (terminalWidth < bp.maxWidth) {
      return bp.columns;
    }
  }
  return 5;
}

export function computeCardWidth(
  terminalWidth: number,
  columns: number,
): number {
  if (columns === 1) return terminalWidth;
  const bp = BREAKPOINTS.find(b => b.columns === columns);
  return bp?.cardWidth ?? 22;
}
