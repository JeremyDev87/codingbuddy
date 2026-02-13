import React from 'react';
import { Box, Text } from 'ink';
import type { AgentMetadata, AgentCategory } from '../events';
import { AgentMiniCard } from './AgentMiniCard';
import { buildCategoryLabel } from './category-row.pure';

export interface CategoryRowProps {
  category: AgentCategory;
  agents: AgentMetadata[];
  activeAgentIds: Set<string>;
  icon: string;
}

const LABEL_WIDTH = 20;

export function CategoryRow({
  category,
  agents,
  activeAgentIds,
  icon,
}: CategoryRowProps): React.ReactElement {
  const label = buildCategoryLabel(icon, category);

  return (
    <Box flexDirection="row" alignItems="center">
      <Box width={LABEL_WIDTH}>
        <Text bold>{label}</Text>
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {agents.map(agent => (
          <AgentMiniCard
            key={agent.id}
            agent={agent}
            isActive={activeAgentIds.has(agent.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
