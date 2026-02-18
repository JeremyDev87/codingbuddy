import type { AgentActivatedEvent } from './types';

const MODE_KEYWORD_TO_AGENT: Record<string, string> = {
  PLAN: 'plan-mode',
  ACT: 'act-mode',
  EVAL: 'eval-mode',
  AUTO: 'auto-mode',
};

export function parseAgentFromToolName(
  toolName: string,
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  if (toolName === 'get_agent_system_prompt') {
    return parseGetAgentSystemPrompt(args);
  }

  if (toolName === 'parse_mode') {
    return parseParseMode(args);
  }

  if (toolName === 'prepare_parallel_agents') {
    return parseParallelAgents(args);
  }

  return null;
}

function parseGetAgentSystemPrompt(
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  const agentName = typeof args?.agentName === 'string' ? args.agentName : null;
  if (!agentName) return null;

  return {
    agentId: agentName,
    name: agentName,
    role: 'specialist',
    isPrimary: false,
  };
}

function parseParseMode(args: Record<string, unknown> | undefined): AgentActivatedEvent | null {
  const prompt = typeof args?.prompt === 'string' ? args.prompt : null;
  if (!prompt) return null;

  const firstWord = prompt.trimStart().split(/\s+/)[0]?.toUpperCase();
  const agentId = firstWord ? MODE_KEYWORD_TO_AGENT[firstWord] : undefined;
  if (!agentId) return null;

  return {
    agentId,
    name: agentId,
    role: 'mode',
    isPrimary: false,
  };
}

function parseParallelAgents(
  args: Record<string, unknown> | undefined,
): AgentActivatedEvent | null {
  const specialists = args?.specialists;
  if (!Array.isArray(specialists) || specialists.length === 0) return null;

  return {
    agentId: 'parallel-dispatch',
    name: 'parallel-dispatch',
    role: 'orchestrator',
    isPrimary: false,
  };
}
