import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeHandler } from './mode.handler';
import { KeywordService } from '../../keyword/keyword.service';
import { ConfigService } from '../../config/config.service';
import { LanguageService } from '../../shared/language.service';
import { ModelResolverService } from '../../model';
import { StateService } from '../../state/state.service';
import { ContextDocumentService } from '../../context/context-document.service';
import { DiagnosticLogService } from '../../diagnostic/diagnostic-log.service';

describe('ModeHandler', () => {
  let handler: ModeHandler;
  let mockKeywordService: KeywordService;
  let mockConfigService: ConfigService;
  let mockLanguageService: LanguageService;
  let mockModelResolverService: ModelResolverService;
  let mockStateService: StateService;
  let mockContextDocService: ContextDocumentService;
  let mockDiagnosticLogService: DiagnosticLogService;

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
      resolveForMode: vi.fn().mockResolvedValue({
        model: 'claude-sonnet-4-20250514',
        source: 'system',
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

    handler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
      mockStateService,
      mockContextDocService,
      mockDiagnosticLogService,
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
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'PLAN test task',
          { verbosity: 'standard' },
        );
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
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'ACT implement feature',
          { recommendedActAgent: 'frontend-developer', verbosity: 'standard' },
        );
      });

      it('should ignore empty recommended_agent', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: '   ',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'ACT implement feature',
          { verbosity: 'standard' },
        );
      });

      it('should ignore non-string recommended_agent', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
          recommended_agent: 123,
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'ACT implement feature',
          { verbosity: 'standard' },
        );
      });

      it('should pass verbosity when provided', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN design feature',
          verbosity: 'minimal',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'PLAN design feature',
          { verbosity: 'minimal' },
        );
      });

      it('should use standard verbosity as default', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN design feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockKeywordService.parseMode).toHaveBeenCalledWith(
          'PLAN design feature',
          { verbosity: 'standard' },
        );
      });

      it('should reload config before getting language to ensure fresh settings', async () => {
        await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        // Verify reload is called
        expect(mockConfigService.reload).toHaveBeenCalled();

        // Verify reload is called before getLanguage
        const reloadCallOrder =
          (mockConfigService.reload as ReturnType<typeof vi.fn>).mock
            .invocationCallOrder[0] ?? 0;
        const getLanguageCallOrder =
          (mockConfigService.getLanguage as ReturnType<typeof vi.fn>).mock
            .invocationCallOrder[0] ?? 0;
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
        mockKeywordService.parseMode = vi
          .fn()
          .mockRejectedValue(new Error('Parse error'));

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test',
        });

        expect(result?.isError).toBe(true);
        expect(result?.content[0]).toMatchObject({
          type: 'text',
          text: expect.stringContaining('Parse error'),
        });
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
        expect(response.contextWarning).toContain(
          'Failed to create context document',
        );
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
