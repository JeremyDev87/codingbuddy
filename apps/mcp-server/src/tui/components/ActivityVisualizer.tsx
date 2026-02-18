import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { DashboardNode, EventLogEntry } from '../dashboard-types';
import { renderAgentRoster, renderAgentEvents } from './activity-visualizer.pure';
import { BORDER_COLORS } from '../utils/theme';

export interface ActivityVisualizerProps {
  agents: Map<string, DashboardNode>;
  eventLog: EventLogEntry[];
  width: number;
  height: number;
}

export function ActivityVisualizer({
  agents,
  eventLog,
  width,
  height,
}: ActivityVisualizerProps): React.ReactElement {
  const rosterWidth = Math.floor(width * 0.6);
  const eventsWidth = width - rosterWidth;
  const contentHeight = Math.max(1, height - 2);

  const rosterLines = useMemo(
    () => renderAgentRoster(agents, Math.max(1, rosterWidth - 2), contentHeight),
    [agents, rosterWidth, contentHeight],
  );
  const eventLines = useMemo(
    () => renderAgentEvents(eventLog, Math.max(1, eventsWidth - 2), contentHeight),
    [eventLog, eventsWidth, contentHeight],
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
        width={rosterWidth}
        height={height}
      >
        {rosterLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor={BORDER_COLORS.panel}
        flexDirection="column"
        width={eventsWidth}
        height={height}
      >
        {eventLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
