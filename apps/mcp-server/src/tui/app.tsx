import React from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import { useEventBus } from './hooks';
import { Header } from './components';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  const { mode } = useEventBus(eventBus);

  return (
    <Box flexDirection="column">
      <Header mode={mode} />
    </Box>
  );
}
