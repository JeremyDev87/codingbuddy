import React from 'react';
import { Text, Box } from 'ink';
import type { TuiEventBus } from './events';
import { useEventBus, useAgentState } from './hooks';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  const { agents, mode } = useEventBus(eventBus);
  const { activeAgents, primaryAgent } = useAgentState(agents);

  return (
    <Box flexDirection="column">
      <Text bold>Codingbuddy TUI Agent Monitor</Text>
      {mode && <Text>Mode: {mode}</Text>}
      {primaryAgent && <Text>Primary: {primaryAgent.name}</Text>}
      {activeAgents.length > 0 && (
        <Text>Active: {activeAgents.map(a => a.name).join(', ')}</Text>
      )}
    </Box>
  );
}
