import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { KeywordService } from '../../keyword/keyword.service';
import { KEYWORD_SERVICE } from '../../keyword/keyword.module';
import { ConfigService } from '../../config/config.service';
import { LanguageService } from '../../shared/language.service';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { ModelResolverService } from '../../model';
import { extractRequiredString } from '../../shared/validation.constants';
import { generateSlug } from '../../shared/slug.utils';
import { SessionService } from '../../session/session.service';
import { StateService } from '../../state/state.service';
import type {
  SessionContext,
  SessionDocument,
} from '../../session/session.types';
import type { Mode } from '../../keyword/keyword.types';

/** Maximum length for session title slug generation */
const SESSION_TITLE_MAX_LENGTH = 50;

/** Path prefix for session files */
const SESSION_PATH_PREFIX = 'docs/codingbuddy/sessions/';

/** Modes that trigger auto-session creation */
const AUTO_CREATE_MODES = ['PLAN', 'AUTO'] as const;

/**
 * Session warning messages (centralized for i18n support)
 */
const SESSION_WARNINGS = {
  NO_ACTIVE_SESSION:
    '⚠️ No active session found. PLAN context may be lost. Consider calling get_active_session or create_session.',
  USING_EXISTING_SESSION:
    '📋 Using existing active session. Call update_session to add PLAN details.',
  SESSION_CREATION_FAILED:
    '⚠️ Failed to auto-create session. Please call create_session manually.',
  SESSION_CREATION_FAILED_WITH_ERROR: (error: string) =>
    `⚠️ Failed to auto-create session: ${error}. Please call create_session manually.`,
} as const;

/** Auto-created session info */
interface AutoSessionInfo {
  sessionId: string;
  filePath: string;
  created: boolean;
}

/** Result type for session handling methods */
interface SessionResult {
  autoSession?: AutoSessionInfo;
  sessionWarning?: string;
  /** Session context for AI to read previous mode information */
  sessionContext?: SessionContext;
}

/**
 * Handler for mode parsing tool
 * - parse_mode: Parse PLAN/ACT/EVAL workflow mode from user prompt
 */
@Injectable()
export class ModeHandler extends AbstractHandler {
  private readonly logger = new Logger(ModeHandler.name);

  constructor(
    @Inject(KEYWORD_SERVICE) private readonly keywordService: KeywordService,
    private readonly configService: ConfigService,
    private readonly languageService: LanguageService,
    private readonly modelResolverService: ModelResolverService,
    private readonly sessionService: SessionService,
    private readonly stateService: StateService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['parse_mode'];
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'parse_mode',
        description:
          'MANDATORY: When user message starts with PLAN, ACT, or EVAL keyword (or localized equivalents: Korean 계획/실행/평가, Japanese 計画/実行/評価, Chinese 计划/执行/评估, Spanish PLANIFICAR/ACTUAR/EVALUAR), you MUST call this tool FIRST before any other action. This tool parses the workflow mode and returns critical rules that MUST be followed. Failure to call this tool when these keywords are present is a protocol violation.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'User prompt that may start with PLAN/ACT/EVAL keyword',
            },
            recommended_agent: {
              type: 'string',
              description:
                'ACT agent recommended from previous PLAN mode. Pass the agentName from recommended_act_agent field of PLAN mode response. Only applies to ACT mode.',
            },
          },
          required: ['prompt'],
        },
      },
    ];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    const prompt = extractRequiredString(args, 'prompt');
    if (prompt === null) {
      return createErrorResponse('Missing required parameter: prompt');
    }

    // Extract optional recommended_agent (extractRequiredString returns null if empty/whitespace)
    const recommendedAgent =
      extractRequiredString(args, 'recommended_agent') ?? undefined;

    try {
      // Always reload config to ensure fresh language settings
      // This prevents stale config from MCP server startup location issues
      await this.configService.reload();

      const options = recommendedAgent
        ? { recommendedActAgent: recommendedAgent }
        : undefined;
      const result = await this.keywordService.parseMode(prompt, options);
      const language = await this.configService.getLanguage();
      const languageInstructionResult =
        this.languageService.getLanguageInstruction(language || 'en');
      const resolvedModel = await this.modelResolverService.resolveForMode(
        result.agent,
      );

      // B: Auto-create session for PLAN mode
      const sessionInfo = await this.handleAutoSession(
        result.mode,
        result.originalPrompt,
      );

      // C: Auto-add mode section to session document
      if (sessionInfo.autoSession?.sessionId && result.agent) {
        await this.autoAddModeSection(
          sessionInfo.autoSession.sessionId,
          result.mode as Mode,
          result.agent,
          result.originalPrompt,
          result.recommended_act_agent,
        );
      } else if (sessionInfo.autoSession?.sessionId && !result.agent) {
        this.logger.debug(
          `Skipping auto-add section: agent is undefined for mode ${result.mode}`,
        );
      }

      // Persist state for context recovery after compaction
      await this.persistModeState(
        result.mode,
        sessionInfo.autoSession?.sessionId,
      );

      return createJsonResponse({
        ...result,
        language,
        languageInstruction: languageInstructionResult.instruction,
        resolvedModel,
        ...sessionInfo,
      });
    } catch (error) {
      return createErrorResponse(
        `Failed to parse mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /** Empty session result constant for methods returning no session info */
  private readonly emptySessionResult: SessionResult = {};

  /**
   * B: Auto-create session for PLAN and AUTO modes
   * D: Add warning if session exists or creation fails
   */
  private async handleAutoSession(
    mode: string,
    originalPrompt: string,
  ): Promise<SessionResult> {
    // Only auto-create for PLAN and AUTO modes
    if (
      !AUTO_CREATE_MODES.includes(mode as (typeof AUTO_CREATE_MODES)[number])
    ) {
      return this.checkActiveSessionForNonCreateModes(mode);
    }

    try {
      return await this.handleSessionCreation(originalPrompt);
    } catch (error) {
      return this.handleSessionCreationError(error);
    }
  }

  /**
   * D: Check if active session exists for ACT/EVAL modes
   * Now also includes session context for AI to read previous mode information
   */
  private async checkActiveSessionForNonCreateModes(
    mode: string,
  ): Promise<SessionResult> {
    if (mode === 'ACT' || mode === 'EVAL') {
      const activeSession = await this.sessionService.getActiveSession();
      if (!activeSession) {
        return {
          sessionWarning: SESSION_WARNINGS.NO_ACTIVE_SESSION,
        };
      }
      // Include session context for AI to read previous mode information
      return {
        autoSession: {
          sessionId: activeSession.metadata.id,
          filePath: `${SESSION_PATH_PREFIX}${activeSession.metadata.id}.md`,
          created: false,
        },
        sessionContext: this.buildSessionContext(activeSession),
      };
    }
    return this.emptySessionResult;
  }

  /**
   * Build session context from session document.
   * Aggregates all decisions and notes from all sections.
   */
  private buildSessionContext(session: SessionDocument): SessionContext {
    const allDecisions: string[] = [];
    const allNotes: string[] = [];

    // Aggregate decisions and notes from all sections
    for (const section of session.sections) {
      if (section.decisions) {
        allDecisions.push(...section.decisions);
      }
      if (section.notes) {
        allNotes.push(...section.notes);
      }
    }

    // Find recommended ACT agent from PLAN section
    const planSection = session.sections.find(s => s.mode === 'PLAN');
    const recommendedActAgent =
      planSection?.recommendedActAgent &&
      planSection.recommendedActAgentConfidence
        ? {
            agent: planSection.recommendedActAgent,
            confidence: planSection.recommendedActAgentConfidence,
          }
        : undefined;

    return {
      sessionId: session.metadata.id,
      title: session.metadata.title,
      previousSections: session.sections,
      recommendedActAgent,
      allDecisions,
      allNotes,
    };
  }

  /**
   * Handle session creation: check existing or create new
   */
  private async handleSessionCreation(
    originalPrompt: string,
  ): Promise<SessionResult> {
    // Check if there's already an active session
    const existingSession = await this.sessionService.getActiveSession();
    if (existingSession) {
      return this.handleExistingSession(existingSession);
    }

    // Create new session
    const title = this.generateSessionTitle(originalPrompt);
    return this.createNewSession(title);
  }

  /**
   * Handle existing active session case
   * Now also includes session context
   */
  private async handleExistingSession(
    session: SessionDocument,
  ): Promise<SessionResult> {
    this.logger.debug(`Active session already exists: ${session.metadata.id}`);
    return {
      autoSession: {
        sessionId: session.metadata.id,
        filePath: `${SESSION_PATH_PREFIX}${session.metadata.id}.md`,
        created: false,
      },
      sessionWarning: SESSION_WARNINGS.USING_EXISTING_SESSION,
      sessionContext: this.buildSessionContext(session),
    };
  }

  /**
   * Create a new session
   */
  private async createNewSession(title: string): Promise<SessionResult> {
    const createResult = await this.sessionService.createSession({ title });

    if (createResult.success && createResult.sessionId) {
      this.logger.log(`Auto-created session: ${createResult.sessionId}`);
      return {
        autoSession: {
          sessionId: createResult.sessionId,
          filePath: createResult.filePath || '',
          created: true,
        },
      };
    }

    return {
      sessionWarning: SESSION_WARNINGS.SESSION_CREATION_FAILED_WITH_ERROR(
        createResult.error || 'Unknown error',
      ),
    };
  }

  /**
   * Handle session creation errors
   */
  private handleSessionCreationError(error: unknown): SessionResult {
    this.logger.error(
      `Failed to auto-create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return {
      sessionWarning: SESSION_WARNINGS.SESSION_CREATION_FAILED,
    };
  }

  /**
   * Generate session title from prompt using shared slug utility.
   */
  private generateSessionTitle(prompt: string): string {
    const slug = generateSlug(prompt, SESSION_TITLE_MAX_LENGTH);
    // Maintain backward compatibility: 'untitled' from shared utility becomes 'untitled-session'
    return slug === 'untitled' ? 'untitled-session' : slug;
  }

  /**
   * Persist mode state for context recovery after compaction
   * Option C (Hybrid approach): Document files for important state
   */
  private async persistModeState(
    mode: string,
    sessionId?: string,
  ): Promise<void> {
    try {
      // Update last mode
      await this.stateService.updateLastMode(
        mode as 'PLAN' | 'ACT' | 'EVAL' | 'AUTO',
      );

      // Update last session if available
      if (sessionId) {
        await this.stateService.updateLastSession(sessionId);
      }

      this.logger.debug(
        `Persisted mode state: mode=${mode}, sessionId=${sessionId || 'none'}`,
      );
    } catch (error) {
      // Log but don't fail - state persistence is best-effort
      this.logger.warn(
        `Failed to persist mode state: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * C: Auto-add mode section to session document
   * Automatically adds a section for the current mode with basic metadata.
   * This ensures session documents always track mode transitions.
   */
  private async autoAddModeSection(
    sessionId: string,
    mode: Mode,
    primaryAgent: string,
    task: string,
    recommendedActAgent?: { agentName: string; confidence: number },
  ): Promise<void> {
    try {
      await this.sessionService.updateSession({
        sessionId,
        section: {
          mode,
          primaryAgent,
          task,
          recommendedActAgent: recommendedActAgent?.agentName,
          recommendedActAgentConfidence: recommendedActAgent?.confidence,
          status: 'in_progress',
        },
      });

      this.logger.debug(`Auto-added ${mode} section to session ${sessionId}`);
    } catch (error) {
      // Log but don't fail - section auto-add is best-effort
      this.logger.warn(
        `Failed to auto-add mode section: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
