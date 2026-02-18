import React from 'react';
import { Box, Text } from 'ink';
import type { StageStats } from '../dashboard-types';
import type { Mode } from '../types';
import { getModeColor, BORDER_COLORS } from '../utils/theme';
import { formatCount } from './stage-health.pure';

export interface StageHealthBarProps {
  stageHealth: Record<Mode, StageStats>;
  bottlenecks: string[];
  toolCount: number;
  agentCount: number;
  skillCount: number;
  width: number;
}

type DisplayableStage = 'PLAN' | 'ACT' | 'EVAL';

function StageStatDisplay({
  mode,
  stats,
}: {
  mode: DisplayableStage;
  stats: StageStats;
}): React.ReactElement {
  const color = getModeColor(mode);
  const parts: React.ReactElement[] = [];

  if (stats.running > 0)
    parts.push(
      <Text key="r" color="green">
        {' '}
        ● {stats.running} running
      </Text>,
    );
  if (stats.blocked > 0)
    parts.push(
      <Text key="b" color="yellow">
        {' '}
        ⏸ {stats.blocked} blocked
      </Text>,
    );
  if (stats.waiting > 0)
    parts.push(
      <Text key="w" dimColor>
        {' '}
        ○ {stats.waiting} waiting
      </Text>,
    );
  if (stats.done > 0)
    parts.push(
      <Text key="d" color="green">
        {' '}
        ✓ {stats.done}
      </Text>,
    );
  if (stats.error > 0)
    parts.push(
      <Text key="e" color="red" bold>
        {' '}
        ! {stats.error} err
      </Text>,
    );
  if (parts.length === 0)
    parts.push(
      <Text key="idle" dimColor>
        {' '}
        idle
      </Text>,
    );

  return (
    <Box>
      <Text color={color} bold>
        {mode}:
      </Text>
      {parts}
    </Box>
  );
}

export function StageHealthBar({
  stageHealth,
  bottlenecks,
  toolCount,
  agentCount,
  skillCount,
  width,
}: StageHealthBarProps): React.ReactElement {
  return (
    <Box
      borderStyle="double"
      borderColor={BORDER_COLORS.panel}
      width={width}
      flexDirection="column"
    >
      <Box>
        <Box gap={2}>
          {(['PLAN', 'ACT', 'EVAL'] as const).map(mode => (
            <StageStatDisplay key={mode} mode={mode} stats={stageHealth[mode]} />
          ))}
        </Box>
        <Box flexGrow={1} />
        <Box gap={2}>
          {bottlenecks.length > 0 && (
            <Text color="red" bold>
              ⚡ Bottlenecks: {bottlenecks.join(' / ')}
            </Text>
          )}
          <Text dimColor>🤖 {formatCount(agentCount)}</Text>
          <Text dimColor>⚙ {formatCount(skillCount)}</Text>
          <Text dimColor>🔧 {formatCount(toolCount)}</Text>
        </Box>
      </Box>
    </Box>
  );
}
