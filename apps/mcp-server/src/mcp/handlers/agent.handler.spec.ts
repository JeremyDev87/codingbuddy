import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentHandler } from './agent.handler';
import { AgentService } from '../../agent/agent.service';
import { AgentStackService } from '../../agent/agent-stack.service';
import type { ImpactEventService } from '../../impact';
import type { RuleEventCollector } from '../../rules/rule-event-collector';

describe('AgentHandler', () => {
  let handler: AgentHandler;
  let mockAgentService: AgentService;
  let mockAgentStackService: AgentStackService;
  let mockImpactEventService: Partial<ImpactEventService>;
  let mockRuleEventCollector: Partial<RuleEventCollector>;

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

    mockAgentStackService = {
      listStacks: vi.fn().mockResolvedValue([]),
      resolveStack: vi.fn().mockRejectedValue(new Error('Stack not found')),
    } as unknown as AgentStackService;

    mockImpactEventService = { logEvent: vi.fn() };
    mockRuleEventCollector = { record: vi.fn() };

    handler = new AgentHandler(
      mockAgentService,
      mockAgentStackService,
      mockImpactEventService as ImpactEventService,
      mockRuleEventCollector as RuleEventCollector,
    );
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
          undefined,
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
          undefined,
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
          undefined,
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
          undefined,
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
          undefined,
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

      describe('rule event tracking', () => {
        it('should record specialist_dispatched event on dispatch', async () => {
          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
            taskDescription: 'Review security',
          });

          expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'specialist_dispatched',
              domain: 'security-specialist',
            }),
          );
        });

        it('should record events for each specialist in parallel dispatch', async () => {
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue({
            ...mockDispatchResult,
            parallelAgents: [
              { name: 'accessibility-specialist' },
              { name: 'performance-specialist' },
            ],
          });

          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            specialists: ['accessibility-specialist', 'performance-specialist'],
            includeParallel: true,
          });

          expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'specialist_dispatched',
              domain: 'accessibility-specialist',
            }),
          );
          expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'specialist_dispatched',
              domain: 'performance-specialist',
            }),
          );
        });

        it('should not record events when dispatch fails', async () => {
          mockAgentService.dispatchAgents = vi.fn().mockRejectedValue(new Error('Dispatch failed'));

          await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
          });

          expect(mockRuleEventCollector.record).not.toHaveBeenCalled();
        });

        it('should not break handler when event recording throws', async () => {
          mockRuleEventCollector.record = vi.fn().mockImplementation(() => {
            throw new Error('record error');
          });

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
          });

          expect(result?.isError).toBeFalsy();
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

      describe('visibility field', () => {
        it('should include visibility in dispatch response', async () => {
          const dispatchResultWithVisibility = {
            ...mockDispatchResult,
            visibility: {
              reportTo: 'team-lead',
              format: 'structured',
              includeProgress: true,
            },
          };
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(dispatchResultWithVisibility);

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
          });

          expect(result?.isError).toBeFalsy();
          const content = JSON.parse(result?.content[0]?.text as string);
          expect(content.visibility).toBeDefined();
          expect(content.visibility.reportTo).toBe('team-lead');
          expect(content.visibility.format).toBe('structured');
          expect(content.visibility.includeProgress).toBe(true);
        });

        it('should add visibility with SendMessage instructions when specialists are dispatched', async () => {
          const resultWithSpecialists = {
            primaryAgent: mockDispatchResult.primaryAgent,
            parallelAgents: [
              {
                name: 'accessibility-specialist',
                displayName: 'Accessibility Specialist',
                description: 'Accessibility review',
                dispatchParams: {
                  subagent_type: 'general-purpose' as const,
                  prompt: 'You are an accessibility specialist...',
                  description: 'Accessibility review',
                  run_in_background: true as const,
                },
              },
            ],
            executionHint: 'Use Task tool...',
          };
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(resultWithSpecialists);

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
            specialists: ['accessibility-specialist'],
            includeParallel: true,
          });

          expect(result?.isError).toBeFalsy();
          const content = JSON.parse(result?.content[0]?.text as string);
          expect(content.visibility).toBeDefined();
          expect(content.visibility.reportTo).toBe('team-lead');
          expect(content.visibility.format).toBe('structured');
          expect(content.visibility.includeProgress).toBe(true);
        });

        it('should include visibility with messaging instructions for each specialist', async () => {
          const resultWithVisibility = {
            ...mockDispatchResult,
            visibility: {
              reportTo: 'team-lead',
              format: 'structured',
              includeProgress: true,
              messages: {
                onStart: 'Report start via SendMessage to team-lead',
                onFinding: 'Report each finding via SendMessage to team-lead',
                onComplete: 'Report completion summary via SendMessage to team-lead',
              },
            },
          };
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(resultWithVisibility);

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
          });

          expect(result?.isError).toBeFalsy();
          const content = JSON.parse(result?.content[0]?.text as string);
          expect(content.visibility.messages).toBeDefined();
          expect(content.visibility.messages.onStart).toContain('SendMessage');
          expect(content.visibility.messages.onFinding).toContain('SendMessage');
          expect(content.visibility.messages.onComplete).toContain('SendMessage');
        });

        it('should include visibility even when no specialists are dispatched', async () => {
          const resultMinimal = {
            executionHint: 'Use Task tool...',
          };
          mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(resultMinimal);

          const result = await handler.handle('dispatch_agents', {
            mode: 'EVAL',
          });

          expect(result?.isError).toBeFalsy();
          const content = JSON.parse(result?.content[0]?.text as string);
          expect(content.visibility).toBeDefined();
          expect(content.visibility.reportTo).toBe('team-lead');
        });
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(4);
      expect(definitions.map(d => d.name)).toEqual([
        'get_agent_system_prompt',
        'prepare_parallel_agents',
        'dispatch_agents',
        'list_agent_stacks',
      ]);
    });

    it('should include all strategies in executionStrategy enum', () => {
      const definitions = handler.getToolDefinitions();
      const dispatchAgents = definitions.find(d => d.name === 'dispatch_agents');
      const strategyEnum = (
        dispatchAgents?.inputSchema.properties as Record<string, { enum?: string[] }>
      )?.executionStrategy?.enum;
      expect(strategyEnum).toContain('teams');
      expect(strategyEnum).toContain('subagent');
      expect(strategyEnum).toContain('taskmaestro');
      expect(strategyEnum).toContain('taskmaestro+teams');
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

    it('should include inlineAgents in dispatch_agents schema', () => {
      const definitions = handler.getToolDefinitions();
      const dispatchAgents = definitions.find(d => d.name === 'dispatch_agents');
      const properties = dispatchAgents?.inputSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('inlineAgents');
    });

    it('should include agentStack in dispatch_agents schema', () => {
      const definitions = handler.getToolDefinitions();
      const dispatchAgents = definitions.find(d => d.name === 'dispatch_agents');
      const properties = dispatchAgents?.inputSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('agentStack');
    });

    it('should include list_agent_stacks tool definition', () => {
      const definitions = handler.getToolDefinitions();
      const listStacks = definitions.find(d => d.name === 'list_agent_stacks');
      expect(listStacks).toBeDefined();
      const properties = listStacks?.inputSchema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('category');
    });
  });

  describe('unified agent registry (inlineAgents)', () => {
    const inlineAgent = {
      name: 'My Custom Agent',
      description: 'A custom inline agent',
      role: {
        title: 'Custom Specialist',
        expertise: ['custom-domain'],
      },
    };

    const mockDispatchResult = {
      primaryAgent: {
        name: 'my-inline-agent',
        displayName: 'My Custom Agent',
        description: 'A custom inline agent',
        dispatchParams: {
          subagent_type: 'general-purpose' as const,
          prompt: 'You are a custom specialist...',
          description: 'A custom inline agent',
        },
      },
      executionHint: 'Use Task tool...',
    };

    beforeEach(() => {
      mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(mockDispatchResult);
    });

    describe('dispatch_agents with inlineAgents', () => {
      it('should pass inlineAgents to service', async () => {
        const inlineAgents = { 'my-inline-agent': inlineAgent };

        await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'my-inline-agent',
          inlineAgents,
        });

        expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'EVAL',
            primaryAgent: 'my-inline-agent',
            inlineAgents,
          }),
        );
      });

      it('should work without inlineAgents (backwards compatible)', async () => {
        await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'security-specialist',
        });

        expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'EVAL',
            primaryAgent: 'security-specialist',
          }),
        );

        const callArgs = (mockAgentService.dispatchAgents as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(callArgs.inlineAgents).toBeUndefined();
      });

      it('should pass inlineAgents with multiple agents', async () => {
        const multipleInline = {
          'agent-a': inlineAgent,
          'agent-b': { ...inlineAgent, name: 'Agent B', description: 'Second agent' },
        };

        await handler.handle('dispatch_agents', {
          mode: 'PLAN',
          primaryAgent: 'agent-a',
          specialists: ['agent-b'],
          inlineAgents: multipleInline,
          includeParallel: true,
        });

        expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
          expect.objectContaining({
            inlineAgents: multipleInline,
          }),
        );
      });

      it('should ignore non-object inlineAgents', async () => {
        await handler.handle('dispatch_agents', {
          mode: 'EVAL',
          primaryAgent: 'security-specialist',
          inlineAgents: 'not-an-object',
        });

        const callArgs = (mockAgentService.dispatchAgents as ReturnType<typeof vi.fn>).mock
          .calls[0][0];
        expect(callArgs.inlineAgents).toBeUndefined();
      });
    });

    describe('get_agent_system_prompt with inlineAgents', () => {
      it('should pass inlineAgents to service', async () => {
        const inlineAgents = { 'my-inline-agent': inlineAgent };

        await handler.handle('get_agent_system_prompt', {
          agentName: 'my-inline-agent',
          context: { mode: 'EVAL' },
          inlineAgents,
        });

        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'my-inline-agent',
          expect.objectContaining({ mode: 'EVAL' }),
          inlineAgents,
        );
      });

      it('should work without inlineAgents (backwards compatible)', async () => {
        await handler.handle('get_agent_system_prompt', {
          agentName: 'security-specialist',
          context: { mode: 'EVAL' },
        });

        expect(mockAgentService.getAgentSystemPrompt).toHaveBeenCalledWith(
          'security-specialist',
          expect.objectContaining({ mode: 'EVAL' }),
          undefined,
        );
      });
    });

    describe('prepare_parallel_agents with inlineAgents', () => {
      it('should pass inlineAgents to service', async () => {
        const inlineAgents = { 'my-inline-agent': inlineAgent };

        await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['my-inline-agent'],
          inlineAgents,
        });

        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['my-inline-agent'],
          undefined,
          undefined,
          undefined,
          inlineAgents,
        );
      });

      it('should work without inlineAgents (backwards compatible)', async () => {
        await handler.handle('prepare_parallel_agents', {
          mode: 'EVAL',
          specialists: ['security-specialist'],
        });

        expect(mockAgentService.prepareParallelAgents).toHaveBeenCalledWith(
          'EVAL',
          ['security-specialist'],
          undefined,
          undefined,
          undefined,
          undefined,
        );
      });
    });
  });

  describe('dispatch_agents with agentStack', () => {
    const mockStack = {
      name: 'api-development',
      description: 'API development stack',
      category: 'development',
      primary_agent: 'backend-developer',
      specialist_agents: ['security-specialist', 'test-engineer'],
      tags: ['api', 'backend'],
    };

    const mockDispatchResult = {
      primaryAgent: {
        name: 'backend-developer',
        displayName: 'Backend Developer',
        description: 'Backend review',
        dispatchParams: {
          subagent_type: 'general-purpose' as const,
          prompt: 'You are a backend developer...',
          description: 'Backend review',
        },
      },
      executionHint: 'Use Task tool...',
    };

    beforeEach(() => {
      mockAgentService.dispatchAgents = vi.fn().mockResolvedValue(mockDispatchResult);
    });

    it('should resolve stack and pass primary + specialists to service', async () => {
      mockAgentStackService.resolveStack = vi.fn().mockResolvedValue(mockStack);

      await handler.handle('dispatch_agents', {
        mode: 'ACT',
        agentStack: 'api-development',
      });

      expect(mockAgentStackService.resolveStack).toHaveBeenCalledWith('api-development');
      expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'ACT',
          primaryAgent: 'backend-developer',
          specialists: ['security-specialist', 'test-engineer'],
          includeParallel: true,
        }),
      );
    });

    it('should prefer explicit primaryAgent over stack primary', async () => {
      mockAgentStackService.resolveStack = vi.fn().mockResolvedValue(mockStack);

      await handler.handle('dispatch_agents', {
        mode: 'ACT',
        agentStack: 'api-development',
        primaryAgent: 'frontend-developer',
      });

      expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryAgent: 'frontend-developer',
        }),
      );
    });

    it('should prefer explicit specialists over stack specialists', async () => {
      mockAgentStackService.resolveStack = vi.fn().mockResolvedValue(mockStack);

      await handler.handle('dispatch_agents', {
        mode: 'ACT',
        agentStack: 'api-development',
        specialists: ['performance-specialist'],
      });

      expect(mockAgentService.dispatchAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          specialists: ['performance-specialist'],
        }),
      );
    });

    it('should return error when stack not found', async () => {
      mockAgentStackService.resolveStack = vi
        .fn()
        .mockRejectedValue(new Error("Agent stack 'non-existent' not found"));

      const result = await handler.handle('dispatch_agents', {
        mode: 'ACT',
        agentStack: 'non-existent',
      });

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Failed to resolve agent stack'),
      });
    });

    it('should work without agentStack (backward compatible)', async () => {
      await handler.handle('dispatch_agents', {
        mode: 'EVAL',
        primaryAgent: 'security-specialist',
      });

      expect(mockAgentStackService.resolveStack).not.toHaveBeenCalled();
    });
  });

  describe('list_agent_stacks', () => {
    const mockStacks = [
      {
        name: 'api-development',
        description: 'API development stack',
        category: 'development',
        primary_agent: 'backend-developer',
        specialist_count: 2,
        tags: ['api', 'backend'],
      },
      {
        name: 'frontend-review',
        description: 'Frontend review stack',
        category: 'review',
        primary_agent: 'frontend-developer',
        specialist_count: 3,
        tags: ['frontend'],
      },
    ];

    it('should list all agent stacks', async () => {
      mockAgentStackService.listStacks = vi.fn().mockResolvedValue(mockStacks);

      const result = await handler.handle('list_agent_stacks', {});

      expect(result?.isError).toBeFalsy();
      const content = JSON.parse(result?.content[0]?.text as string);
      expect(content.stacks).toHaveLength(2);
      expect(content.stacks[0].name).toBe('api-development');
      expect(content.stacks[1].specialist_count).toBe(3);
    });

    it('should pass category filter', async () => {
      mockAgentStackService.listStacks = vi.fn().mockResolvedValue([mockStacks[1]]);

      const result = await handler.handle('list_agent_stacks', {
        category: 'review',
      });

      expect(mockAgentStackService.listStacks).toHaveBeenCalledWith('review');
      expect(result?.isError).toBeFalsy();
      const content = JSON.parse(result?.content[0]?.text as string);
      expect(content.stacks).toHaveLength(1);
    });

    it('should work without any parameters', async () => {
      mockAgentStackService.listStacks = vi.fn().mockResolvedValue([]);

      const result = await handler.handle('list_agent_stacks', undefined);

      expect(result?.isError).toBeFalsy();
      expect(mockAgentStackService.listStacks).toHaveBeenCalledWith(undefined);
    });

    it('should return error when service fails', async () => {
      mockAgentStackService.listStacks = vi.fn().mockRejectedValue(new Error('Read error'));

      const result = await handler.handle('list_agent_stacks', {});

      expect(result?.isError).toBe(true);
      expect(result?.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Failed to list agent stacks'),
      });
    });
  });
});
