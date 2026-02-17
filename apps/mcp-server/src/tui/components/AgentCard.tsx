import React from 'react';
import { Text } from 'ink';
import type { AgentState } from '../types';
import { getAgentIcon } from '../utils/icons';
import { getStatusColor } from '../utils/colors';
import { resolveProgress, buildStatusLabel, resolveIcon, buildInlineCard } from './agent-card.pure';

export interface AgentCardProps {
  agent: AgentState;
}

export function AgentCard({ agent }: AgentCardProps): React.ReactElement {
  const icon = getAgentIcon(agent.name);
  const displayIcon = resolveIcon(agent.status, icon);
  const progress = resolveProgress(agent.status, agent.progress);
  const statusLabel = buildStatusLabel(agent.status);
  const line = buildInlineCard(displayIcon, agent.name, progress, statusLabel);
  const color = getStatusColor(agent.status);

  return <Text color={color}>{line}</Text>;
}
