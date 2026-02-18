import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { ToolCallRecord } from '../dashboard-types';
import type { Mode } from '../types';
import { aggregateToolCalls, renderHeatmap, renderLiveContext } from './activity-visualizer.pure';
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

  const heatmapWidth = Math.floor(width * 0.6);
  const livePanelWidth = width - heatmapWidth;
  const contentHeight = Math.max(1, height - 2);

  const heatmapData = useMemo(() => aggregateToolCalls(toolCalls), [toolCalls]);
  const heatmapLines = useMemo(
    () => renderHeatmap(heatmapData, Math.max(1, heatmapWidth - 2), contentHeight),
    [heatmapData, heatmapWidth, contentHeight],
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
        width={heatmapWidth}
        height={height}
      >
        {heatmapLines.map((line, i) => (
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
