import type { Agent, AgentFilter } from '@/types';

/** Pure function - filters agents by category and search query */
export function filterAgents(agents: Agent[], filter: AgentFilter): Agent[] {
  return agents.filter(agent => {
    // Category filter
    if (filter.category && filter.category !== 'all') {
      if (agent.category !== filter.category) return false;
    }

    // Search query filter
    const query = filter.searchQuery?.trim().toLowerCase();
    if (query) {
      const matchesName = agent.name.toLowerCase().includes(query);
      const matchesDescription = agent.description
        .toLowerCase()
        .includes(query);
      const matchesTags = agent.tags.some(tag =>
        tag.toLowerCase().includes(query),
      );
      if (!matchesName && !matchesDescription && !matchesTags) return false;
    }

    return true;
  });
}
