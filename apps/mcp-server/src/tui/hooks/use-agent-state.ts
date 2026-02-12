import { useMemo } from 'react';
import type { AgentState } from '../types';

export interface AgentStateView {
  activeAgents: AgentState[];
  idleAgents: AgentState[];
  primaryAgent: AgentState | null;
}

export function useAgentState(agents: AgentState[]): AgentStateView {
  return useMemo(() => {
    const activeAgents = agents.filter(a => a.status === 'running');
    const idleAgents = agents.filter(a => a.status !== 'running');
    const primaryAgent = activeAgents.find(a => a.isPrimary) ?? null;
    return { activeAgents, idleAgents, primaryAgent };
  }, [agents]);
}
