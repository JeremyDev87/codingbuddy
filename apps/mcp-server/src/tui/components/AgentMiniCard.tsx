import React from 'react';
import { Box, Text } from 'ink';
import type { AgentMetadata } from '../events';
import {
  getMiniCardBorderColor,
  getMiniCardTextDimmed,
  abbreviateMiniName,
} from './agent-mini-card.pure';

export interface AgentMiniCardProps {
  agent: AgentMetadata;
  isActive: boolean;
}

export function AgentMiniCard({
  agent,
  isActive,
}: AgentMiniCardProps): React.ReactElement {
  const borderColor = getMiniCardBorderColor(isActive);
  const dimmed = getMiniCardTextDimmed(isActive);
  const displayName = abbreviateMiniName(agent.name);

  return (
    <Box borderStyle="single" borderColor={borderColor} paddingX={0}>
      <Text dimColor={dimmed}>
        {agent.icon} {displayName}
      </Text>
    </Box>
  );
}
