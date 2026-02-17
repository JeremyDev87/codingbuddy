import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, StageStats } from '../dashboard-types';
import type { Mode } from '../../keyword/keyword.types';
import { formatStageHealthBar } from './stage-health.pure';

export interface StageHealthBarProps {
  stageHealth: Record<Mode, StageStats>;
  bottlenecks: string[];
  tokenCount: number;
  layoutMode: LayoutMode;
  width: number;
}

export function StageHealthBar({
  stageHealth,
  bottlenecks,
  tokenCount,
  layoutMode,
  width,
}: StageHealthBarProps): React.ReactElement {
  const output = formatStageHealthBar(stageHealth, bottlenecks, tokenCount, width, layoutMode);
  const lines = output.split('\n');

  return (
    <Box flexDirection="column" width={width}>
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
}
