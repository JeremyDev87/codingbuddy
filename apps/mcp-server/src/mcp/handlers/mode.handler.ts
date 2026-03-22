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
import { StateService } from '../../state/state.service';
import { ContextDocumentService } from '../../context/context-document.service';
import { DiagnosticLogService } from '../../diagnostic/diagnostic-log.service';
import { CONTEXT_FILE_PATH, type ContextDocument } from '../../context/context-document.types';
import { LOCALIZED_KEYWORD_MAP } from '../../keyword/keyword.types';
import {
  MODE_DISPATCH_DEFAULTS,
  type Mode,
  type DispatchReady,
  type DispatchReadyAgent,
  type DispatchStrength,
  type IncludedAgent,
  type ParallelAgentRecommendation,
} from '../../keyword/keyword.types';
import { isValidVerbosity } from '../../shared/verbosity.types';
import { AgentService } from '../../agent/agent.service';

/** Maximum length for context title slug generation */
const CONTEXT_TITLE_MAX_LENGTH = 50;

/** Result type for context document handling */
interface ContextResult {
  /** Path to the context file */
  contextFilePath: string;
  /** Whether context was found/created */
  contextExists: boolean;
  /** The context document content */
  contextDocument?: ContextDocument;
  /** Warning message if any */
  contextWarning?: string;
  /** Mandatory action for AI */
  mandatoryAction: string;
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
    private readonly stateService: StateService,
    private readonly contextDocService: ContextDocumentService,
    private readonly diagnosticLogService: DiagnosticLogService,
    private readonly agentService: AgentService,
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
          'MANDATORY: When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized equivalents: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO), you MUST call this tool FIRST before any other action. This tool parses the workflow mode and returns critical rules that MUST be followed. Failure to call this tool when these keywords are present is a protocol violation.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'User prompt that may start with PLAN/ACT/EVAL keyword',
            },
            recommended_agent: {
              type: 'string',
              description:
                'ACT agent recommended from previous PLAN mode. Pass the agentName from recommended_act_agent field of PLAN mode response. Only applies to ACT mode.',
            },
            verbosity: {
              type: 'string',
              enum: ['minimal', 'standard', 'full'],
              description:
                'Control response detail level. minimal: metadata only; standard: truncated content (default); full: complete content',
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
    const recommendedAgent = extractRequiredString(args, 'recommended_agent') ?? undefined;

    // Extract and validate optional verbosity (defaults to 'standard')
    const rawVerbosity = extractRequiredString(args, 'verbosity') ?? 'standard';
    const verbosity = isValidVerbosity(rawVerbosity) ? rawVerbosity : 'standard';

    try {
      // Always reload config to ensure fresh language settings
      // This prevents stale config from MCP server startup location issues
      await this.configService.reload();

      // ACT mode: pre-read context to inherit recommendedActAgent if not explicitly provided
      let resolvedRecommendedAgent = recommendedAgent;
      const firstWord = prompt.trim().split(/\s+/)[0] ?? '';
      const isActKeyword =
        firstWord.toUpperCase() === 'ACT' ||
        LOCALIZED_KEYWORD_MAP[firstWord] === 'ACT' ||
        LOCALIZED_KEYWORD_MAP[firstWord.toUpperCase()] === 'ACT';
      if (isActKeyword && !resolvedRecommendedAgent) {
        const ctxResult = await this.contextDocService.readContext();
        const sections = ctxResult.document?.sections ?? [];
        const lastPlan = [...sections].reverse().find(s => s.mode === 'PLAN' || s.mode === 'AUTO');
        if (lastPlan?.recommendedActAgent) {
          resolvedRecommendedAgent = lastPlan.recommendedActAgent;
        }
      }

      const options = {
        ...(resolvedRecommendedAgent && { recommendedActAgent: resolvedRecommendedAgent }),
        verbosity,
      };
      const result = await this.keywordService.parseMode(prompt, options);

      // Get language with diagnostic logging
      const configLanguage = await this.configService.getLanguage();
      const projectRoot = this.configService.getProjectRoot();

      // Log language resolution for debugging config loading issues
      if (!configLanguage) {
        this.logger.warn(
          `No language found in config. Project root: ${projectRoot}. ` +
            `Please check if codingbuddy.config.json exists and has 'language' field.`,
        );
        // File-based diagnostic logging for config loading failures
        await this.diagnosticLogService.logConfigLoading(
          false,
          projectRoot,
          undefined,
          'No language found in config',
        );
      } else {
        this.logger.debug(
          `Language resolved from config: ${configLanguage} (project root: ${projectRoot})`,
        );
        // File-based diagnostic logging for successful config loading
        await this.diagnosticLogService.logConfigLoading(true, projectRoot, configLanguage);
      }

      // Diagnostic: Warn when project root was auto-detected and config may be wrong
      const projectRootSource = this.configService.getProjectRootSource();
      const isAutoDetectedWithoutConfig =
        projectRootSource === 'auto_detect' &&
        !configLanguage &&
        !this.configService.isConfigLoaded();
      const projectRootWarning = isAutoDetectedWithoutConfig
        ? `⚠️ Project root was auto-detected as "${projectRoot}" but no codingbuddy.config.json was found. ` +
          `This usually means the MCP server is running from a different directory than your project. ` +
          `Fix: Set CODINGBUDDY_PROJECT_ROOT environment variable in your MCP client config. ` +
          `Example: "env": { "CODINGBUDDY_PROJECT_ROOT": "/absolute/path/to/your/project" }`
        : undefined;

      // Use config language, fallback to 'en' only if not configured
      const language = configLanguage || 'en';
      const languageInstructionResult = this.languageService.getLanguageInstruction(language);
      const resolvedModel = await this.modelResolverService.resolve();

      // Handle context document (mandatory)
      const contextResult = await this.handleContextDocument(
        result.mode as Mode,
        result.originalPrompt,
        result.agent,
        result.recommended_act_agent,
      );

      // Persist state for context recovery after compaction
      await this.persistModeState(result.mode);

      // Enrich parallelAgentsRecommendation with dispatch strength
      if (result.parallelAgentsRecommendation) {
        const settings = await this.configService.getSettings();
        const configDispatch = settings.ai?.dispatchStrength as DispatchStrength | undefined;
        result.parallelAgentsRecommendation.dispatch =
          configDispatch ?? MODE_DISPATCH_DEFAULTS[result.mode as Mode] ?? 'recommend';
      }

      // Build dispatchReady from included_agent and parallelAgentsRecommendation
      // Only include parallel agent prompts when verbosity is 'full' (token efficiency)
      const dispatchReady = await this.buildDispatchReady(
        result.included_agent,
        verbosity === 'full' ? result.parallelAgentsRecommendation : undefined,
        result.mode as Mode,
        result.originalPrompt,
      );

      return createJsonResponse({
        ...result,
        language,
        languageInstruction: languageInstructionResult.instruction,
        resolvedModel,
        // Include dispatch-ready data when available
        ...(dispatchReady && { dispatchReady }),
        // Include context document info (mandatory)
        ...contextResult,
        // Include project root warning when auto-detected and config missing
        ...(projectRootWarning && { projectRootWarning }),
      });
    } catch (error) {
      return createErrorResponse(
        `Failed to parse mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Handle context document based on mode.
   * - PLAN: Reset context (fresh start)
   * - ACT/EVAL: Read existing context (require PLAN first)
   */
  private async handleContextDocument(
    mode: Mode,
    originalPrompt: string,
    agent?: string,
    recommendedActAgent?: { agentName: string; confidence: number },
  ): Promise<ContextResult> {
    const title = this.generateContextTitle(originalPrompt);

    if (mode === 'PLAN' || mode === 'AUTO') {
      // PLAN/AUTO mode: Reset context document
      const result = await this.contextDocService.resetContext({
        title,
        task: originalPrompt,
        primaryAgent: agent,
        recommendedActAgent: recommendedActAgent?.agentName,
        recommendedActAgentConfidence: recommendedActAgent?.confidence,
      });

      if (!result.success) {
        this.logger.warn(`Failed to reset context: ${result.error}`);
        return {
          contextFilePath: CONTEXT_FILE_PATH,
          contextExists: false,
          contextWarning: `⚠️ Failed to create context document: ${result.error}`,
          mandatoryAction: '📝 Call update_context tool manually to create context document.',
        };
      }

      this.logger.log('Context document reset for PLAN mode');
      return {
        contextFilePath: CONTEXT_FILE_PATH,
        contextExists: true,
        contextDocument: result.document,
        mandatoryAction:
          '📝 MANDATORY: Call update_context before completion to persist decisions and notes.',
      };
    }

    // ACT/EVAL mode: Read existing context
    const readResult = await this.contextDocService.readContext();

    if (!readResult.exists || !readResult.document) {
      this.logger.warn('No context document found for ACT/EVAL mode');
      return {
        contextFilePath: CONTEXT_FILE_PATH,
        contextExists: false,
        contextWarning: '⚠️ No context document found. Run PLAN mode first to create context.',
        mandatoryAction: '📝 Start with PLAN mode to initialize context, then switch to ACT/EVAL.',
      };
    }

    // Append mode section to context
    const appendResult = await this.contextDocService.appendContext({
      mode,
      task: originalPrompt || `${mode} mode execution`,
      primaryAgent: agent,
      ...(recommendedActAgent && {
        recommendedActAgent: recommendedActAgent.agentName,
        recommendedActAgentConfidence: recommendedActAgent.confidence,
      }),
      status: 'in_progress',
    });

    return {
      contextFilePath: CONTEXT_FILE_PATH,
      contextExists: true,
      contextDocument: appendResult.document || readResult.document,
      mandatoryAction:
        '📝 MANDATORY: Call update_context before completion to persist progress and notes.',
    };
  }

  /**
   * Generate context title from prompt using shared slug utility.
   */
  private generateContextTitle(prompt: string): string {
    const slug = generateSlug(prompt, CONTEXT_TITLE_MAX_LENGTH);
    return slug === 'untitled' ? 'untitled-context' : slug;
  }

  /**
   * Build dispatchReady data from included agent and parallel recommendations.
   * Returns undefined if no agents are available for dispatch.
   */
  private async buildDispatchReady(
    includedAgent?: IncludedAgent,
    parallelRecommendation?: ParallelAgentRecommendation,
    mode?: Mode,
    taskDescription?: string,
  ): Promise<DispatchReady | undefined> {
    if (!includedAgent && !parallelRecommendation) {
      return undefined;
    }

    const dispatchReady: DispatchReady = {};
    const currentMode: Mode = mode || 'PLAN';

    // Build primary agent dispatch params from included_agent
    if (includedAgent) {
      const agentId = generateSlug(includedAgent.name);
      const description = `${includedAgent.name} - ${currentMode} mode`;
      dispatchReady.primaryAgent = {
        name: agentId,
        displayName: includedAgent.name,
        description,
        dispatchParams: {
          subagent_type: 'general-purpose',
          prompt: includedAgent.systemPrompt,
          description,
        },
      };
    }

    // Build parallel agents dispatch params from recommendation
    if (parallelRecommendation?.specialists?.length) {
      try {
        const result = await this.agentService.dispatchAgents({
          mode: currentMode,
          specialists: parallelRecommendation.specialists,
          includeParallel: true,
          taskDescription,
        });

        if (result.parallelAgents?.length) {
          dispatchReady.parallelAgents = result.parallelAgents.map(
            (agent): DispatchReadyAgent => ({
              name: agent.name,
              displayName: agent.displayName,
              description: agent.description,
              dispatchParams: agent.dispatchParams,
            }),
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to build parallel dispatch data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Return undefined if nothing was built
    if (!dispatchReady.primaryAgent && !dispatchReady.parallelAgents) {
      return undefined;
    }

    return dispatchReady;
  }

  /**
   * Persist mode state for context recovery after compaction
   */
  private async persistModeState(mode: string): Promise<void> {
    try {
      await this.stateService.updateLastMode(mode as 'PLAN' | 'ACT' | 'EVAL' | 'AUTO');

      this.logger.debug(`Persisted mode state: mode=${mode}`);
    } catch (error) {
      // Log but don't fail - state persistence is best-effort
      this.logger.warn(
        `Failed to persist mode state for mode=${mode}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
