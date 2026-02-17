import React from 'react';
import { Box } from 'ink';
import type { TuiEventBus } from './events';
import { useEventBus } from './hooks';
import { useAgentState } from './hooks/use-agent-state';
import { Header, AgentTree, AgentGrid, StatusBar } from './components';

export interface AppProps {
  eventBus?: TuiEventBus;
}

export function App({ eventBus }: AppProps): React.ReactElement {
  const { mode, agents, skills, allAgents } = useEventBus(eventBus);
  const { primaryAgent, activeAgents } = useAgentState(agents);
  const parallelAgents = activeAgents.filter(a => !a.isPrimary);
  const activeAgentIds = new Set(agents.filter(a => a.status === 'running').map(a => a.id));

  return (
    <Box flexDirection="column">
      <Header mode={mode} />
      <AgentTree primaryAgent={primaryAgent} parallelAgents={parallelAgents} />
      <AgentGrid allAgents={allAgents} activeAgentIds={activeAgentIds} />
      <StatusBar agents={agents} skills={skills} />
    </Box>
  );
}
