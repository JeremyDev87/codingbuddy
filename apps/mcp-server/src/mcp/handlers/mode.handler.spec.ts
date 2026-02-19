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
      reload: vi.fn().mockResolvedValue({}),
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

    handler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
      mockStateService,
      mockContextDocService,
      mockDiagnosticLogService,
      mockAgentService as AgentService,
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
});
