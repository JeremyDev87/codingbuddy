import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import { getAgentIcon } from '../utils/icons';
import { ProgressBar } from './ProgressBar';
import {
  resolveProgress,
  abbreviateName,
  buildStatusLabel,
  getCardBorderColor,
  resolveIcon,
  CARD_WIDTH,
} from './agent-card.pure';

const NAME_MAX_LENGTH = 7;
const BAR_WIDTH = 7;

export interface AgentCardProps {
  agent: AgentState;
}

export function AgentCard({ agent }: AgentCardProps): React.ReactElement {
  const icon = getAgentIcon(agent.name);
  const displayIcon = resolveIcon(agent.status, icon);
  const displayName = abbreviateName(agent.name, NAME_MAX_LENGTH);
  const progress = resolveProgress(agent.status, agent.progress);
  const borderColor = getCardBorderColor(agent.status);
  const statusLabel = buildStatusLabel(agent.status);

  return (
    <Box
      borderStyle="round"
      borderColor={borderColor}
      flexDirection="column"
      width={CARD_WIDTH}
      paddingX={0}
    >
      <Text>
        {displayIcon} {displayName}
      </Text>
      <ProgressBar value={progress} width={BAR_WIDTH} color={borderColor} />
      <Text color={borderColor}>{statusLabel}</Text>
    </Box>
  );
}
