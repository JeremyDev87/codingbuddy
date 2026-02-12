import React from 'react';
import { Text, Box } from 'ink';
import type { TuiEventBus } from './events';

export interface AppProps {
  eventBus?: TuiEventBus;
}

// TODO(#next-phase): Subscribe to eventBus events for live agent status updates
export function App({ eventBus: _eventBus }: AppProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>Codingbuddy TUI Agent Monitor</Text>
    </Box>
  );
}
