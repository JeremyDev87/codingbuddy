import { describe, it, expect } from 'vitest';
import { parseAgentFromToolName } from './parse-agent';

describe('parseAgentFromToolName', () => {
  it('should return agent info for get_agent_system_prompt', () => {
    const result = parseAgentFromToolName('get_agent_system_prompt', {
      agentName: 'security-specialist',
      context: { mode: 'EVAL' },
    });
    expect(result).toEqual({
      agentId: 'security-specialist',
      name: 'security-specialist',
      role: 'specialist',
      isPrimary: true,
    });
  });

  it('should return null for non-agent tool names', () => {
    expect(parseAgentFromToolName('search_rules', {})).toBeNull();
    expect(
      parseAgentFromToolName('parse_mode', { prompt: 'PLAN test' }),
    ).toBeNull();
    expect(parseAgentFromToolName('get_project_config', {})).toBeNull();
  });

  it('should return null when get_agent_system_prompt has no agentName', () => {
    expect(parseAgentFromToolName('get_agent_system_prompt', {})).toBeNull();
    expect(
      parseAgentFromToolName('get_agent_system_prompt', undefined),
    ).toBeNull();
  });

  it('should return null for get_agent_details (read-only, not activation)', () => {
    expect(
      parseAgentFromToolName('get_agent_details', { agentName: 'test' }),
    ).toBeNull();
  });

  it('should return null for prepare_parallel_agents (separate event path)', () => {
    expect(
      parseAgentFromToolName('prepare_parallel_agents', {
        specialists: ['security', 'performance'],
      }),
    ).toBeNull();
  });
});
