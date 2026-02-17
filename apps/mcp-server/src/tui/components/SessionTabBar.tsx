import React from 'react';
import { Box, Text } from 'ink';
import type { LayoutMode } from '../dashboard-types';
import type { SessionTab } from './session-tab-bar.pure';
import { formatSessionTabs } from './session-tab-bar.pure';

export interface SessionTabBarProps {
  sessions: SessionTab[];
  width: number;
  layoutMode: LayoutMode;
}

export function SessionTabBar({
  sessions,
  width,
  layoutMode,
}: SessionTabBarProps): React.ReactElement | null {
  const formatted = formatSessionTabs(sessions, width, layoutMode);

  if (formatted === '') {
    return null;
  }

  return (
    <Box width={width} height={1}>
      <Text>{formatted}</Text>
    </Box>
  );
}
