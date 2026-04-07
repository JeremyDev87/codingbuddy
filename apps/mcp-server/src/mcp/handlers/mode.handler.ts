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
  type AgentVisualRaw,
  type VisualData,
  type DispatchReady,
  type DispatchReadyAgent,
  type DispatchStrength,
  type IncludedAgent,
  type ParallelAgentRecommendation,
  type ReviewContext,
} from '../../keyword/keyword.types';
import { buildVisualData, type AgentVisualInput } from '../../keyword/visual-data.builder';
import { isValidVerbosity } from '../../shared/verbosity.types';
import { AgentService } from '../../agent/agent.service';
import { CouncilPresetService } from '../../agent/council-preset.service';
import { TeamsCapabilityService } from '../../agent/teams-capability.service';
import type { TeamsCapabilityStatus } from '../../agent/teams-capability.types';
import {
  buildSimplePlan,
  buildNestedPlan,
  subagentLayer,
  teamsLayer,
  serializeExecutionPlan,
} from '../../agent/execution-plan';
import type { ExecutionPlan } from '../../agent/execution-plan.types';
import { ImpactEventService } from '../../impact';
import { RuleEventCollector } from '../../rules/rule-event-collector';
import { evaluateClarification, type ClarificationMetadata } from './clarification-gate';
import { resolvePlanningStage, type PlanningStageMetadata } from './planning-stage';
import {
  evaluateExecutionGate,
  suppressDispatchWhileGated,
  type ExecutionGate,
} from './execution-gate';
import { buildCouncilScene, buildCouncilSceneInstructions } from './council-scene.builder';

/** Maximum length for context title slug generation */
const CONTEXT_TITLE_MAX_LENGTH = 50;

/** Deep thinking reasoning step */
interface DeepThinkingStep {
  /** Step identifier */
  step: 'decompose' | 'alternatives' | 'devils_advocate';
  /** Instruction for this reasoning step */
  instruction: string;
}

/** Deep thinking instructions for structured reasoning in PLAN/AUTO modes */
interface DeepThinkingInstructions {
  /** Structured reasoning steps */
  reasoning: DeepThinkingStep[];
  /** Instruction to prevent hallucinated references */
  hallucinationPrevention: string;
  /** Instruction for required detail level */
  detailLevel: string;
}

/** Agent discussion configuration for EVAL mode responses */
interface AgentDiscussionConfig {
  /** Whether agent discussion is enabled */
  enabled: boolean;
  /** Format for structuring specialist findings */
  format: 'structured';
  /** Whether to include consensus analysis */
  includeConsensus: boolean;
}

/** Plan review gate recommendation included in PLAN/AUTO mode responses */
interface PlanReviewGate {
  /** Whether the plan review gate is enabled */
  enabled: boolean;
  /** Agent name for plan review */
  agent: string;
  /** Dispatch strength for the gate */
  dispatch: string;
}

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
    private readonly councilPresetService: CouncilPresetService,
    private readonly teamsCapabilityService: TeamsCapabilityService,
    private readonly impactEventService: ImpactEventService,
    private readonly ruleEventCollector: RuleEventCollector,
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
            question_budget: {
              type: 'number',
              description:
                'Clarification Gate budget (#1371). Maximum clarification questions remaining in this session. Defaults to 3 on the first call; pass the `questionBudget` returned from the previous PLAN response to decrement across rounds. When 0, the gate proceeds to planning with explicit assumptions.',
            },
            planning_stage: {
              type: 'string',
              enum: ['discover', 'design', 'plan'],
              description:
                'Staged planning hint (#1372). Overrides automatic stage routing when the caller knows which stage to enter. Use "design" after the user confirms direction from Discover, or "plan" after the user confirms the approach from Design.',
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

    // Extract optional clarification question budget (#1371).
    // Accept only finite numbers; ignore malformed input and let the gate
    // fall back to its DEFAULT_QUESTION_BUDGET.
    const rawQuestionBudget = args?.['question_budget'];
    const questionBudget =
      typeof rawQuestionBudget === 'number' && Number.isFinite(rawQuestionBudget)
        ? rawQuestionBudget
        : undefined;

    // Extract optional planning stage hint (#1372).
    const VALID_STAGES = new Set(['discover', 'design', 'plan']);
    const rawPlanningStage = extractRequiredString(args, 'planning_stage') ?? undefined;
    const planningStageHint =
      rawPlanningStage && VALID_STAGES.has(rawPlanningStage)
        ? (rawPlanningStage as 'discover' | 'design' | 'plan')
        : undefined;

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

      // Load settings once for dispatch strength and plan review gate
      const settings = await this.configService.getSettings();

      // Enrich parallelAgentsRecommendation with dispatch strength
      if (result.parallelAgentsRecommendation) {
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

      // Build deep thinking instructions for PLAN/AUTO modes
      const deepThinkingInstructions = this.buildDeepThinkingInstructions(result.mode as Mode);

      // Build plan review gate for PLAN/AUTO modes
      const planReviewGate = this.buildPlanReviewGate(
        result.mode as Mode,
        settings?.ai?.planReviewGate,
      );

      // Build agent discussion config for EVAL mode
      const agentDiscussion = this.buildAgentDiscussion(
        result.mode as Mode,
        settings?.ai?.agentDiscussion,
      );

      // Build review context for EVAL mode when PR reference detected (#1411)
      const reviewContext = this.buildReviewContext(result.mode as Mode, result.originalPrompt);

      // Resolve council preset for PLAN/EVAL modes
      const councilPreset =
        this.councilPresetService.resolvePreset(result.mode as Mode) ?? undefined;

      // Resolve Teams capability status and build execution plan
      const teamsCapability = await this.resolveTeamsCapability();
      const executionPlan = this.buildExecutionPlan(dispatchReady, teamsCapability);

      // Build visual data for agent visualization
      const visual = await this.buildVisual(
        result.mode as Mode,
        result.delegates_to,
        result.parallelAgentsRecommendation?.specialists,
        settings?.eco,
      );

      // Council Scene contract (#1366) — opening scene for PLAN/EVAL/AUTO modes
      const councilScene = buildCouncilScene(
        result.mode as Mode,
        councilPreset ?? undefined,
        visual,
        {
          delegatesTo: result.delegates_to,
          specialists: result.parallelAgentsRecommendation?.specialists,
        },
      );

      // Council Scene rendering instructions (#1421) — append to instructions
      // so the AI client renders the opening scene in its first response.
      // Must come before clarification override since clarification replaces
      // instructions entirely when the request is ambiguous.
      const councilRenderInstructions = buildCouncilSceneInstructions(councilScene);
      if (councilRenderInstructions) {
        result.instructions += councilRenderInstructions;
      }

      // Clarification Gate (#1371) — only applies to PLAN/AUTO modes where the
      // response might otherwise produce a plan. ACT and EVAL skip the gate
      // because they assume PLAN has already set context.
      const clarification = this.buildClarificationMetadata(
        result.mode as Mode,
        result.originalPrompt,
        questionBudget,
      );

      // Clarification-first directive (#1423): when the gate determines the
      // request is ambiguous, build an instruction override so the AI client
      // asks the next question and STOPS before generating any plan.
      // We intentionally do NOT mutate `result` — the override is applied
      // later in the response spread to avoid side-effects on shared objects.
      const clarificationInstructions = this.buildClarificationFirstInstructions(clarification);

      // Planning Stage Router (#1372) — maps clarification output to
      // discover / design / plan stage. Only for PLAN/AUTO modes.
      const planningStage = this.buildPlanningStageMetadata(
        result.mode as Mode,
        clarification,
        planningStageHint,
      );

      // Execution Gate (#1378) — delay expensive specialist dispatch
      // until clarification is confirmed. Only for PLAN/AUTO modes.
      const executionGate = this.buildExecutionGate(
        result.mode as Mode,
        clarification,
        planningStage,
        result.parallelAgentsRecommendation?.specialists,
      );

      // Execution Gate suppression (#1422) — when gated, suppress dispatch-ready
      // metadata and downgrade parallelAgentsRecommendation so clients cannot
      // proceed with expensive specialist execution while clarification is needed.
      const serializedExecutionPlan = executionPlan
        ? serializeExecutionPlan(executionPlan)
        : undefined;
      const gatedFields = suppressDispatchWhileGated(executionGate, {
        dispatchReady,
        parallelAgentsRecommendation: result.parallelAgentsRecommendation,
        executionPlan: serializedExecutionPlan,
      });

      const response = createJsonResponse({
        ...result,
        // Clarification-first instruction override (#1423) — applied AFTER
        // spreading result so it wins over the original instructions field.
        ...(clarificationInstructions !== undefined && { instructions: clarificationInstructions }),
        language,
        languageInstruction: languageInstructionResult.instruction,
        resolvedModel,
        // Override parallelAgentsRecommendation with gated version (#1422)
        // Applied AFTER spreading result so it wins over the original field.
        ...(gatedFields.parallelAgentsRecommendation !== undefined && {
          parallelAgentsRecommendation: gatedFields.parallelAgentsRecommendation,
        }),
        // Include dispatch-ready data when available (suppressed when gated #1422)
        ...(gatedFields.dispatchReady && { dispatchReady: gatedFields.dispatchReady }),
        // Include deep thinking instructions for PLAN/AUTO modes
        ...(deepThinkingInstructions && { deepThinkingInstructions }),
        // Include plan review gate for PLAN/AUTO modes
        ...(planReviewGate && { planReviewGate }),
        // Include agent discussion config for EVAL mode
        ...(agentDiscussion && { agentDiscussion }),
        // Include review context for EVAL mode PR reviews (#1411)
        ...(reviewContext && { reviewContext }),
        // Include visual data for agent visualization
        ...(visual && { visual }),
        // Include council preset for PLAN/EVAL modes
        ...(councilPreset && { councilPreset }),
        // Include council scene contract for PLAN/EVAL/AUTO modes (#1366)
        ...(councilScene && { councilScene }),
        // Include execution plan metadata when dispatch is active (suppressed when gated #1422)
        ...(gatedFields.executionPlan && { executionPlan: gatedFields.executionPlan }),
        // Include Teams capability status
        ...(teamsCapability && { teamsCapability }),
        // Include Clarification Gate metadata for PLAN/AUTO modes (#1371)
        ...(clarification && clarification),
        // Include Planning Stage metadata for PLAN/AUTO modes (#1372)
        ...(planningStage && { planningStage }),
        // Include Execution Gate metadata for PLAN/AUTO modes (#1378)
        ...(executionGate && { executionGate }),
        // Include context document info (mandatory)
        ...contextResult,
        // Include project root warning when auto-detected and config missing
        ...(projectRootWarning && { projectRootWarning }),
      });

      try {
        this.impactEventService.logEvent('default', 'mode_activated', {
          mode: result.mode,
          agent: result.agent,
        });
      } catch {
        // Never break handler execution
      }

      try {
        this.ruleEventCollector.record({
          type: 'mode_activated',
          timestamp: new Date().toISOString(),
          rule: result.mode,
          details: { agent: result.agent },
        });
      } catch {
        // Fire-and-forget: never break handler execution
      }

      return response;
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
   * Build deep thinking instructions for PLAN/AUTO modes.
   * Returns undefined for ACT/EVAL modes (not applicable).
   */
  private buildDeepThinkingInstructions(mode: Mode): DeepThinkingInstructions | undefined {
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return undefined;
    }

    return {
      reasoning: [
        {
          step: 'decompose',
          instruction:
            'Break the problem into sub-problems. Identify each distinct concern, dependency, and boundary. List them explicitly before proposing a solution.',
        },
        {
          step: 'alternatives',
          instruction:
            'For each non-trivial decision, consider at least 2 alternative approaches. Compare trade-offs (complexity, performance, maintainability) and justify your choice.',
        },
        {
          step: 'devils_advocate',
          instruction:
            'Argue against your own plan. Identify weaknesses, edge cases, and assumptions that could fail. Address each weakness or document it as a known risk.',
        },
      ],
      hallucinationPrevention:
        'Before including any file path, function name, class name, or API reference in your plan, verify it exists in the codebase. Do not assume or guess — use search tools to confirm.',
      detailLevel:
        'Every step must include exact file paths, code snippets or signatures, and runnable commands. Avoid vague references like "update the handler" — specify which handler, which method, and what change.',
    };
  }

  /**
   * Build plan review gate for PLAN/AUTO modes.
   * Returns undefined for ACT/EVAL modes (not applicable).
   */
  private buildPlanReviewGate(mode: Mode, configValue?: boolean): PlanReviewGate | undefined {
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return undefined;
    }

    const enabled = configValue !== false;

    return {
      enabled,
      agent: 'plan-reviewer',
      dispatch: 'recommend',
    };
  }

  /**
   * Build Clarification Gate metadata for PLAN/AUTO modes (#1371).
   * Returns undefined for ACT/EVAL modes so the fields are omitted entirely
   * from the response (additive, backward-compatible).
   *
   * The gate runs a conservative ambiguity heuristic on the original prompt
   * and decrements the caller-provided questionBudget on each ambiguous round
   * so downstream loops cannot run forever.
   */
  private buildClarificationMetadata(
    mode: Mode,
    originalPrompt: string,
    questionBudget?: number,
  ): ClarificationMetadata | undefined {
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return undefined;
    }

    return evaluateClarification(originalPrompt, {
      ...(questionBudget !== undefined && { questionBudget }),
    });
  }

  /**
   * Build Execution Gate metadata for PLAN/AUTO modes (#1378).
   * Delays specialist dispatch when the request is still ambiguous.
   * Returns undefined for ACT/EVAL modes.
   */
  private buildExecutionGate(
    mode: Mode,
    clarification: ClarificationMetadata | undefined,
    planningStage: PlanningStageMetadata | undefined,
    specialists?: string[],
  ): ExecutionGate | undefined {
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return undefined;
    }
    if (!clarification) {
      return undefined;
    }

    return evaluateExecutionGate({
      clarification,
      planningStage,
      specialists,
    });
  }

  /**
   * Build a clarification-first instruction string (#1423).
   *
   * Returns the directive text when the Clarification Gate determines the
   * request is ambiguous, or `undefined` when the request is clear.
   * The caller spreads the result into the response so the original
   * `result` object is never mutated (avoids shared-reference side-effects).
   */
  private buildClarificationFirstInstructions(
    clarification: ClarificationMetadata | undefined,
  ): string | undefined {
    if (!clarification?.clarificationNeeded) {
      return undefined;
    }

    const question =
      clarification.nextQuestion ??
      'Can you clarify the scope and success criteria of this request?';
    const budget = clarification.questionBudget ?? 0;

    return (
      '🔴 CLARIFICATION REQUIRED — DO NOT PLAN.\n\n' +
      'The request is ambiguous. You MUST:\n' +
      '1. Ask EXACTLY the question below and STOP.\n' +
      '2. Do NOT output any implementation plan, architecture, or code.\n' +
      "3. Wait for the user's response before continuing.\n\n" +
      `❓ Ask this: "${question}"\n\n` +
      `Remaining question budget: ${budget}\n\n` +
      'After the user answers, call parse_mode again with the clarified prompt ' +
      `and question_budget=${budget} to continue.`
    );
  }

  /**
   * Build Planning Stage metadata for PLAN/AUTO modes (#1372).
   * Returns undefined for ACT/EVAL modes.
   *
   * Requires the clarification output to determine whether the request
   * should start at discover, design, or jump straight to plan.
   */
  private buildPlanningStageMetadata(
    mode: Mode,
    clarification: ClarificationMetadata | undefined,
    stageHint?: 'discover' | 'design' | 'plan',
  ): PlanningStageMetadata | undefined {
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return undefined;
    }
    if (!clarification) {
      return undefined;
    }

    return resolvePlanningStage(clarification, {
      ...(stageHint && { stageHint }),
    });
  }

  /**
   * Build agent discussion config for EVAL mode.
   * Returns undefined for PLAN/ACT/AUTO modes (not applicable).
   */
  private buildAgentDiscussion(
    mode: Mode,
    configValue?: boolean,
  ): AgentDiscussionConfig | undefined {
    if (mode !== 'EVAL') {
      return undefined;
    }

    const enabled = configValue !== false;

    return {
      enabled,
      format: 'structured',
      includeConsensus: true,
    };
  }

  /**
   * Build review context for EVAL mode when the prompt contains a PR reference (#1411).
   * Extracts PR number and optional issue number to guide the reviewing agent.
   * Returns undefined for non-EVAL modes or when no PR reference is detected.
   */
  private buildReviewContext(mode: Mode, originalPrompt: string): ReviewContext | undefined {
    if (mode !== 'EVAL') {
      return undefined;
    }

    // Detect PR reference: "PR #N", "PR N", or "pull request #N"
    const prMatch = originalPrompt.match(/(?:PR\s*#?(\d+)|pull\s*request\s*#?(\d+))/i);
    if (!prMatch) {
      return undefined;
    }

    const prNumber = parseInt(prMatch[1] ?? prMatch[2], 10);
    if (isNaN(prNumber)) {
      return undefined;
    }

    // Detect optional issue reference: "issue #N" or "#N" after PR reference
    const issueMatch = originalPrompt.match(/issue\s*#?(\d+)/i);
    const issueNumber = issueMatch ? parseInt(issueMatch[1], 10) : undefined;

    const hintParams = issueNumber
      ? `pr_number: ${prNumber}, issue_number: ${issueNumber}`
      : `pr_number: ${prNumber}`;

    return {
      detected: true,
      pr_number: prNumber,
      ...(issueNumber && { issue_number: issueNumber }),
      hint: `Call review_pr({ ${hintParams} }) to get structured review data including diff, checklists, and specialist recommendations.`,
    };
  }

  /**
   * Build visual data for agent visualization in response.
   * Loads visual fields from agent profiles and builds banner/face/collaboration data.
   * Returns undefined if agent profiles cannot be loaded (graceful degradation).
   */
  private async buildVisual(
    mode: Mode,
    delegatesTo?: string,
    specialists?: string[],
    eco?: boolean,
  ): Promise<VisualData | undefined> {
    try {
      const modeAgentName = `${mode.toLowerCase()}-mode`;

      // Load mode agent profile for banner visual
      const modeProfile = await this.agentService.resolveAgent(modeAgentName);
      const modeVisual = modeProfile.visual as AgentVisualRaw | undefined;

      // Load primary agent profile for visual
      let primaryInput: AgentVisualInput | undefined;
      if (delegatesTo) {
        const primaryProfile = await this.agentService.resolveAgent(delegatesTo);
        primaryInput = {
          name: primaryProfile.name,
          visual: primaryProfile.visual as AgentVisualRaw | undefined,
        };
      }

      // Load specialist agent profiles for visual (parallel)
      const specialistInputs: AgentVisualInput[] = [];
      if (specialists?.length) {
        const profiles = await Promise.all(
          specialists.map(async name => {
            try {
              const profile = await this.agentService.resolveAgent(name);
              return { name: profile.name, visual: profile.visual as AgentVisualRaw | undefined };
            } catch {
              return { name };
            }
          }),
        );
        specialistInputs.push(...profiles);
      }

      return buildVisualData(mode, modeVisual, primaryInput, specialistInputs, eco ?? true);
    } catch (error) {
      this.logger.warn(
        `Failed to build visual data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
  }

  /**
   * Resolve Teams capability status from TeamsCapabilityService.
   * Returns undefined on failure (graceful degradation).
   */
  private async resolveTeamsCapability(): Promise<TeamsCapabilityStatus | undefined> {
    try {
      return await this.teamsCapabilityService.getStatus();
    } catch (error) {
      this.logger.warn(
        `Failed to resolve Teams capability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
  }

  /**
   * Build an ExecutionPlan from dispatchReady data and Teams capability.
   * Returns undefined when no dispatch-ready agents are present.
   *
   * Logic:
   * - Outer layer is always 'subagent' (derived from dispatchReady agents).
   * - If Teams is available, an inner 'teams' coordination layer is added.
   */
  private buildExecutionPlan(
    dispatchReady?: DispatchReady,
    teamsCapability?: TeamsCapabilityStatus,
  ): ExecutionPlan | undefined {
    if (!dispatchReady) {
      return undefined;
    }

    const agents: {
      name: string;
      displayName: string;
      description: string;
      dispatchParams: {
        subagent_type: 'general-purpose';
        prompt: string;
        description: string;
        run_in_background?: true;
      };
    }[] = [];

    if (dispatchReady.primaryAgent) {
      agents.push({
        name: dispatchReady.primaryAgent.name,
        displayName: dispatchReady.primaryAgent.displayName,
        description: dispatchReady.primaryAgent.description,
        dispatchParams: dispatchReady.primaryAgent.dispatchParams,
      });
    }

    if (dispatchReady.parallelAgents?.length) {
      for (const agent of dispatchReady.parallelAgents) {
        agents.push({
          name: agent.name,
          displayName: agent.displayName,
          description: agent.description,
          dispatchParams: agent.dispatchParams,
        });
      }
    }

    if (agents.length === 0) {
      return undefined;
    }

    const outer = subagentLayer(agents);

    if (teamsCapability?.available) {
      const inner = teamsLayer({
        team_name: 'auto',
        description: 'Auto-generated Teams coordination layer',
        teammates: agents.map(a => ({
          name: a.name,
          subagent_type: 'general-purpose' as const,
          team_name: 'auto',
          prompt: a.description,
        })),
      });
      return buildNestedPlan(outer, inner);
    }

    return buildSimplePlan(outer);
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
