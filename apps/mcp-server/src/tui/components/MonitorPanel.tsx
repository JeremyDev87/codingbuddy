import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { EventLogEntry, DashboardNode, TaskItem } from '../dashboard-types';
import { renderEventLog, renderAgentTimeline, renderTaskProgress } from './monitor-panel.pure';

/**
 * Props for MonitorPanel component.
 *
 * Reference stability contract: `eventLog`, `agents`, and `tasks` must be
 * stable references across renders (e.g. stored in useState/useRef) for
 * useMemo to be effective. Passing new instances on every render defeats
 * memoization.
 */
export interface MonitorPanelProps {
  eventLog: EventLogEntry[];
  agents: Map<string, DashboardNode>;
  tasks: TaskItem[];
  width: number;
  height: number;
}

export function MonitorPanel({
  eventLog,
  agents,
  tasks,
  width,
  height,
}: MonitorPanelProps): React.ReactElement {
  if (width <= 0 || height <= 0) {
    return <Box />;
  }

  const logWidth = Math.floor(width / 3);
  const timelineWidth = Math.floor(width / 3);
  const taskWidth = width - logWidth - timelineWidth;

  // Border consumes 2 chars width + 2 lines height per sub-panel
  const logContentWidth = Math.max(1, logWidth - 2);
  const timelineContentWidth = Math.max(1, timelineWidth - 2);
  const taskContentWidth = Math.max(1, taskWidth - 2);
  const contentHeight = Math.max(1, height - 2);

  const logLines = useMemo(
    () => renderEventLog(eventLog, logContentWidth, contentHeight),
    [eventLog, logContentWidth, contentHeight],
  );
  const timelineLines = useMemo(
    () => renderAgentTimeline(agents, timelineContentWidth, contentHeight),
    [agents, timelineContentWidth, contentHeight],
  );
  const taskLines = useMemo(
    () => renderTaskProgress(tasks, taskContentWidth, contentHeight),
    [tasks, taskContentWidth, contentHeight],
  );

  return (
    <Box flexDirection="row" width={width} height={height}>
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        width={logWidth}
        height={height}
      >
        {logLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        width={timelineWidth}
        height={height}
      >
        {timelineLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
      <Box
        borderStyle="single"
        borderColor="gray"
        flexDirection="column"
        width={taskWidth}
        height={height}
      >
        {taskLines.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
