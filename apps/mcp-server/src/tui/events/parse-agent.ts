import type { AgentActivatedEvent } from './types';

export function parseAgentFromToolName(
  toolName: string,
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  if (toolName !== 'get_agent_system_prompt') {
    return null;
  }

  const agentName = typeof args?.agentName === 'string' ? args.agentName : null;
  if (!agentName) {
    return null;
  }

  return {
    agentId: agentName,
    name: agentName,
    role: 'specialist',
    isPrimary: true,
  };
}
