import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import { getAgentIcon } from '../utils/icons';
import {
  resolveProgress,
  buildStatusLabel,
  resolveIcon,
} from './agent-card.pure';
import { buildCompactTree, type CompactAgentLine } from './agent-tree.pure';

export interface AgentTreeProps {
  primaryAgent: AgentState | null;
  parallelAgents: AgentState[];
}

function toCompactLine(agent: AgentState): CompactAgentLine {
  const icon = resolveIcon(agent.status, getAgentIcon(agent.name));
  return {
    icon,
    name: agent.name,
    progress: resolveProgress(agent.status, agent.progress),
    statusLabel: buildStatusLabel(agent.status),
  };
}

export function AgentTree({
  primaryAgent,
  parallelAgents,
}: AgentTreeProps): React.ReactElement | null {
  if (primaryAgent === null) return null;

  const lines = buildCompactTree(
    toCompactLine(primaryAgent),
    parallelAgents.map(toCompactLine),
  );

  return (
    <Box flexDirection="column">
      {lines.map(line => (
        <Text key={line.key}>{line.content}</Text>
      ))}
    </Box>
  );
}
