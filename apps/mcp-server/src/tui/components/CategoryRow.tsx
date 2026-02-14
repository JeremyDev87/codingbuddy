import React from 'react';
import { Text, useStdout } from 'ink';
import type { AgentMetadata, AgentCategory } from '../events';
import { buildCompactCategoryRow } from './category-row.pure';

export interface CategoryRowProps {
  category: AgentCategory;
  agents: AgentMetadata[];
  activeAgentIds: Set<string>;
  icon: string;
}

export function CategoryRow({
  category,
  agents,
  activeAgentIds,
  icon,
}: CategoryRowProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const agentNames = agents.map(a => a.name);
  const line = buildCompactCategoryRow(icon, category, agentNames, terminalWidth);
  const hasActive = agents.some(a => activeAgentIds.has(a.id));

  return <Text bold={hasActive} dimColor={!hasActive}>{line}</Text>;
}
