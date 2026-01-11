import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModeHandler } from './mode.handler';
import { KeywordService } from '../../keyword/keyword.service';
import { ConfigService } from '../../config/config.service';
import { LanguageService } from '../../shared/language.service';
import { ModelResolverService } from '../../model';
import { SessionService } from '../../session/session.service';

describe('ModeHandler', () => {
  let handler: ModeHandler;
  let mockKeywordService: KeywordService;
  let mockConfigService: ConfigService;
  let mockLanguageService: LanguageService;
  let mockModelResolverService: ModelResolverService;
  let mockSessionService: SessionService;

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

    mockSessionService = {
      createSession: vi.fn().mockResolvedValue({
        success: true,
        sessionId: '2026-01-11-test-task',
        filePath: 'docs/codingbuddy/sessions/2026-01-11-test-task.md',
      }),
      getActiveSession: vi.fn().mockResolvedValue(null),
      getSession: vi.fn().mockResolvedValue(null),
      updateSession: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as SessionService;

    handler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
      mockSessionService,
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
          undefined,
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
          { recommendedActAgent: 'frontend-developer' },
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
          undefined,
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
          undefined,
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

  describe('auto-session (B+D)', () => {
    describe('PLAN mode', () => {
      it('should auto-create session', async () => {
        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN implement auth feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockSessionService.createSession).toHaveBeenCalled();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.autoSession).toBeDefined();
        expect(response.autoSession.created).toBe(true);
        expect(response.autoSession.sessionId).toBe('2026-01-11-test-task');
      });

      it('should use existing session if active session exists', async () => {
        mockSessionService.getActiveSession = vi.fn().mockResolvedValue({
          metadata: {
            id: 'existing-session',
            title: 'Existing Session',
            status: 'active',
          },
          sections: [],
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN another task',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockSessionService.createSession).not.toHaveBeenCalled();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.autoSession.sessionId).toBe('existing-session');
        expect(response.autoSession.created).toBe(false);
        expect(response.sessionWarning).toContain('existing active session');
      });

      it('should generate slug from prompt for session title', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'PLAN',
          originalPrompt: 'Implement User Authentication!',
        });

        await handler.handle('parse_mode', {
          prompt: 'PLAN Implement User Authentication!',
        });

        expect(mockSessionService.createSession).toHaveBeenCalledWith({
          title: expect.stringMatching(/implement-user-authentication/i),
        });
      });

      it('should preserve Korean characters in session title', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'PLAN',
          originalPrompt: '사용자 인증 기능 구현',
        });

        await handler.handle('parse_mode', {
          prompt: 'PLAN 사용자 인증 기능 구현',
        });

        expect(mockSessionService.createSession).toHaveBeenCalledWith({
          title: expect.stringMatching(/사용자-인증-기능-구현/),
        });
      });

      it('should return untitled-session for empty prompt', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'PLAN',
          originalPrompt: '',
        });

        await handler.handle('parse_mode', {
          prompt: 'PLAN',
        });

        expect(mockSessionService.createSession).toHaveBeenCalledWith({
          title: 'untitled-session',
        });
      });

      it('should return untitled-session for prompt with only special characters', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'PLAN',
          originalPrompt: '!@#$%^&*()',
        });

        await handler.handle('parse_mode', {
          prompt: 'PLAN !@#$%^&*()',
        });

        expect(mockSessionService.createSession).toHaveBeenCalledWith({
          title: 'untitled-session',
        });
      });

      it('should truncate long prompts in session title', async () => {
        const longPrompt = 'a'.repeat(100);
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'PLAN',
          originalPrompt: longPrompt,
        });

        await handler.handle('parse_mode', {
          prompt: `PLAN ${longPrompt}`,
        });

        expect(mockSessionService.createSession).toHaveBeenCalledWith({
          title: expect.stringMatching(/^a{50}$/),
        });
      });

      it('should handle session creation failure gracefully', async () => {
        mockSessionService.createSession = vi.fn().mockResolvedValue({
          success: false,
          error: 'Failed to create session',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'PLAN test task',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.sessionWarning).toContain(
          'Failed to auto-create session',
        );
      });
    });

    describe('AUTO mode', () => {
      it('should auto-create session', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'AUTO',
          originalPrompt: 'implement dashboard feature',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'AUTO implement dashboard feature',
        });

        expect(result?.isError).toBeFalsy();
        expect(mockSessionService.createSession).toHaveBeenCalled();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.autoSession).toBeDefined();
        expect(response.autoSession.created).toBe(true);
      });
    });

    describe('ACT mode', () => {
      it('should warn when no active session exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.sessionWarning).toContain('No active session found');
      });

      it('should not warn when active session exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'ACT',
          originalPrompt: 'implement feature',
        });
        mockSessionService.getActiveSession = vi.fn().mockResolvedValue({
          metadata: { id: 'active-session', status: 'active' },
          sections: [],
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'ACT implement feature',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.sessionWarning).toBeUndefined();
      });
    });

    describe('EVAL mode', () => {
      it('should warn when no active session exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'EVAL',
          originalPrompt: 'evaluate implementation',
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'EVAL evaluate implementation',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.sessionWarning).toContain('No active session found');
      });

      it('should not warn when active session exists', async () => {
        mockKeywordService.parseMode = vi.fn().mockResolvedValue({
          ...mockParseModeResult,
          mode: 'EVAL',
          originalPrompt: 'evaluate implementation',
        });
        mockSessionService.getActiveSession = vi.fn().mockResolvedValue({
          metadata: { id: 'active-session', status: 'active' },
          sections: [],
        });

        const result = await handler.handle('parse_mode', {
          prompt: 'EVAL evaluate implementation',
        });

        expect(result?.isError).toBeFalsy();

        const responseText = result?.content[0]?.text;
        const response = JSON.parse(responseText as string);
        expect(response.sessionWarning).toBeUndefined();
      });
    });
  });
});
