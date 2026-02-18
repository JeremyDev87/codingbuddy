import { describe, it, expect } from 'vitest';
import { parseAgentFromToolName } from './parse-agent';

describe('parseAgentFromToolName', () => {
  describe('get_agent_system_prompt', () => {
    it('should return agent info for get_agent_system_prompt', () => {
      const result = parseAgentFromToolName('get_agent_system_prompt', {
        agentName: 'security-specialist',
        context: { mode: 'EVAL' },
      });
      expect(result).toEqual({
        agentId: 'security-specialist',
        name: 'security-specialist',
        role: 'specialist',
        isPrimary: false,
      });
    });

    it('should return null when get_agent_system_prompt has no agentName', () => {
      expect(parseAgentFromToolName('get_agent_system_prompt', {})).toBeNull();
      expect(parseAgentFromToolName('get_agent_system_prompt', undefined)).toBeNull();
    });
  });

  describe('parse_mode', () => {
    it('should detect PLAN mode agent', () => {
      const result = parseAgentFromToolName('parse_mode', {
        prompt: 'PLAN design auth feature',
      });
      expect(result).toEqual({
        agentId: 'plan-mode',
        name: 'plan-mode',
        role: 'mode',
        isPrimary: false,
      });
    });

    it('should detect ACT mode agent', () => {
      const result = parseAgentFromToolName('parse_mode', {
        prompt: 'ACT implement feature',
      });
      expect(result).toEqual({
        agentId: 'act-mode',
        name: 'act-mode',
        role: 'mode',
        isPrimary: false,
      });
    });

    it('should detect EVAL mode agent', () => {
      const result = parseAgentFromToolName('parse_mode', {
        prompt: 'EVAL review code',
      });
      expect(result).toEqual({
        agentId: 'eval-mode',
        name: 'eval-mode',
        role: 'mode',
        isPrimary: false,
      });
    });

    it('should detect AUTO mode agent', () => {
      const result = parseAgentFromToolName('parse_mode', {
        prompt: 'AUTO build dashboard',
      });
      expect(result).toEqual({
        agentId: 'auto-mode',
        name: 'auto-mode',
        role: 'mode',
        isPrimary: false,
      });
    });

    it('should be case-insensitive for mode keywords', () => {
      const result = parseAgentFromToolName('parse_mode', {
        prompt: 'plan something',
      });
      expect(result).toEqual({
        agentId: 'plan-mode',
        name: 'plan-mode',
        role: 'mode',
        isPrimary: false,
      });
    });

    it('should return null if prompt does not start with a mode keyword', () => {
      expect(parseAgentFromToolName('parse_mode', { prompt: 'hello world' })).toBeNull();
    });

    it('should return null if prompt is missing', () => {
      expect(parseAgentFromToolName('parse_mode', {})).toBeNull();
      expect(parseAgentFromToolName('parse_mode', undefined)).toBeNull();
    });
  });

  describe('prepare_parallel_agents', () => {
    it('should return parallel-dispatch agent when specialists provided', () => {
      const result = parseAgentFromToolName('prepare_parallel_agents', {
        specialists: ['security-specialist', 'performance-specialist'],
        mode: 'EVAL',
      });
      expect(result).toEqual({
        agentId: 'parallel-dispatch',
        name: 'parallel-dispatch',
        role: 'orchestrator',
        isPrimary: false,
      });
    });

    it('should return null if specialists is empty', () => {
      expect(
        parseAgentFromToolName('prepare_parallel_agents', {
          specialists: [],
          mode: 'EVAL',
        }),
      ).toBeNull();
    });

    it('should return null if specialists is missing', () => {
      expect(parseAgentFromToolName('prepare_parallel_agents', { mode: 'EVAL' })).toBeNull();
    });
  });

  describe('unhandled tools', () => {
    it('should return null for completely unknown tool names', () => {
      expect(parseAgentFromToolName('unknown_tool', {})).toBeNull();
      expect(parseAgentFromToolName('some_other_tool', {})).toBeNull();
    });

    it('should return null for search_rules (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('search_rules', {})).toBeNull();
    });

    it('should return null for update_context (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('update_context', {})).toBeNull();
    });

    it('should return null for analyze_task (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('analyze_task', {})).toBeNull();
    });

    it('should return null for get_project_config (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('get_project_config', {})).toBeNull();
    });

    it('should return null for dispatch_agents (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('dispatch_agents', {})).toBeNull();
    });

    it('should return null for generate_checklist (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('generate_checklist', {})).toBeNull();
    });

    it('should return null for recommend_skills (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('recommend_skills', {})).toBeNull();
    });

    it('should return null for cleanup_context (MCP tool, not an agent)', () => {
      expect(parseAgentFromToolName('cleanup_context', {})).toBeNull();
    });
  });
});
