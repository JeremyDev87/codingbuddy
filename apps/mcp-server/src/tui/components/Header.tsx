import React from 'react';
import { Box, Text } from 'ink';
import type { Mode } from '../types';
import { getModeColor } from '../utils/constants';
import { buildModeIndicator } from './header.pure';
import { useClock } from '../hooks/use-clock';

export interface HeaderProps {
  mode: Mode | null;
}

export function Header({ mode }: HeaderProps): React.ReactElement {
  const time = useClock();

  return (
    <Box>
      <Box flexGrow={1}>
        <Text bold>🤖 CODINGBUDDY</Text>
      </Box>
      <Box flexGrow={1} justifyContent="center">
        {mode && (
          <Text color={getModeColor(mode)}>{buildModeIndicator(mode)}</Text>
        )}
      </Box>
      <Box>
        <Text>{time}</Text>
      </Box>
    </Box>
  );
}
