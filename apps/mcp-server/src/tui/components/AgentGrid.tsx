import React, { useMemo } from 'react';
import { Box } from 'ink';
import type { AgentMetadata } from '../events';
import { AGENT_ICONS } from '../events';
import { CategoryRow } from './CategoryRow';
import { groupByCategory, sortCategoriesByActivity } from './agent-grid.pure';

export interface AgentGridProps {
  allAgents: AgentMetadata[];
  activeAgentIds: Set<string>;
  terminalWidth: number;
}

export function AgentGrid({
  allAgents,
  activeAgentIds,
  terminalWidth: _terminalWidth,
}: AgentGridProps): React.ReactElement | null {
  const { sortedCategories, agentsByCategory } = useMemo(() => {
    const grouped = groupByCategory(allAgents);
    const categories = Array.from(grouped.keys());
    const sorted = sortCategoriesByActivity(
      categories,
      activeAgentIds,
      grouped,
    );
    return { sortedCategories: sorted, agentsByCategory: grouped };
  }, [allAgents, activeAgentIds]);

  if (allAgents.length === 0) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      {sortedCategories.map(category => (
        <CategoryRow
          key={category}
          category={category}
          agents={agentsByCategory.get(category) ?? []}
          activeAgentIds={activeAgentIds}
          icon={AGENT_ICONS[category]}
        />
      ))}
    </Box>
  );
}
