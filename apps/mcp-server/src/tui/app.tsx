import React from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import { useEventBus } from './hooks';
import { useAgentState } from './hooks/use-agent-state';
import { Header, AgentTree } from './components';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  const { mode, agents } = useEventBus(eventBus);
  const { primaryAgent, activeAgents } = useAgentState(agents);
  const parallelAgents = activeAgents.filter(a => !a.isPrimary);

  return (
    <Box flexDirection="column">
      <Header mode={mode} />
      <AgentTree primaryAgent={primaryAgent} parallelAgents={parallelAgents} />
    </Box>
  );
}
