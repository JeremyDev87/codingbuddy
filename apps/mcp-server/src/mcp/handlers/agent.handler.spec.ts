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
      prepareParallelAgents: vi.fn().mockResolvedValue(mockParallelAgentsResult),
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
          text: expect.stringContaining('Missing required parameter: agentName'),
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
          text: expect.stringContaining('Missing required parameter: context.mode'),
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

      it('should return error when context is a string', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: 'not-an-object',
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('context (must be an object'),
        });
      });

      it('should return error when context is an array', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: ['EVAL'],
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('context (must be an object'),
        });
      });

      it('should return error when context is a number', async () => {
        const result = await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: 42,
        });
        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('context (must be an object'),
        });
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
          text: expect.stringContaining('Missing required parameter: specialists'),
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
          undefined,
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

      it('should pass verbosity parameter', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
          verbosity: 'minimal',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          undefined,
          undefined,
          'minimal',
        );
      });

      it('should fallback to standard for invalid verbosity', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
          verbosity: 'INVALID_LEVEL',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          undefined,
          undefined,
          'standard',
        );
      });

      it('should pass undefined verbosity when not provided', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          undefined,
          undefined,
          undefined,
        );
      });

      it('should pass full verbosity parameter', async () => {
        const result = await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
          targetFiles: ['src/app.ts'],
          sharedContext: 'Review code',
          verbosity: 'full',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          ['src/app.ts'],
          'Review code',
          'full',
        );
      });
    });

    describe('dispatch_agents', () => {
      const mockDispatchResult = {
        primaryAgent: {
          name: 'security-specialist',
          displayName: 'Security Specialist',
          description: 'Security review',
          dispatchParams: {
            subagent_type: 'general-purpose' as const,
            prompt: 'You are a security specialist...',
            description: 'Security review',
          },
        },
        executionHint: 'Use Task tool...',
      };

      beforeEach(() => {
        mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(mockDispatchResult);
      });

      it('should dispatch agents with valid args', async () => {
        const result = await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'security-specialist',
          taskDescription: 'Review security',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
            taskDescription: 'Review security',
          }),
        );
      });

      it('should return error for missing mode', async () => {
        const result = await handler.handle('dispatch_agents', {
          primaryAgent: 'security-specialist',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Missing required parameter: mode'),
        });
      });

      it('should return error for invalid mode', async () => {
        const result = await handler.handle('dispatch_agents', {
          mode: 'INVALID',
          primaryAgent: 'security-specialist',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Invalid mode'),
        });
      });

      it('should pass optional parameters', async () => {
        const result = await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'security-specialist',
          specialists: ['accessibility-specialist'],
          targetFiles: ['src/app.ts'],
          taskDescription: 'Review code',
          includeParallel: true,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
            specialists: ['accessibility-specialist'],
            targetFiles: ['src/app.ts'],
            taskDescription: 'Review code',
            includeParallel: true,
          }),
        );
      });

      it('should return error when service fails', async () => {
        mockAgentService.dispatchAgents = vi.fn().mockRejectedValue(new Error('Dispatch failed'));

        const result = await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'security-specialist',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Dispatch failed'),
        });
      });

      describe('executionStrategy parameter', () => {
        it('should pass executionStrategy "subagent" to service', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            specialists: ['security-specialist'],
            executionStrategy: 'subagent',
          });
          expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
            expect.objectContaining({ executionStrategy: 'subagent' }),
          );
        });

        it('should pass executionStrategy "taskmaestro" to service', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            specialists: ['security-specialist'],
            executionStrategy: 'taskmaestro',
          });
          expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
            expect.objectContaining({ executionStrategy: 'taskmaestro' }),
          );
        });

        it('should default executionStrategy to "subagent" when not specified', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            specialists: ['security-specialist'],
          });
          expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
            expect.objectContaining({ executionStrategy: 'subagent' }),
          );
        });

        it('should pass executionStrategy "teams" to service', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            specialists: ['security-specialist', 'accessibility-specialist'],
            executionStrategy: 'teams',
          });
          expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
            expect.objectContaining({ executionStrategy: 'teams' }),
          );
        });

        it('should return teams dispatch data when strategy is "teams"', async () => {
          const teamsResult = {
            primaryAgent: mockDispatchResult.primaryAgent,
            teams: {
              team_name: 'eval-specialists',
              description: 'EVAL mode specialist team',
              teammates: [
                {
                  name: 'security-specialist',
                  subagent_type: 'general-purpose',
                  team_name: 'eval-specialists',
                  prompt: 'You are a security specialist...',
                },
              ],
            },
            executionStrategy: 'teams',
            executionHint: 'Teams execution hint',
          };
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(teamsResult);

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
            specialists: ['security-specialist'],
            executionStrategy: 'teams',
          });

          expect(result?.isError).toBeFalsy();
          const content = JSON.parse(result?.content[0]?.text as string);
          expect(content.teams).toBeDefined();
          expect(content.teams.team_name).toBe('eval-specialists');
          expect(content.teams.teammates).toHaveLength(1);
          expect(content.teams.teammates[0].name).toBe('security-specialist');
          expect(content.executionStrategy).toBe('teams');
        });

        it('should pass all parameters with teams strategy', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'PLAN',
            primaryAgent: 'solution-architect',
            specialists: ['security-specialist', 'performance-specialist'],
            targetFiles: ['src/app.ts'],
            taskDescription: 'Review architecture',
            includeParallel: true,
            executionStrategy: 'teams',
          });
          expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
            expect.objectContaining({
              mode: 'PLAN',
              primaryAgent: 'solution-architect',
              specialists: ['security-specialist', 'performance-specialist'],
              targetFiles: ['src/app.ts'],
              taskDescription: 'Review architecture',
              includeParallel: true,
              executionStrategy: 'teams',
            }),
          );
        });
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(3);
      expect(definitions.map(d => d.name)).toEqual([
        'get_agent_system_prompt',
        'prepare_parallel_agents',
        'dispatch_agents',
      ]);
    });

    it('should include teams in executionStrategy enum', () => {
      const definitions = handler.getToolDefinitions();
      const dispatchAgents = definitions.find(d => d.name === 'dispatch_agents');
      const strategyEnum = (
        dispatchAgents?.inputSchema.properties as Record<string, { enum?: string[] }>
      )?.executionStrategy?.enum;
      expect(strategyEnum).toContain('teams');
      expect(strategyEnum).toContain('subagent');
      expect(strategyEnum).toContain('taskmaestro');
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();

      const getAgentSystemPrompt = definitions.find(d => d.name === 'get_agent_system_prompt');
      expect(getAgentSystemPrompt?.inputSchema.required).toEqual(['agentName', 'context']);

      const prepareParallelAgents = definitions.find(d => d.name === 'prepare_parallel_agents');
      expect(prepareParallelAgents?.inputSchema.required).toEqual(['mode', 'specialists']);

      const dispatchAgents = definitions.find(d => d.name === 'dispatch_agents');
      expect(dispatchAgents?.inputSchema.required).toEqual(['mode']);
    });
  });
});
