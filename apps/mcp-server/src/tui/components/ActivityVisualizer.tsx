import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { DashboardNode, Edge } from '../dashboard-types';
import type { Mode } from '../types';
import { renderAgentTree, renderAgentStatusCard } from './activity-visualizer.pure';
import { BORDER_COLORS } from '../utils/theme';

export interface ActivityVisualizerProps {
  currentMode: Mode | null;
  focusedAgent: DashboardNode | null;
  agents: Map<string, DashboardNode>;
  edges: Edge[];
  activeSkills: string[];
  objectives: string[];
  width: number;
  height: number;
}

export function ActivityVisualizer({
  currentMode,
  focusedAgent,
  agents,
  edges,
  activeSkills,
  objectives,
  width,
  height,
}: ActivityVisualizerProps): React.ReactElement {
  const treeWidth = Math.floor(width * 0.6);
  const cardWidth = width - treeWidth;
  const contentHeight = Math.max(1, height - 2);

  const treeLines = useMemo(
    () => renderAgentTree(agents, edges, activeSkills, Math.max(1, treeWidth - 2), contentHeight),
    [agents, edges, activeSkills, treeWidth, contentHeight],
  );
  const cardLines = useMemo(
    () =>
      renderAgentStatusCard(
        focusedAgent,
        currentMode,
        objectives,
        activeSkills,
        Math.max(1, cardWidth - 2),
        contentHeight,
      ),
    [focusedAgent, currentMode, objectives, activeSkills, cardWidth, contentHeight],
  );

  if (width <= 0 || height <= 0) {
    return <Box />;
  }

  return (
    <Box flexDirection="row" width={width} height={height}>
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={treeWidth}
        height={height}
      >
        {treeLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={cardWidth}
        height={height}
      >
        {cardLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
