import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModeHandler } from '../mcp/handlers/mode.handler';
import { SessionService } from './session.service';
import { KeywordService } from '../keyword/keyword.service';
import { ConfigService } from '../config/config.service';
import { LanguageService } from '../shared/language.service';
import { ModelResolverService } from '../model/model-resolver.service';
import { StateService } from '../state/state.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Integration tests for Session Lifecycle across PLAN → ACT → EVAL modes.
 *
 * These tests verify that:
 * 1. PLAN mode auto-creates session and adds section
 * 2. ACT mode retrieves session and adds its own section
 * 3. EVAL mode retrieves session and adds its own section
 * 4. All sections are properly accumulated in the session document
 * 5. Session context is available for subsequent modes
 */
describe('Session Lifecycle Integration', () => {
  let modeHandler: ModeHandler;
  let sessionService: SessionService;
  let mockKeywordService: KeywordService;
  let mockConfigService: ConfigService;
  let mockStateService: StateService;
  let mockLanguageService: LanguageService;
  let mockModelResolverService: ModelResolverService;

  let tempDir: string;
  let sessionsDir: string;

  beforeEach(async () => {
    // Create temp directory for session files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'session-lifecycle-'));
    sessionsDir = path.join(tempDir, 'docs', 'codingbuddy', 'sessions');
    await fs.mkdir(sessionsDir, { recursive: true });

    // Create real ConfigService mock that returns temp directory
    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(tempDir), // Synchronous method
      getLanguage: vi.fn().mockResolvedValue('en'),
      reload: vi.fn().mockResolvedValue(undefined),
    } as unknown as ConfigService;

    // Create real SessionService (not mocked)
    sessionService = new SessionService(mockConfigService);

    // Mock KeywordService
    mockKeywordService = {
      parseMode: vi.fn(),
    } as unknown as KeywordService;

    // Mock LanguageService
    mockLanguageService = {
      getLanguageInstruction: vi.fn().mockReturnValue({
        instruction: 'Use English',
        language: 'en',
      }),
    } as unknown as LanguageService;

    // Mock ModelResolverService
    mockModelResolverService = {
      resolveForMode: vi.fn().mockResolvedValue({ model: 'default' }),
    } as unknown as ModelResolverService;

    // Mock StateService
    mockStateService = {
      updateLastMode: vi.fn().mockResolvedValue({ success: true }),
      updateLastSession: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as StateService;

    // Create ModeHandler with real SessionService
    modeHandler = new ModeHandler(
      mockKeywordService,
      mockConfigService,
      mockLanguageService,
      mockModelResolverService,
      sessionService,
      mockStateService,
    );
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Full PLAN → ACT → EVAL cycle', () => {
    it('should accumulate sections across all modes', async () => {
      const taskDescription = 'implement user authentication feature';

      // Step 1: PLAN mode - creates session and adds PLAN section
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'PLAN',
        agent: 'technical-planner',
        originalPrompt: taskDescription,
        instructions: 'Plan the implementation',
        rules: [],
        recommended_act_agent: {
          agentName: 'frontend-developer',
          confidence: 0.85,
        },
      });

      const planResult = await modeHandler.handle('parse_mode', {
        prompt: `PLAN ${taskDescription}`,
      });

      // Verify PLAN mode created session
      expect(planResult).not.toBeNull();
      expect(planResult!.isError).toBeFalsy();

      const planResponse = JSON.parse(planResult!.content[0].text);
      expect(planResponse.autoSession).toBeDefined();
      expect(planResponse.autoSession.created).toBe(true);
      expect(planResponse.autoSession.sessionId).toBeDefined();

      const sessionId = planResponse.autoSession.sessionId;

      // Verify session has PLAN section
      const sessionAfterPlan = await sessionService.getSession(sessionId);
      expect(sessionAfterPlan).not.toBeNull();
      expect(sessionAfterPlan!.sections).toHaveLength(1);
      expect(sessionAfterPlan!.sections[0].mode).toBe('PLAN');
      expect(sessionAfterPlan!.sections[0].primaryAgent).toBe(
        'technical-planner',
      );
      expect(sessionAfterPlan!.sections[0].task).toBe(taskDescription);
      expect(sessionAfterPlan!.sections[0].recommendedActAgent).toBe(
        'frontend-developer',
      );

      // Step 2: ACT mode - adds ACT section to existing session
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'ACT',
        agent: 'frontend-developer',
        originalPrompt: 'implement the feature',
        instructions: 'Execute the implementation',
        rules: [],
      });

      const actResult = await modeHandler.handle('parse_mode', {
        prompt: 'ACT implement the feature',
        recommended_agent: 'frontend-developer',
      });

      expect(actResult).not.toBeNull();
      expect(actResult!.isError).toBeFalsy();

      const actResponse = JSON.parse(actResult!.content[0].text);
      expect(actResponse.autoSession).toBeDefined();
      expect(actResponse.autoSession.created).toBe(false); // Reuses existing
      expect(actResponse.autoSession.sessionId).toBe(sessionId);
      expect(actResponse.sessionContext).toBeDefined();

      // Verify session has both PLAN and ACT sections
      const sessionAfterAct = await sessionService.getSession(sessionId);
      expect(sessionAfterAct).not.toBeNull();
      expect(sessionAfterAct!.sections).toHaveLength(2);
      expect(sessionAfterAct!.sections[0].mode).toBe('PLAN');
      expect(sessionAfterAct!.sections[1].mode).toBe('ACT');
      expect(sessionAfterAct!.sections[1].primaryAgent).toBe(
        'frontend-developer',
      );

      // Step 3: EVAL mode - adds EVAL section
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'EVAL',
        agent: 'code-reviewer',
        originalPrompt: 'evaluate the implementation',
        instructions: 'Review the implementation',
        rules: [],
      });

      const evalResult = await modeHandler.handle('parse_mode', {
        prompt: 'EVAL evaluate the implementation',
      });

      expect(evalResult).not.toBeNull();
      expect(evalResult!.isError).toBeFalsy();

      const evalResponse = JSON.parse(evalResult!.content[0].text);
      expect(evalResponse.autoSession).toBeDefined();
      expect(evalResponse.autoSession.sessionId).toBe(sessionId);
      expect(evalResponse.sessionContext).toBeDefined();

      // Verify session has all three sections
      const sessionAfterEval = await sessionService.getSession(sessionId);
      expect(sessionAfterEval).not.toBeNull();
      expect(sessionAfterEval!.sections).toHaveLength(3);
      expect(sessionAfterEval!.sections[0].mode).toBe('PLAN');
      expect(sessionAfterEval!.sections[1].mode).toBe('ACT');
      expect(sessionAfterEval!.sections[2].mode).toBe('EVAL');
      expect(sessionAfterEval!.sections[2].primaryAgent).toBe('code-reviewer');
    });

    it('should provide session context with aggregated decisions and notes', async () => {
      // Create session with PLAN section
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'PLAN',
        agent: 'technical-planner',
        originalPrompt: 'design API endpoints',
        instructions: 'Plan the API design',
        rules: [],
        recommended_act_agent: {
          agentName: 'backend-developer',
          confidence: 0.9,
        },
      });

      const planResult = await modeHandler.handle('parse_mode', {
        prompt: 'PLAN design API endpoints',
      });
      const sessionId = JSON.parse(planResult!.content[0].text).autoSession
        .sessionId;

      // Manually update session with decisions and notes
      await sessionService.updateSession({
        sessionId,
        section: {
          mode: 'PLAN',
          status: 'completed',
          decisions: ['Use REST API', 'JWT for auth'],
          notes: ['Consider rate limiting', 'Document endpoints'],
        },
      });

      // ACT mode should receive session context with decisions
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'ACT',
        agent: 'backend-developer',
        originalPrompt: 'implement API',
        instructions: 'Execute the implementation',
        rules: [],
      });

      const actResult = await modeHandler.handle('parse_mode', {
        prompt: 'ACT implement API',
      });

      const actResponse = JSON.parse(actResult!.content[0].text);
      expect(actResponse.sessionContext).toBeDefined();
      expect(actResponse.sessionContext.allDecisions).toContain('Use REST API');
      expect(actResponse.sessionContext.allDecisions).toContain('JWT for auth');
      expect(actResponse.sessionContext.allNotes).toContain(
        'Consider rate limiting',
      );
      expect(actResponse.sessionContext.recommendedActAgent).toBeDefined();
      expect(actResponse.sessionContext.recommendedActAgent.agent).toBe(
        'backend-developer',
      );
    });
  });

  describe('Session file persistence', () => {
    it('should persist session document as markdown file', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'PLAN',
        agent: 'technical-planner',
        originalPrompt: 'create user dashboard',
        instructions: 'Plan the dashboard',
        rules: [],
      });

      const result = await modeHandler.handle('parse_mode', {
        prompt: 'PLAN create user dashboard',
      });

      const sessionId = JSON.parse(result!.content[0].text).autoSession
        .sessionId;

      // Verify file exists
      const filePath = path.join(sessionsDir, `${sessionId}.md`);
      const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('# Session:');
      expect(content).toContain('PLAN');
      expect(content).toContain('technical-planner');
      expect(content).toContain('create user dashboard');
    });
  });

  describe('Edge cases', () => {
    it('should handle ACT mode without prior PLAN session gracefully', async () => {
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'ACT',
        agent: 'frontend-developer',
        originalPrompt: 'quick fix',
        instructions: 'Execute the fix',
        rules: [],
      });

      const result = await modeHandler.handle('parse_mode', {
        prompt: 'ACT quick fix',
      });

      const response = JSON.parse(result!.content[0].text);
      // Should have warning about no active session
      expect(response.sessionWarning).toBeDefined();
      expect(response.sessionWarning).toContain('No active session');
    });

    it('should merge sections for same mode call (not create duplicates)', async () => {
      // Create PLAN session
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'PLAN',
        agent: 'technical-planner',
        originalPrompt: 'design feature',
        instructions: 'Plan the feature',
        rules: [],
      });

      const firstResult = await modeHandler.handle('parse_mode', {
        prompt: 'PLAN design feature',
      });
      const sessionId = JSON.parse(firstResult!.content[0].text).autoSession
        .sessionId;

      // Call PLAN again (simulating re-entry to PLAN mode)
      mockKeywordService.parseMode = vi.fn().mockResolvedValue({
        mode: 'PLAN',
        agent: 'technical-planner',
        originalPrompt: 'continue design',
        instructions: 'Continue planning',
        rules: [],
      });

      const secondResult = await modeHandler.handle('parse_mode', {
        prompt: 'PLAN continue design',
      });

      // Should reuse same session (not create new one)
      const secondSessionId = JSON.parse(secondResult!.content[0].text)
        .autoSession.sessionId;
      expect(secondSessionId).toBe(sessionId);

      // Session should have only 1 PLAN section (merged via mergeSection)
      const session = await sessionService.getSession(sessionId);
      expect(session).not.toBeNull();
      // mergeSection combines sections of the same mode
      expect(session!.sections.filter(s => s.mode === 'PLAN')).toHaveLength(1);
      // The task should be updated to the latest prompt
      expect(session!.sections[0].task).toBe('continue design');
    });
  });
});
