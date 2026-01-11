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
import { SessionService } from '../../session/session.service';

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
    }
    return this.emptySessionResult;
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
      return this.handleExistingSession(existingSession.metadata.id);
    }

    // Create new session
    const title = this.generateSessionTitle(originalPrompt);
    return this.createNewSession(title);
  }

  /**
   * Handle existing active session case
   */
  private handleExistingSession(sessionId: string): Required<SessionResult> {
    this.logger.debug(`Active session already exists: ${sessionId}`);
    return {
      autoSession: {
        sessionId,
        filePath: `${SESSION_PATH_PREFIX}${sessionId}.md`,
        created: false,
      },
      sessionWarning: SESSION_WARNINGS.USING_EXISTING_SESSION,
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
   * Generate session title from prompt
   */
  private generateSessionTitle(prompt: string): string {
    // Take first N chars, remove special chars, convert to slug
    const truncated = prompt.slice(0, SESSION_TITLE_MAX_LENGTH).trim();
    const slug = truncated
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-|-$/g, '');

    return slug || 'untitled-session';
  }
}
