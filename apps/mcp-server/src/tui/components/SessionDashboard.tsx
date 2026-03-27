import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type {
  ToolCallRecord,
  TddStep,
  DashboardNode,
  ModeTransition,
  FileChangeStats,
} from '../dashboard-types';
import type { LayoutMode } from '../dashboard-types';
import { BORDER_COLORS } from '../utils/theme';
import {
  computeToolDistribution,
  computeAgentTimeline,
  computeTddCycleStats,
  renderSessionDashboard,
  formatDurationMs,
} from './session-dashboard.pure';

export interface SessionDashboardProps {
  toolCalls: ToolCallRecord[];
  agents: Map<string, DashboardNode>;
  tddSteps: TddStep[];
  modeTransitions: ModeTransition[];
  fileChanges: FileChangeStats;
  sessionStartedAt: number;
  totalToolCalls: number;
  totalAgents: number;
  width: number;
  layoutMode: LayoutMode;
  now?: number;
}

export function SessionDashboard({
  toolCalls,
  agents,
  tddSteps,
  modeTransitions,
  fileChanges,
  sessionStartedAt,
  totalToolCalls,
  totalAgents,
  width,
  layoutMode,
  now: nowProp,
}: SessionDashboardProps): React.ReactElement {
  const now = nowProp ?? Date.now();

  const lines = useMemo(() => {
    const toolDistribution = computeToolDistribution(toolCalls);
    const agentTimeline = computeAgentTimeline(agents, now);
    const tddStats = computeTddCycleStats(tddSteps);
    const sessionDuration = formatDurationMs(now - sessionStartedAt);
    const innerWidth = Math.max(20, width - 4); // account for border

    return renderSessionDashboard({
      toolDistribution,
      agentTimeline,
      tddStats,
      fileChanges,
      modeTransitions,
      sessionStartedAt,
      sessionDuration,
      totalToolCalls,
      totalAgents,
      width: innerWidth,
      layoutMode,
    });
  }, [
    toolCalls,
    agents,
    tddSteps,
    modeTransitions,
    fileChanges,
    sessionStartedAt,
    totalToolCalls,
    totalAgents,
    width,
    layoutMode,
    now,
  ]);

  return (
    <Box
      borderStyle="single"
      borderColor={BORDER_COLORS.panel}
      width={width}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
    >
      {lines.map((line, i) => {
        // Apply colors to section dividers
        if (line.startsWith('──')) {
          return (
            <Text key={i} color="magenta">
              {line}
            </Text>
          );
        }
        // Color status icons
        if (line.includes('●')) {
          return (
            <Text key={i} color="green">
              {line}
            </Text>
          );
        }
        if (line.includes('!')) {
          return (
            <Text key={i} color="red">
              {line}
            </Text>
          );
        }
        // Dim empty-state lines
        if (line.includes('(no ')) {
          return (
            <Text key={i} dimColor>
              {line}
            </Text>
          );
        }
        return <Text key={i}>{line}</Text>;
      })}
    </Box>
  );
}
