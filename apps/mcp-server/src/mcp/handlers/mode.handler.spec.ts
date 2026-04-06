import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeHandler } from './mode.handler';
import { KeywordService } from '../../keyword/keyword.service';
import { ConfigService } from '../../config/config.service';
import { LanguageService } from '../../shared/language.service';
import { ModelResolverService } from '../../model';
import { StateService } from '../../state/state.service';
import { ContextDocumentService } from '../../context/context-document.service';
import { DiagnosticLogService } from '../../diagnostic/diagnostic-log.service';
import type { AgentService } from '../../agent/agent.service';
import { CouncilPresetService } from '../../agent/council-preset.service';
import type { TeamsCapabilityService } from '../../agent/teams-capability.service';
import type { ImpactEventService } from '../../impact';
import type { RuleEventCollector } from '../../rules/rule-event-collector';

describe('ModeHandler', () => {
  let handler: ModeHandler;
  let mockKeywordService: KeywordService;
  let mockConfigService: ConfigService;
  let mockLanguageService: LanguageService;
  let mockModelResolverService: ModelResolverService;
  let mockStateService: StateService;
  let mockContextDocService: ContextDocumentService;
  let mockDiagnosticLogService: DiagnosticLogService;
  let mockAgentService: Partial<AgentService>;
  let mockCouncilPresetService: CouncilPresetService;
  let mockTeamsCapabilityService: Partial<TeamsCapabilityService>;
  let mockImpactEventService: Partial<ImpactEventService>;
  let mockRuleEventCollector: Partial<RuleEventCollector>;

  const mockParseModeResult = {
    mode: 'PLAN',
    originalPrompt: 'test task',
    rawPrompt: 'PLAN test task',
    cleanPrompt: 'test task',
    matchedKeyword: 'PLAN',
    agent: 'plan-mode-agent',
    rules: [],
    checklists: [],
    instructions: [],
  };

  beforeEach(() => {
    mockKeywordService = {
      parseMode: vi.fn().mockResolvedValue(mockParseModeResult),
    } as unknown as KeywordService;

    mockConfigService = {
      getLanguage: vi.fn().mockResolvedValue('ko'),
      getProjectRoot: vi.fn().mockReturnValue('/test/project'),
      getProjectRootSource: vi.fn().mockReturnValue('env'),
      isConfigLoaded: vi.fn().mockReturnValue(true),
      reload: vi.fn().mockResolvedValue({}),
      getSettings: vi.fn().mockResolvedValue({}),
    } as unknown as ConfigService;

    mockLanguageService = {
      getLanguageInstruction: vi.fn().mockReturnValue({
        languageCode: 'ko',
        instruction: 'Please respond in Korean.',
      }),
    } as unknown as LanguageService;

    mockModelResolverService = {
      resolve: vi.fn().mockResolvedValue({
        model: 'claude-sonnet-4-20250514',
        source: 'global',
      }),
    } as unknown as ModelResolverService;

    mockStateService = {
      updateLastMode: vi.fn().mockResolvedValue({ success: true }),
      saveProjectMetadata: vi.fn().mockResolvedValue({ success: true }),
      loadProjectMetadata: vi.fn().mockResolvedValue(null),
      getLastMode: vi.fn().mockResolvedValue(null),
    } as unknown as StateService;

    mockContextDocService = {
      resetContext: vi.fn().mockResolvedValue({
        success: true,
        document: {
          metadata: {
            title: 'test-task',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            currentMode: 'PLAN',
            status: 'active',
          },
          sections: [],
        },
      }),
      appendContext: vi.fn().mockResolvedValue({
        success: true,
        document: {
          metadata: {
            title: 'test-task',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            currentMode: 'ACT',
            status: 'active',
          },
          sections: [],
        },
      }),
      readContext: vi.fn().mockResolvedValue({
        exists: true,
        document: {
          metadata: {
            title: 'test-task',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUpdatedAt: '2024-01-01T00:00:00.000Z',
            currentMode: 'PLAN',
            status: 'active',
          },
          sections: [],
        },
      }),
      contextExists: vi.fn().mockResolvedValue(true),
    } as unknown as ContextDocumentService;

    mockDiagnosticLogService = {
      logConfigLoading: vi.fn().mockResolvedValue({ success: true }),
      log: vi.fn().mockResolvedValue({ success: true }),
      debug: vi.fn().mockResolvedValue({ success: true }),
      info: vi.fn().mockResolvedValue({ success: true }),
      warn: vi.fn().mockResolvedValue({ success: true }),
      error: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as DiagnosticLogService;

    mockAgentService = {
      dispatchAgents: vi.fn().mockResolvedValue({
        executionHint: 'Use Task tool...',
      }),
    };

    mockCouncilPresetService = new CouncilPresetService();

    mockTeamsCapabilityService = {
      getStatus: vi.fn().mockResolvedValue({
        available: false,
        reason: 'Teams coordination is experimental and disabled by default',
        source: 'default',
      }),
      isAvailable: vi.fn().mockResolvedValue(false),
    };

    mockImpactEventService = {
      logEvent: vi.fn(),
    };

    mockRuleEventCollector = { record: vi.fn() };

    handler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
      mockStateService,
      mockContextDocService,
      mockDiagnosticLogService,
      mockAgentService as AgentService,
      mockCouncilPresetService,
      mockTeamsCapabilityService as TeamsCapabilityService,
      mockImpactEventService as ImpactEventService,
      mockRuleEventCollector as RuleEventCollector,
    );
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    describe('parse_mode', () => {
      it('should parse mode with valid prompt', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test task',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('PLAN test task', {
          verbosity: 'standard',
        });
      });

      it('should return error for missing prompt', async () => {
        const result = await handler.handle('parse_mode', {});

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Missing required parameter: prompt'),
        });
      });

      it('should return error for non-string prompt', async () => {
        const result = await handler.handle('parse_mode', { prompt: 123 });

        expect(result?.isError).toBe(true);
      });

      it('should pass recommended_agent when provided', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: 'frontend-developer',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACT implement feature', {
          recommendedActAgent: 'frontend-developer',
          verbosity: 'standard',
        });
      });

      it('should ignore empty recommended_agent', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: '   ',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACT implement feature', {
          verbosity: 'standard',
        });
      });

      it('should ignore non-string recommended_agent', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: 123,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACT implement feature', {
          verbosity: 'standard',
        });
      });

      it('should pass verbosity when provided', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN design feature',
          verbosity: 'minimal',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('PLAN design feature', {
          verbosity: 'minimal',
        });
      });

      it('should use standard verbosity as default', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN design feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('PLAN design feature', {
          verbosity: 'standard',
        });
      });

      it('should reload config before getting language to ensure fresh settings', async () => {
        await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        // Verify reload is called
        expect(mockConfigService.reload).toHaveBeenCalled();

        // Verify reload is called before getLanguage
        const reloadCallOrder =
          (mockConfigService.reload as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0] ?? 0;
        const getLanguageCallOrder =
          (mockConfigService.getLanguage as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0] ??
          0;
        expect(reloadCallOrder).toBeLessThan(getLanguageCallOrder);
      });

      it('should include language and languageInstruction in response', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBeFalsy();
        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.language).toBe('ko');
        expect(response.languageInstruction).toBe('Please respond in Korean.');
      });

      it('should include resolvedModel in response', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBeFalsy();
        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.resolvedModel).toBeDefined();
      });

      it('should return error when keyword service fails', async () => {
        mockKeywordService.parseMode = vi.fn().mockRejectedValue(new Error('Parse error'));

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Parse error'),
        });
      });

      it('should include dispatchReady.primaryAgent when included_agent is present', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          included_agent: {
            name: 'frontend-developer',
            systemPrompt: 'You are a frontend developer',
            expertise: ['React', 'TypeScript'],
          },
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBeFalsy();
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);
        expect(parsed.dispatchReady).toBeDefined();
        expect(parsed.dispatchReady.primaryAgent).toBeDefined();
        expect(parsed.dispatchReady.primaryAgent.name).toBe('frontend-developer');
        expect(parsed.dispatchReady.primaryAgent.dispatchParams.subagent_type).toBe(
          'general-purpose',
        );
        expect(parsed.dispatchReady.primaryAgent.dispatchParams.prompt).toContain(
          'You are a frontend developer',
        );
      });

      it('should not include dispatchReady when no agents are present', async () => {
        // mockParseModeResult has no included_agent or parallelAgentsRecommendation
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBeFalsy();
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);
        expect(parsed.dispatchReady).toBeUndefined();
      });

      it('should include projectRootWarning when source is auto_detect and config not loaded', async () => {
        (mockConfigService.getProjectRootSource as ReturnType<typeof vi.fn>).mockReturnValue(
          'auto_detect',
        );
        (mockConfigService.getLanguage as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
        (mockConfigService.isConfigLoaded as ReturnType<typeof vi.fn>).mockReturnValue(false);

        const result = await handler.handle('parse_mode', { prompt: 'PLAN test' });
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);

        expect(parsed.projectRootWarning).toBeDefined();
        expect(parsed.projectRootWarning).toContain('CODINGBUDDY_PROJECT_ROOT');
      });

      it('should NOT include projectRootWarning when source is env', async () => {
        (mockConfigService.getProjectRootSource as ReturnType<typeof vi.fn>).mockReturnValue('env');

        const result = await handler.handle('parse_mode', { prompt: 'PLAN test' });
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);

        expect(parsed.projectRootWarning).toBeUndefined();
      });

      it('should NOT include projectRootWarning when source is roots_list', async () => {
        (mockConfigService.getProjectRootSource as ReturnType<typeof vi.fn>).mockReturnValue(
          'roots_list',
        );

        const result = await handler.handle('parse_mode', { prompt: 'PLAN test' });
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);

        expect(parsed.projectRootWarning).toBeUndefined();
      });

      it('should NOT include projectRootWarning when auto_detect but config is loaded', async () => {
        (mockConfigService.getProjectRootSource as ReturnType<typeof vi.fn>).mockReturnValue(
          'auto_detect',
        );
        (mockConfigService.getLanguage as ReturnType<typeof vi.fn>).mockResolvedValue('ko');
        (mockConfigService.isConfigLoaded as ReturnType<typeof vi.fn>).mockReturnValue(true);

        const result = await handler.handle('parse_mode', { prompt: 'PLAN test' });
        const parsed = JSON.parse((result?.content[0] as { text: string }).text);

        expect(parsed.projectRootWarning).toBeUndefined();
      });
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definitions', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('parse_mode');
    });

    it('should have correct required parameters', () => {
      const definitions = handler.getToolDefinitions();
      const parseMode = definitions[0];

      expect(parseMode.inputSchema.required).toContain('prompt');
    });

    it('should have MANDATORY description', () => {
      const definitions = handler.getToolDefinitions();
      const parseMode = definitions[0];

      expect(parseMode.description).toContain('MANDATORY');
    });
  });

  describe('context document handling', () => {
    describe('PLAN mode', () => {
      it('should reset context document in PLAN mode', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN implement auth feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.resetContext).toHaveBeenCalled();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.contextFilePath).toBeDefined();
        expect(response.contextExists).toBe(true);
        expect(response.contextDocument).toBeDefined();
      });

      it('should handle context reset failure gracefully', async () => {
        mockContextDocService.resetContext = vi.fn().mockResolvedValue({
          success: false,
          error: 'Failed to reset context',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test task',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.contextWarning).toContain('Failed to create context document');
      });

      it('should not read context before parseMode when mode is PLAN', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN design feature',
        });

        expect(result?.isError).toBeFalsy();
        const readContextCalls = (mockContextDocService.readContext as ReturnType<typeof vi.fn>)
          .mock.calls;
        expect(readContextCalls.length).toBe(0);
      });
    });

    describe('AUTO mode', () => {
      it('should reset context document in AUTO mode', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'AUTO',
          originalPrompt: 'implement dashboard feature',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'AUTO implement dashboard feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.resetContext).toHaveBeenCalled();
      });
    });

    describe('ACT mode', () => {
      it('should warn when no context document exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: false,
          document: null,
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.contextWarning).toContain('No context document found');
      });

      it('should append context when document exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalled();
      });

      it('should auto-inherit recommendedActAgent from context when not explicitly provided', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: true,
          document: {
            metadata: {
              title: 'test-task',
              createdAt: '2024-01-01T00:00:00.000Z',
              lastUpdatedAt: '2024-01-01T00:00:00.000Z',
              currentMode: 'PLAN',
              status: 'active',
            },
            sections: [{ mode: 'PLAN', recommendedActAgent: 'backend-developer' }],
          },
        });

        await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          // recommended_agent NOT provided
        });

        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACT implement feature', {
          recommendedActAgent: 'backend-developer',
          verbosity: 'standard',
        });
      });

      it('should prefer explicit recommended_agent param over context value', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: true,
          document: {
            metadata: {
              title: 'test-task',
              createdAt: '2024-01-01T00:00:00.000Z',
              lastUpdatedAt: '2024-01-01T00:00:00.000Z',
              currentMode: 'PLAN',
              status: 'active',
            },
            sections: [{ mode: 'PLAN', recommendedActAgent: 'backend-developer' }],
          },
        });

        await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: 'frontend-developer',
        });

        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACT implement feature', {
          recommendedActAgent: 'frontend-developer',
          verbosity: 'standard',
        });
        // readContext must NOT be called before parseMode when explicit param is provided (performance)
        expect(mockContextDocService.readContext).not.toHaveBeenCalledBefore(
          mockKeywordService.parseMode as ReturnType<typeof vi.fn>,
        );
      });

      it('should auto-inherit recommendedActAgent when using Korean ACT keyword (실행)', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: '피처 구현',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: true,
          document: {
            metadata: {
              title: 'test-task',
              createdAt: '2024-01-01T00:00:00.000Z',
              lastUpdatedAt: '2024-01-01T00:00:00.000Z',
              currentMode: 'PLAN',
              status: 'active',
            },
            sections: [{ mode: 'PLAN', recommendedActAgent: 'backend-developer' }],
          },
        });

        await handler.handle('parse_mode', {
          prompt: '실행 피처 구현',
        });

        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('실행 피처 구현', {
          recommendedActAgent: 'backend-developer',
          verbosity: 'standard',
        });
      });

      it('should auto-inherit recommendedActAgent when using Spanish ACT keyword (ACTUAR)', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implementar feature',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: true,
          document: {
            metadata: {
              title: 'test-task',
              createdAt: '2024-01-01T00:00:00.000Z',
              lastUpdatedAt: '2024-01-01T00:00:00.000Z',
              currentMode: 'PLAN',
              status: 'active',
            },
            sections: [{ mode: 'PLAN', recommendedActAgent: 'backend-developer' }],
          },
        });

        await handler.handle('parse_mode', {
          prompt: 'ACTUAR implementar feature',
        });

        expect(mockKeywordService.parseMode).toHaveBeenCalledWith('ACTUAR implementar feature', {
          recommendedActAgent: 'backend-developer',
          verbosity: 'standard',
        });
      });
    });

    describe('EVAL mode', () => {
      it('should warn when no context document exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'EVAL',
          originalPrompt: 'evaluate implementation',
        });
        mockContextDocService.readContext = vi.fn().mockResolvedValue({
          exists: false,
          document: null,
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'EVAL evaluate implementation',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.contextWarning).toContain('No context document found');
      });

      it('should append context when document exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'EVAL',
          originalPrompt: 'evaluate implementation',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'EVAL evaluate implementation',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockContextDocService.appendContext).toHaveBeenCalled();
      });
    });
  });

  describe('dispatchReady in parse_mode response', () => {
    it('should include dispatchReady when included_agent is present', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        included_agent: {
          name: 'Solution Architect',
          systemPrompt: 'You are a solution architect...',
          expertise: ['architecture'],
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const response = JSON.parse(result?.content[0]?.text as string);
      expect(response.dispatchReady).toBeDefined();
      expect(response.dispatchReady.primaryAgent).toBeDefined();
      expect(response.dispatchReady.primaryAgent.name).toBe('solution-architect');
      expect(response.dispatchReady.primaryAgent.displayName).toBe('Solution Architect');
      expect(response.dispatchReady.primaryAgent.dispatchParams.subagent_type).toBe(
        'general-purpose',
      );
    });

    it('should include parallel agents in dispatchReady when verbosity is full', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        parallelAgentsRecommendation: {
          specialists: ['security-specialist', 'performance-specialist'],
          hint: 'Use Task tool...',
        },
      });

      mockAgentService.dispatchAgents = vi.fn().mockResolvedValue({
        executionHint: 'Use Task tool...',
        parallelAgents: [
          {
            name: 'security-specialist',
            displayName: 'Security Specialist',
            description: 'Security review',
            dispatchParams: {
              subagent_type: 'general-purpose',
              prompt: 'You are a security specialist...',
              description: 'Security review',
              run_in_background: true,
            },
          },
        ],
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
        verbosity: 'full',
      });

      expect(result?.isError).toBeFalsy();
      const response = JSON.parse(result?.content[0]?.text as string);
      expect(response.dispatchReady).toBeDefined();
      expect(response.dispatchReady.parallelAgents).toHaveLength(1);
      expect(response.dispatchReady.parallelAgents[0].dispatchParams.run_in_background).toBe(true);
    });

    it('should not include parallel agents when verbosity is not full', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        parallelAgentsRecommendation: {
          specialists: ['security-specialist'],
          hint: 'Use Task tool...',
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
        verbosity: 'standard',
      });

      expect(result?.isError).toBeFalsy();
      const response = JSON.parse(result?.content[0]?.text as string);
      // dispatchReady should be absent since no included_agent and verbosity != full
      expect(response.dispatchReady).toBeUndefined();
      expect(mockAgentService.dispatchAgents).not.toHaveBeenCalled();
    });

    it('should not include dispatchReady when no agents are recommended', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(result?.isError).toBeFalsy();
      const response = JSON.parse(result?.content[0]?.text as string);
      expect(response.dispatchReady).toBeUndefined();
    });

    it('should handle dispatchAgents failure gracefully', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        included_agent: {
          name: 'Solution Architect',
          systemPrompt: 'You are a solution architect...',
          expertise: ['architecture'],
        },
        parallelAgentsRecommendation: {
          specialists: ['security-specialist'],
          hint: 'Use Task tool...',
        },
      });

      mockAgentService.dispatchAgents = vi.fn().mockRejectedValue(new Error('Agent load failed'));

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
        verbosity: 'full',
      });

      // Should not fail the whole operation
      expect(result?.isError).toBeFalsy();
      const response = JSON.parse(result?.content[0]?.text as string);
      // Primary agent should still be present even if parallel failed
      expect(response.dispatchReady).toBeDefined();
      expect(response.dispatchReady.primaryAgent).toBeDefined();
      expect(response.dispatchReady.parallelAgents).toBeUndefined();
    });
  });

  describe('state persistence', () => {
    it('should persist mode state', async () => {
      await handler.handle('parse_mode', {
        prompt: 'PLAN implement auth feature',
      });

      expect(mockStateService.updateLastMode).toHaveBeenCalledWith('PLAN');
    });

    it('should handle state persistence failure gracefully', async () => {
      mockStateService.updateLastMode = vi
        .fn()
        .mockRejectedValue(new Error('State persistence failed'));

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      // Should not fail the whole operation
      expect(result?.isError).toBeFalsy();
    });
  });

  describe('parse_mode availableStrategies', () => {
    it('should include availableStrategies in parse_mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        availableStrategies: ['subagent', 'taskmaestro'],
      });

      const result = await handler.handle('parse_mode', { prompt: 'PLAN test task' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.availableStrategies).toBeDefined();
      expect(parsed.availableStrategies).toContain('subagent');
      expect(parsed.availableStrategies).toContain('taskmaestro');
    });

    it('should include taskmaestroInstallHint when present', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        availableStrategies: ['subagent'],
        taskmaestroInstallHint: 'TaskMaestro skill not found',
      });

      const result = await handler.handle('parse_mode', { prompt: 'PLAN test task' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.availableStrategies).toEqual(['subagent']);
      expect(parsed.taskmaestroInstallHint).toContain('TaskMaestro skill not found');
    });
  });

  describe('dispatch strength in parallelAgentsRecommendation', () => {
    it('should set dispatch to "auto" for EVAL mode by default', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
        parallelAgentsRecommendation: {
          specialists: ['security-specialist'],
          hint: 'Use Task tool...',
        },
      });

      const result = await handler.handle('parse_mode', { prompt: 'EVAL evaluate implementation' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.parallelAgentsRecommendation.dispatch).toBe('auto');
    });

    it('should set dispatch to "recommend" for PLAN mode by default', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        parallelAgentsRecommendation: {
          specialists: ['architecture-specialist'],
          hint: 'Use Task tool...',
        },
      });

      const result = await handler.handle('parse_mode', { prompt: 'PLAN design feature' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.parallelAgentsRecommendation.dispatch).toBe('recommend');
    });

    it('should set dispatch to "recommend" for ACT mode by default', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
        parallelAgentsRecommendation: {
          specialists: ['code-quality-specialist'],
          hint: 'Use Task tool...',
        },
      });

      const result = await handler.handle('parse_mode', { prompt: 'ACT implement feature' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.parallelAgentsRecommendation.dispatch).toBe('recommend');
    });

    it('should override dispatch with config value when set', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        parallelAgentsRecommendation: {
          specialists: ['architecture-specialist'],
          hint: 'Use Task tool...',
        },
      });
      (mockConfigService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ai: { dispatchStrength: 'skip' },
      });

      const result = await handler.handle('parse_mode', { prompt: 'PLAN design feature' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.parallelAgentsRecommendation.dispatch).toBe('skip');
    });

    it('should not add dispatch when parallelAgentsRecommendation is absent', async () => {
      // mockParseModeResult has no parallelAgentsRecommendation
      const result = await handler.handle('parse_mode', { prompt: 'PLAN test task' });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.parallelAgentsRecommendation).toBeUndefined();
    });
  });

  describe('deep thinking instructions in PLAN mode', () => {
    it('should include deepThinkingInstructions in PLAN mode response', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.deepThinkingInstructions).toBeDefined();
    });

    it('should include deepThinkingInstructions in AUTO mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: 'implement dashboard',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO implement dashboard',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.deepThinkingInstructions).toBeDefined();
    });

    it('should have correct structure with 3 reasoning steps', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      const parsed = JSON.parse(result!.content[0].text as string);
      const dti = parsed.deepThinkingInstructions;

      // reasoning array with 3 steps
      expect(dti.reasoning).toHaveLength(3);
      expect(dti.reasoning[0].step).toBe('decompose');
      expect(dti.reasoning[1].step).toBe('alternatives');
      expect(dti.reasoning[2].step).toBe('devils_advocate');

      // Each step has an instruction string
      for (const r of dti.reasoning) {
        expect(typeof r.instruction).toBe('string');
        expect(r.instruction.length).toBeGreaterThan(0);
      }

      // hallucinationPrevention and detailLevel
      expect(typeof dti.hallucinationPrevention).toBe('string');
      expect(dti.hallucinationPrevention.length).toBeGreaterThan(0);
      expect(typeof dti.detailLevel).toBe('string');
      expect(dti.detailLevel.length).toBeGreaterThan(0);
    });

    it('should NOT include deepThinkingInstructions in ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.deepThinkingInstructions).toBeUndefined();
    });

    it('should NOT include deepThinkingInstructions in EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.deepThinkingInstructions).toBeUndefined();
    });
  });

  describe('planReviewGate in PLAN mode', () => {
    it('should include planReviewGate in PLAN mode response by default', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeDefined();
      expect(parsed.planReviewGate).toEqual({
        enabled: true,
        agent: 'plan-reviewer',
        dispatch: 'recommend',
      });
    });

    it('should include planReviewGate in AUTO mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: 'implement dashboard',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO implement dashboard',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeDefined();
      expect(parsed.planReviewGate.enabled).toBe(true);
      expect(parsed.planReviewGate.agent).toBe('plan-reviewer');
    });

    it('should NOT include planReviewGate in ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeUndefined();
    });

    it('should NOT include planReviewGate in EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeUndefined();
    });

    it('should disable planReviewGate when config ai.planReviewGate is false', async () => {
      (mockConfigService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ai: { planReviewGate: false },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeDefined();
      expect(parsed.planReviewGate.enabled).toBe(false);
    });

    it('should enable planReviewGate when config ai.planReviewGate is true', async () => {
      (mockConfigService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ai: { planReviewGate: true },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.planReviewGate).toBeDefined();
      expect(parsed.planReviewGate.enabled).toBe(true);
      expect(parsed.planReviewGate.agent).toBe('plan-reviewer');
      expect(parsed.planReviewGate.dispatch).toBe('recommend');
    });
  });

  describe('agentDiscussion in EVAL mode', () => {
    it('should include agentDiscussion in EVAL mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.agentDiscussion).toBeDefined();
      expect(parsed.agentDiscussion.enabled).toBe(true);
      expect(parsed.agentDiscussion.format).toBe('structured');
      expect(parsed.agentDiscussion.includeConsensus).toBe(true);
    });

    it('should disable agentDiscussion when config sets it to false', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });
      (mockConfigService.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
        ai: { agentDiscussion: false },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.agentDiscussion).toBeDefined();
      expect(parsed.agentDiscussion.enabled).toBe(false);
    });

    it('should NOT include agentDiscussion in PLAN mode', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.agentDiscussion).toBeUndefined();
    });

    it('should NOT include agentDiscussion in ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.agentDiscussion).toBeUndefined();
    });

    it('should NOT include agentDiscussion in AUTO mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: 'implement dashboard',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO implement dashboard',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.agentDiscussion).toBeUndefined();
    });
  });

  describe('rule event tracking', () => {
    it('should record mode_activated event with mode as rule', async () => {
      await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mode_activated',
          rule: 'PLAN',
        }),
      );
    });

    it('should include agent in event details', async () => {
      await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(mockRuleEventCollector.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mode_activated',
          rule: 'PLAN',
          details: expect.objectContaining({
            agent: 'plan-mode-agent',
          }),
        }),
      );
    });

    it('should not break handler when event recording throws', async () => {
      mockRuleEventCollector.record = vi.fn().mockImplementation(() => {
        throw new Error('record error');
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(result?.isError).toBeFalsy();
    });
  });

  describe('council preset integration', () => {
    it('should include councilPreset in PLAN mode response', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilPreset).toBeDefined();
      expect(parsed.councilPreset.mode).toBe('PLAN');
      expect(parsed.councilPreset.primary).toBe('technical-planner');
      expect(parsed.councilPreset.specialists).toEqual(
        expect.arrayContaining([
          'architecture-specialist',
          'test-strategy-specialist',
          'code-quality-specialist',
          'security-specialist',
        ]),
      );
    });

    it('should include councilPreset in EVAL mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilPreset).toBeDefined();
      expect(parsed.councilPreset.mode).toBe('EVAL');
      expect(parsed.councilPreset.primary).toBe('code-reviewer');
      expect(parsed.councilPreset.specialists).toEqual(
        expect.arrayContaining([
          'security-specialist',
          'performance-specialist',
          'accessibility-specialist',
        ]),
      );
    });

    it('should NOT include councilPreset in ACT mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilPreset).toBeUndefined();
    });

    it('should NOT include councilPreset in AUTO mode response', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: 'implement dashboard',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO implement dashboard',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilPreset).toBeUndefined();
    });

    it('councilPreset should be serializable JSON', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const text = (result?.content[0] as { text: string }).text;
      // Round-trip serialization test
      const parsed = JSON.parse(text);
      const reserialized = JSON.stringify(parsed.councilPreset);
      expect(JSON.parse(reserialized)).toEqual(parsed.councilPreset);
    });
  });

  describe('execution metadata in parse_mode response', () => {
    it('should include teamsCapability when TeamsCapabilityService returns status', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.teamsCapability).toBeDefined();
      expect(parsed.teamsCapability.available).toBe(false);
      expect(parsed.teamsCapability.source).toBe('default');
    });

    it('should include executionPlan when dispatchReady has agents', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        included_agent: {
          name: 'Solution Architect',
          systemPrompt: 'You are a solution architect...',
          expertise: ['architecture'],
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.executionPlan).toBeDefined();
      expect(parsed.executionPlan.strategy).toBe('subagent');
      expect(parsed.executionPlan.isNested).toBe(false);
      expect(parsed.executionPlan.outerExecution.type).toBe('subagent');
    });

    it('should build nested plan when Teams is available', async () => {
      (mockTeamsCapabilityService.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        available: true,
        reason: 'Enabled via CODINGBUDDY_TEAMS_ENABLED environment variable',
        source: 'environment',
      });

      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        included_agent: {
          name: 'Solution Architect',
          systemPrompt: 'You are a solution architect...',
          expertise: ['architecture'],
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.executionPlan).toBeDefined();
      expect(parsed.executionPlan.isNested).toBe(true);
      expect(parsed.executionPlan.strategy).toBe('subagent+teams');
      expect(parsed.executionPlan.innerCoordination).toBeDefined();
      expect(parsed.executionPlan.innerCoordination.type).toBe('teams');
    });

    it('should not include executionPlan when no dispatchReady agents', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.executionPlan).toBeUndefined();
    });

    it('should handle TeamsCapabilityService failure gracefully', async () => {
      (mockTeamsCapabilityService.getStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN test task',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.teamsCapability).toBeUndefined();
    });

    it('should reflect teamsCapability.available=true when enabled via config', async () => {
      (mockTeamsCapabilityService.getStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        available: true,
        reason: 'Enabled via experimental.teamsCoordination config',
        source: 'config',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text as string);
      expect(parsed.teamsCapability.available).toBe(true);
      expect(parsed.teamsCapability.source).toBe('config');
    });
  });

  // ==========================================================================
  // Clarification Gate (#1371)
  // ==========================================================================
  describe('parse_mode Clarification Gate (#1371)', () => {
    it('includes clarificationNeeded=true for ambiguous PLAN prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: '개선해줘',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN 개선해줘',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBe(true);
      expect(parsed.planReady).toBe(false);
      expect(parsed.nextQuestion).toBeTruthy();
      expect(Array.isArray(parsed.clarificationTopics)).toBe(true);
      expect(parsed.clarificationTopics.length).toBeGreaterThan(0);
      expect(parsed.questionBudget).toBe(2);
    });

    it('includes planReady=true for clear PLAN prompt with concrete reference', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'add unit tests to apps/mcp-server/src/auth/auth.service.ts',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN add unit tests to apps/mcp-server/src/auth/auth.service.ts',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBe(false);
      expect(parsed.planReady).toBe(true);
      expect(parsed.nextQuestion).toBeUndefined();
      expect(parsed.clarificationTopics).toBeUndefined();
      expect(parsed.questionBudget).toBe(3);
    });

    it('honors override phrases even when prompt is otherwise ambiguous', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it, just do it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it, just do it',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBe(false);
      expect(parsed.planReady).toBe(true);
      expect(parsed.questionBudget).toBe(3);
      expect(parsed.assumptionNote).toBeUndefined();
    });

    it('decrements the budget across successive ambiguous calls', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const round1 = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 3,
      });
      const parsed1 = JSON.parse((round1?.content[0] as { text: string }).text);
      expect(parsed1.clarificationNeeded).toBe(true);
      expect(parsed1.questionBudget).toBe(2);

      const round2 = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 2,
      });
      const parsed2 = JSON.parse((round2?.content[0] as { text: string }).text);
      expect(parsed2.clarificationNeeded).toBe(true);
      expect(parsed2.questionBudget).toBe(1);
    });

    it('falls back to assumptions when budget is exhausted', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 0,
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBe(false);
      expect(parsed.planReady).toBe(true);
      expect(parsed.questionBudget).toBe(0);
      expect(parsed.assumptionNote).toBeTruthy();
      expect(parsed.assumptionNote).toMatch(/assum/i);
    });

    it('applies the gate in AUTO mode as well', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: '개선',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO 개선',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBe(true);
      expect(parsed.planReady).toBe(false);
    });

    it('does NOT include clarification fields for ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT improve it',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBeUndefined();
      expect(parsed.planReady).toBeUndefined();
      expect(parsed.questionBudget).toBeUndefined();
      expect(parsed.nextQuestion).toBeUndefined();
    });

    it('does NOT include clarification fields for EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL improve it',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.clarificationNeeded).toBeUndefined();
      expect(parsed.planReady).toBeUndefined();
    });

    it('ignores non-numeric question_budget input', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 'not-a-number',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      // Falls back to DEFAULT_QUESTION_BUDGET (3); decremented once → 2
      expect(parsed.questionBudget).toBe(2);
    });
  });

  // ==========================================================================
  // Planning Stage Router (#1372)
  // ==========================================================================
  describe('parse_mode Planning Stage (#1372)', () => {
    it('includes planningStage with discover for ambiguous PLAN prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: '개선해줘',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN 개선해줘',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage).toBeDefined();
      expect(parsed.planningStage.currentStage).toBe('discover');
      expect(parsed.planningStage.nextStage).toBe('design');
      expect(parsed.planningStage.stageTransitionHint).toBeTruthy();
      expect(parsed.planningStage.recommendedAgent).toBe('solution-architect');
      expect(parsed.planningStage.recommendedSkill).toBe('brainstorming');
    });

    it('includes planningStage with plan for clear PLAN prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'add unit tests to apps/mcp-server/src/auth/auth.service.ts',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN add unit tests to apps/mcp-server/src/auth/auth.service.ts',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage).toBeDefined();
      expect(parsed.planningStage.currentStage).toBe('plan');
      expect(parsed.planningStage.nextStage).toBeUndefined();
      expect(parsed.planningStage.stageTransitionHint).toBeUndefined();
      expect(parsed.planningStage.recommendedAgent).toBe('technical-planner');
      expect(parsed.planningStage.recommendedSkill).toBe('writing-plans');
    });

    it('honors explicit planning_stage=design hint', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'implement auth feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN implement auth feature',
        planning_stage: 'design',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage.currentStage).toBe('design');
      expect(parsed.planningStage.nextStage).toBe('plan');
      expect(parsed.planningStage.recommendedAgent).toBe('solution-architect');
    });

    it('includes planningStage in AUTO mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: '개선',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO 개선',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage).toBeDefined();
      expect(parsed.planningStage.currentStage).toBe('discover');
    });

    it('does NOT include planningStage for ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage).toBeUndefined();
    });

    it('does NOT include planningStage for EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'review code',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL review code',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage).toBeUndefined();
    });

    it('ignores invalid planning_stage input', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        planning_stage: 'invalid-stage',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      // Falls back to automatic routing (discover for ambiguous)
      expect(parsed.planningStage.currentStage).toBe('discover');
    });

    it('routes budget-exhausted to plan stage', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 0,
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.planningStage.currentStage).toBe('plan');
      expect(parsed.planningStage.recommendedAgent).toBe('technical-planner');
    });
  });

  // ==========================================================================
  // Execution Gate (#1378)
  // ==========================================================================
  describe('parse_mode Execution Gate (#1378)', () => {
    it('gates execution for ambiguous PLAN prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: '개선해줘',
        parallelAgentsRecommendation: {
          specialists: ['security-specialist', 'performance-specialist'],
          dispatch: 'recommend',
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN 개선해줘',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate).toBeDefined();
      expect(parsed.executionGate.gated).toBe(true);
      expect(parsed.executionGate.reason).toBeTruthy();
      expect(parsed.executionGate.unblockCondition).toBeTruthy();
      expect(parsed.executionGate.deferredSpecialists).toEqual([
        'security-specialist',
        'performance-specialist',
      ]);
    });

    it('does not gate execution for clear PLAN prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'add unit tests to apps/mcp-server/src/auth/auth.service.ts',
        parallelAgentsRecommendation: {
          specialists: ['test-strategy-specialist'],
          dispatch: 'recommend',
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN add unit tests to apps/mcp-server/src/auth/auth.service.ts',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate).toBeDefined();
      expect(parsed.executionGate.gated).toBe(false);
      expect(parsed.executionGate.deferredSpecialists).toBeUndefined();
    });

    it('ungates when budget is exhausted', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'PLAN',
        originalPrompt: 'improve it',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN improve it',
        question_budget: 0,
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate.gated).toBe(false);
    });

    it('gates in AUTO mode for ambiguous prompt', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: '개선',
        parallelAgentsRecommendation: {
          specialists: ['architecture-specialist'],
          dispatch: 'auto',
        },
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO 개선',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate).toBeDefined();
      expect(parsed.executionGate.gated).toBe(true);
      expect(parsed.executionGate.deferredSpecialists).toEqual(['architecture-specialist']);
    });

    it('does NOT include executionGate for ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate).toBeUndefined();
    });

    it('does NOT include executionGate for EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'review code',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL review code',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.executionGate).toBeUndefined();
    });
  });

  describe('councilScene contract', () => {
    it('should include councilScene with enabled=true in PLAN mode', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design auth feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilScene).toBeDefined();
      expect(parsed.councilScene.enabled).toBe(true);
      expect(parsed.councilScene.format).toBe('tiny-actor-grid');
      expect(parsed.councilScene.moderatorCopy).toEqual(expect.any(String));
      expect(parsed.councilScene.moderatorCopy.length).toBeGreaterThan(0);
      expect(parsed.councilScene.cast).toEqual(expect.any(Array));
      expect(parsed.councilScene.cast.length).toBeGreaterThan(0);
    });

    it('should include councilScene with enabled=true in EVAL mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'EVAL',
        originalPrompt: 'evaluate implementation',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'EVAL evaluate implementation',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilScene).toBeDefined();
      expect(parsed.councilScene.enabled).toBe(true);
      expect(parsed.councilScene.format).toBe('tiny-actor-grid');
      expect(parsed.councilScene.cast).toEqual(expect.any(Array));
      expect(parsed.councilScene.cast.length).toBeGreaterThan(0);
    });

    it('should include councilScene with enabled=true in AUTO mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'AUTO',
        originalPrompt: 'implement dashboard',
        delegates_to: 'agent-architect',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'AUTO implement dashboard',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilScene).toBeDefined();
      expect(parsed.councilScene.enabled).toBe(true);
      expect(parsed.councilScene.format).toBe('tiny-actor-grid');
    });

    it('should NOT include councilScene in ACT mode', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        ...mockParseModeResult,
        mode: 'ACT',
        originalPrompt: 'implement feature',
      });

      const result = await handler.handle('parse_mode', {
        prompt: 'ACT implement feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilScene).toBeUndefined();
    });

    it('councilScene cast members should have name, role, and face', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      expect(parsed.councilScene).toBeDefined();

      for (const member of parsed.councilScene.cast) {
        expect(member.name).toEqual(expect.any(String));
        expect(member.role).toMatch(/^(primary|specialist)$/);
        expect(member.face).toEqual(expect.any(String));
      }
    });

    it('councilScene cast should have exactly one primary in PLAN mode', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      const primaries = parsed.councilScene.cast.filter(
        (m: { role: string }) => m.role === 'primary',
      );
      expect(primaries).toHaveLength(1);
    });

    it('councilScene should be serializable JSON', async () => {
      const result = await handler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse((result?.content[0] as { text: string }).text);
      const reserialized = JSON.stringify(parsed.councilScene);
      expect(JSON.parse(reserialized)).toEqual(parsed.councilScene);
    });
  });
});
