import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import { AgentCard } from './AgentCard';
import { CARD_WIDTH } from './agent-card.pure';
import {
  shouldRenderTree,
  buildVerticalConnector,
  buildBranchLine,
  buildDropLines,
} from './agent-tree.pure';

export interface AgentTreeProps {
  primaryAgent: AgentState | null;
  parallelAgents: AgentState[];
}

const PARALLEL_GAP = 1;

export function AgentTree({
  primaryAgent,
  parallelAgents,
}: AgentTreeProps): React.ReactElement | null {
  if (!shouldRenderTree(primaryAgent)) return null;

  const hasParallel = parallelAgents.length > 0;
  const showBranch = parallelAgents.length >= 2;

  return (
    <Box flexDirection="column" alignItems="center">
      <AgentCard agent={primaryAgent} />
      {hasParallel && <Text>{buildVerticalConnector()}</Text>}
      {showBranch && (
        <Text>
          {buildBranchLine(parallelAgents.length, CARD_WIDTH, PARALLEL_GAP)}
        </Text>
      )}
      {showBranch && (
        <Text>
          {buildDropLines(parallelAgents.length, CARD_WIDTH, PARALLEL_GAP)}
        </Text>
      )}
      {hasParallel && (
        <Box
          flexDirection="row"
          justifyContent="center"
          columnGap={PARALLEL_GAP}
        >
          {parallelAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </Box>
      )}
    </Box>
  );
}
