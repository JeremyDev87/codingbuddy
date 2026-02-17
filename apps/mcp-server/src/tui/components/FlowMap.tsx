import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, DashboardNode, Edge } from '../dashboard-types';
import { renderFlowMap, renderFlowMapSimplified, renderFlowMapCompact } from './flow-map.pure';

export interface FlowMapProps {
  agents: Map<string, DashboardNode>;
  edges: Edge[];
  layoutMode: LayoutMode;
  width: number;
  height: number;
}

export function FlowMap({
  agents,
  edges,
  layoutMode,
  width,
  height,
}: FlowMapProps): React.ReactElement {
  let content: string;

  switch (layoutMode) {
    case 'wide':
      content = renderFlowMap(agents, edges, width, height);
      break;
    case 'medium':
      content = renderFlowMapSimplified(agents, width, height);
      break;
    case 'narrow':
      content = renderFlowMapCompact(agents);
      break;
  }

  return (
    <Box flexDirection="column">
      <Text bold>FLOW MAP</Text>
      <Text>{content}</Text>
    </Box>
  );
}
