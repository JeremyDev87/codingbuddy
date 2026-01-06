import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentHandler } from './agent.handler';
import { AgentService } from '../../agent/agent.service';

describe('AgentHandler', () => {
  let handler: AgentHandler;
  let mockAgentService: AgentService;

  const mockSystemPromptResult = {
    agentName: 'security-specialist',
    systemPrompt: 'You are a security specialist...',
  };

  const mockParallelAgentsResult = {
    agents: [{ name: 'security-specialist', prompt: 'test prompt' }],
    count: 1,
  };

  beforeEach(() => {
    mockAgentService = {
      getAgentSystemPrompt: vi.fn().mockResolvedValue(mockSystemPromptResult),
      prepareParallelAgents: vi
        .fn()
        .mockResolvedValue(mockParallelAgentsResult),
    } as unknown as AgentService;

    handler = new AgentHandler(mockAgentService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('get_agent_system_prompt', () => {
      it('should get system prompt with valid args', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: { mode: 'EVAL' },
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'security-specialist',
          expect.objectContaining({ mode: 'EVAL' }),
        );
      });

      it('should return error for missing agentName', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          context: { mode: 'EVAL' },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining(
            'Missing required parameter: agentName',
          ),
        });
      });

      it('should return error for non-string agentName', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 123,
          context: { mode: 'EVAL' },
        });

        expect(result?.isError).toBe(true);
      });

      it('should return error for missing context.mode', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: {},
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining(
            'Missing required parameter: context.mode',
          ),
        });
      });

      it('should return error for invalid mode', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: { mode: 'INVALID' },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Invalid mode'),
        });
      });

      it('should pass targetFiles and taskDescription', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: {
            mode: 'EVAL',
            targetFiles: ['src/app.ts'],
            taskDescription: 'Review security',
          },
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'security-specialist',
          expect.objectContaining({
            mode: 'EVAL',
            targetFiles: ['src/app.ts'],
            taskDescription: 'Review security',
          }),
        );
      });

      it('should return error when service fails', async () => {
        mockAgentService.getAgentSystemPrompt = vi
          .fn()
          .mockRejectedValue(new Error('Service error'));

        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: { mode: 'EVAL' },
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Service error'),
        });
      });
    });

    describe('prepare_parallel_agents', () => {
      it('should prepare parallel agents with valid args', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist', 'performance-specialist'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist', 'performance-specialist'],
          undefined,
          undefined,
        );
      });

      it('should return error for missing mode', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Missing required parameter: mode'),
        });
      });

      it('should return error for invalid mode', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'INVALID',
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Invalid mode'),
        });
      });

      it('should return error for missing specialists', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining(
            'Missing required parameter: specialists',
          ),
        });
      });

      it('should return error for empty specialists array', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: [],
        });

        expect(result?.isError).toBe(true);
      });

      it('should pass optional parameters', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
          targetFiles: ['src/app.ts'],
          sharedContext: 'Review code',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          ['src/app.ts'],
          'Review code',
        );
      });

      it('should return error when service fails', async () => {
        mockAgentService.prepareParallelAgents = vi
          .fn()
          .mockRejectedValue(new Error('Service error'));

        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Service error'),
        });
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map(d => d.name)).toEqual([
        'get_agent_system_prompt',
        'prepare_parallel_agents',
      ]);
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();

      const getAgentSystemPrompt = definitions.find(
        d => d.name === 'get_agent_system_prompt',
      );
      expect(getAgentSystemPrompt?.inputSchema.required).toEqual([
        'agentName',
        'context',
      ]);

      const prepareParallelAgents = definitions.find(
        d => d.name === 'prepare_parallel_agents',
      );
      expect(prepareParallelAgents?.inputSchema.required).toEqual([
        'mode',
        'specialists',
      ]);
    });
  });
});
