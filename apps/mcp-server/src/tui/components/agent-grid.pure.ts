import type { AgentMetadata, AgentCategory } from '../events';

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
