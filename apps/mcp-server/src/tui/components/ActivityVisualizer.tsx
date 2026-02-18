import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { ToolCallRecord } from '../dashboard-types';
import type { Mode } from '../types';
import {
  aggregateForBarChart,
  renderBarChart,
  renderLiveContext,
} from './activity-visualizer.pure';
import { BORDER_COLORS } from '../utils/theme';

export interface ActivityVisualizerProps {
  toolCalls: ToolCallRecord[];
  currentMode: Mode | null;
  width: number;
  height: number;
}

export function ActivityVisualizer({
  toolCalls,
  currentMode,
  width,
  height,
}: ActivityVisualizerProps): React.ReactElement {
  if (width <= 0 || height <= 0) {
    return <Box />;
  }

  const barChartWidth = Math.floor(width * 0.6);
  const livePanelWidth = width - barChartWidth;
  const contentHeight = Math.max(1, height - 2);

  const barChartData = useMemo(() => aggregateForBarChart(toolCalls), [toolCalls]);
  const barChartLines = useMemo(
    () => renderBarChart(barChartData, Math.max(1, barChartWidth - 2), contentHeight),
    [barChartData, barChartWidth, contentHeight],
  );
  const liveLines = useMemo(
    () => renderLiveContext(toolCalls, currentMode, Math.max(1, livePanelWidth - 2), contentHeight),
    [toolCalls, currentMode, livePanelWidth, contentHeight],
  );

  return (
    <Box flexDirection="row" width={width} height={height}>
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={barChartWidth}
        height={height}
      >
        {barChartLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={livePanelWidth}
        height={height}
      >
        {liveLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
