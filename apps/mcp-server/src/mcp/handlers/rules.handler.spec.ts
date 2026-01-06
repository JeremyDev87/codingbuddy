import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RulesHandler } from './rules.handler';
import { RulesService } from '../../rules/rules.service';
import type { AgentProfile } from '../../rules/rules.types';

describe('RulesHandler', () => {
  let handler: RulesHandler;
  let mockRulesService: RulesService;

  const mockAgent: AgentProfile = {
    name: 'test-agent',
    role: {
      title: 'Test Agent',
      expertise: ['testing'],
    },
    description: 'A test agent',
  };

  beforeEach(() => {
    mockRulesService = {
      searchRules: vi
        .fn()
        .mockResolvedValue([
          { file: 'test.md', content: 'test rule', relevance: 1 },
        ]),
      getAgent: vi.fn().mockResolvedValue(mockAgent),
    } as unknown as RulesService;

    handler = new RulesHandler(mockRulesService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('search_rules', () => {
      it('should search rules with valid query', async () => {
        const result = await handler.handle('search_rules', {
          query: 'test query',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockRulesService.searchRules).toHaveBeenCalledWith('test query');
      });

      it('should return error for missing query', async () => {
        const result = await handler.handle('search_rules', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Missing required parameter: query'),
        });
      });

      it('should return error for non-string query', async () => {
        const result = await handler.handle('search_rules', { query: 123 });

        expect(result?.isError).toBe(true);
      });
    });

    describe('get_agent_details', () => {
      it('should get agent details with valid name', async () => {
        const result = await handler.handle('get_agent_details', {
          agentName: 'test-agent',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockRulesService.getAgent).toHaveBeenCalledWith('test-agent');
      });

      it('should return error for missing agentName', async () => {
        const result = await handler.handle('get_agent_details', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining(
            'Missing required parameter: agentName',
          ),
        });
      });

      it('should return error when agent not found', async () => {
        mockRulesService.getAgent = vi
          .fn()
          .mockRejectedValue(new Error('Not found'));

        const result = await handler.handle('get_agent_details', {
          agentName: 'nonexistent',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining("Agent 'nonexistent' not found"),
        });
      });

      it('should include resolvedModel in response', async () => {
        const result = await handler.handle('get_agent_details', {
          agentName: 'test-agent',
        });

        expect(result?.isError).toBeFalsy();
        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.resolvedModel).toBeDefined();
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions for search_rules and get_agent_details', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.name)).toEqual([
        'search_rules',
        'get_agent_details',
      ]);
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();

      const searchRules = definitions.find(d => d.name === 'search_rules');
      expect(searchRules?.inputSchema.required).toContain('query');

      const getAgentDetails = definitions.find(
        d => d.name === 'get_agent_details',
      );
      expect(getAgentDetails?.inputSchema.required).toContain('agentName');
    });
  });
});
