import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { ToolCallRecord } from '../dashboard-types';
import { aggregateToolCalls, renderHeatmap, renderBubbles } from './activity-visualizer.pure';

export interface ActivityVisualizerProps {
  toolCalls: ToolCallRecord[];
  width: number;
  height: number;
}

export function ActivityVisualizer({
  toolCalls,
  width,
  height,
}: ActivityVisualizerProps): React.ReactElement {
  if (width <= 0 || height <= 0) {
    return <Box />;
  }

  const heatmapWidth = Math.floor(width * 0.6);
  const bubblesWidth = width - heatmapWidth;
  const contentHeight = Math.max(1, height - 2);

  const heatmapData = useMemo(() => aggregateToolCalls(toolCalls), [toolCalls]);
  const heatmapLines = useMemo(
    () => renderHeatmap(heatmapData, Math.max(1, heatmapWidth - 2), contentHeight),
    [heatmapData, heatmapWidth, contentHeight],
  );
  const bubbleLines = useMemo(
    () => renderBubbles(toolCalls, Math.max(1, bubblesWidth - 2), contentHeight),
    [toolCalls, bubblesWidth, contentHeight],
  );

  return (
    <Box flexDirection="row" width={width} height={height}>
      <Box
        borderStyle="single"
        borderColor="gray"
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
        borderColor="gray"
        flexDirection="column"
        width={bubblesWidth}
        height={height}
      >
        {bubbleLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
