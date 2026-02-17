import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode, GlobalRunState } from '../dashboard-types';
import type { Mode } from '../../keyword/keyword.types';
import { formatHeaderBar, type HeaderBarData } from './header-bar.pure';

export interface HeaderBarProps {
  workspace: string;
  sessionId: string;
  currentMode: Mode | null;
  globalState: GlobalRunState;
  layoutMode: LayoutMode;
  width: number;
}

export function HeaderBar({
  workspace,
  sessionId,
  currentMode,
  globalState,
  layoutMode,
  width,
}: HeaderBarProps): React.ReactElement {
  const data: HeaderBarData = {
    workspace,
    sessionId,
    currentMode,
    globalState,
  };

  const output = formatHeaderBar(data, width, layoutMode);
  const lines = output.split('\n');

  return (
    <Box flexDirection="column" width={width}>
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
}
