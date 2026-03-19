import { Logger } from '@nestjs/common';
import {
  KEYWORDS,
  LOCALIZED_KEYWORD_MAP,
  MODE_AGENTS,
  ALL_PRIMARY_AGENTS,
  ACT_PRIMARY_AGENTS,
  DEFAULT_ACT_AGENT,
  DEFAULT_MAX_INCLUDED_SKILLS,
  type Mode,
  type RuleContent,
  type ParseModeResult,
  type KeywordModesConfig,
  type AgentInfo,
  type ParallelAgentRecommendation,
  type ResolutionContext,
  type PrimaryAgentSource,
  type ActAgentRecommendation,
  type AutoConfig,
  type ComplexityClassification,
  type IncludedSkill,
} from './keyword.types';
import { classifyComplexity, generateSrpInstructions } from './complexity-classifier';
import { DEFAULT_AUTO_CONFIG } from './auto-executor.types';
import { type VerbosityLevel } from '../shared/verbosity.types';
import { MAX_PROMPT_LENGTH_REDOS_DEFENSE } from '../shared/validation.constants';
import { PrimaryAgentResolver } from './primary-agent-resolver';
import { ActivationMessageBuilder } from './activation-message.builder';
import { asyncWithFallback } from '../shared/async.utils';
import { filterRulesByMode } from './rule-filter';
import { truncateSkillContent } from '../skill/skill-content.utils';
import { createAgentSummary } from '../agent/agent-summary.utils';
import { truncateRuleContent } from '../rules/rules-content.utils';
import { getDefaultModeConfig } from '../shared/keyword-core';
import { isTaskmaestroAvailable } from './taskmaestro-detector';
import { type ClientType } from '../shared/client-type';

/**
 * Options for parseMode method
 */
export interface ParseModeOptions {
  /** ACT agent recommended from previous PLAN mode (only applies to ACT mode) */
  recommendedActAgent?: string;
  /** Resolution context for file-based inference */
  context?: ResolutionContext;

  // ======== Token Optimization Options ========
  /** Include skills in response (default: true) */
  includeSkills?: boolean;
  /** Include agent system prompt in response (default: true) */
  includeAgent?: boolean;
  /** Maximum number of skills to include (default: 3, config value) */
  maxIncludedSkills?: number;
  /** Verbosity level for response (default: 'standard') */
  verbosity?: VerbosityLevel;
}

/**
 * Optional dependencies for KeywordService.
 * Groups optional callback functions to reduce constructor parameter count.
 */
export interface KeywordServiceOptions {
  /** Primary agent resolver for dynamic agent selection */
  primaryAgentResolver?: PrimaryAgentResolver;
  /** Function to load AUTO mode configuration */
  loadAutoConfigFn?: () => Promise<AutoConfig | null>;
  /** Function to get skill recommendations based on prompt */
  getSkillRecommendationsFn?: (prompt: string) => SkillRecommendationInfo[];
  /** Function to load full skill content by name */
  loadSkillContentFn?: (skillName: string) => Promise<SkillContentInfo | null>;
  /** Function to load agent system prompt */
  loadAgentSystemPromptFn?: (
    agentName: string,
    mode: Mode,
  ) => Promise<AgentSystemPromptInfo | null>;
  /** Function to get max included skills from config (defaults to DEFAULT_MAX_INCLUDED_SKILLS) */
  getMaxIncludedSkillsFn?: () => Promise<number | null>;
  /** Function to get the resolved client type */
  getClientTypeFn?: () => ClientType;
}

/**
 * Skill recommendation result from SkillRecommendationService
 */
export interface SkillRecommendationInfo {
  skillName: string;
  confidence: 'high' | 'medium' | 'low';
  matchedPatterns: string[];
  description: string;
}

/**
 * Skill content loaded from RulesService
 */
export interface SkillContentInfo {
  name: string;
  description: string;
  content: string;
}

/**
 * Agent system prompt loaded from AgentService
 */
export interface AgentSystemPromptInfo {
  agentName: string;
  displayName: string;
  systemPrompt: string;
  description: string;
}

/**
 * Base mode configuration from the shared single source of truth.
 * Provides: description, instructions, rules, defaultMode.
 */
const BASE_CONFIG = getDefaultModeConfig();

/**
 * Default configuration for keyword modes.
 *
 * Built by spreading the shared BASE_CONFIG (single source of truth for
 * description, rules) and overlaying KeywordService-specific fields:
 * enriched instructions, agent, delegates_to, defaultSpecialists.
 *
 * NOTE: `defaultSpecialists` arrays are synchronized with:
 * - packages/rules/.ai-rules/keyword-modes.json
 * - .claude/rules/custom-instructions.md
 *
 * When modifying specialists, ensure all three locations are updated.
 * The JSON file can override these defaults at runtime via loadConfigFn.
 */
const DEFAULT_CONFIG: KeywordModesConfig = {
  modes: {
    PLAN: {
      ...BASE_CONFIG.modes.PLAN,
      // Enriched instructions: context prefix + base instructions + mandatory action suffix
      instructions:
        '🔴 CONTEXT: Check contextDocument field for previous mode context (decisions, notes, recommendedActAgent). ' +
        BASE_CONFIG.modes.PLAN.instructions +
        ' 📝 MANDATORY BEFORE COMPLETION: Call update_context with mode=PLAN, recommendedActAgent, task, decisions, and notes. ' +
        'Decisions and notes will be APPENDED to existing content, not overwritten.',
      agent: MODE_AGENTS[0],
      // delegates_to is now resolved dynamically via PrimaryAgentResolver
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
        'event-architecture-specialist',
        'integration-specialist',
        'observability-specialist',
        'migration-specialist',
      ],
    },
    ACT: {
      ...BASE_CONFIG.modes.ACT,
      // Enriched instructions: context prefix + ACT-specific guidance + mandatory action suffix
      instructions:
        '🔴 CONTEXT: contextDocument contains PLAN decisions and recommendedActAgent. Use this context! ' +
        'Follow Red-Green-Refactor cycle. ' +
        '⚠️ TDD CONTINUITY: RED phase test failures are EXPECTED — do NOT stop or wait for user input. ' +
        'Proceed to GREEN phase immediately. Treat RED→GREEN→REFACTOR as ONE atomic operation. ' +
        "Only stop on UNEXPECTED failures (tests that should pass but don't). " +
        'Use recommended agent from PLAN. ' +
        '📝 MANDATORY BEFORE COMPLETION: Call update_context with mode=ACT, task (what was done), decisions, and notes. ' +
        'Decisions and notes will be APPENDED to existing content.',
      agent: MODE_AGENTS[1],
      // delegates_to is now resolved dynamically via PrimaryAgentResolver
      defaultSpecialists: [
        'code-quality-specialist',
        'test-strategy-specialist',
        'event-architecture-specialist',
        'integration-specialist',
      ],
    },
    EVAL: {
      ...BASE_CONFIG.modes.EVAL,
      // Enriched instructions: context prefix + EVAL-specific guidance + mandatory action suffix
      instructions:
        '🔴 CONTEXT: contextDocument contains all PLAN and ACT decisions/notes. Review this accumulated context! ' +
        'Evaluate code quality. Verify SOLID principles. Check test coverage. ' +
        '📝 MANDATORY BEFORE COMPLETION: Call update_context with mode=EVAL, task (evaluation summary), decisions, and notes. ' +
        'Decisions and notes will be APPENDED to existing content.',
      agent: MODE_AGENTS[2],
      delegates_to: 'code-reviewer', // EVAL always uses code-reviewer
      defaultSpecialists: [
        'security-specialist',
        'accessibility-specialist',
        'performance-specialist',
        'code-quality-specialist',
        'event-architecture-specialist',
        'integration-specialist',
        'observability-specialist',
        'migration-specialist',
      ],
    },
    AUTO: {
      ...BASE_CONFIG.modes.AUTO,
      // Enriched instructions: context prefix + AUTO-specific guidance + mandatory action suffix
      instructions:
        '🔴 CONTEXT: Check contextDocument for accumulated context across iterations. ' +
        'Execute PLAN → ACT → EVAL cycle automatically. Repeat until Critical/High issues = 0 or max iterations reached. ' +
        '📝 MANDATORY AT EACH PHASE: Call update_context to record progress. Decisions and notes are APPENDED. ' +
        'This maintains full context history across iterations.',
      agent: MODE_AGENTS[3], // 'auto-mode'
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
        'security-specialist',
        'code-quality-specialist',
        'event-architecture-specialist',
        'integration-specialist',
        'observability-specialist',
        'migration-specialist',
      ],
    },
  },
  defaultMode: BASE_CONFIG.defaultMode,
};

/** Cache entry with TTL */
interface ConfigCacheEntry {
  config: KeywordModesConfig;
  timestamp: number;
}

export class KeywordService {
  private readonly logger = new Logger(KeywordService.name);
  private configCache: ConfigCacheEntry | null = null;
  private readonly primaryAgentResolver?: PrimaryAgentResolver;
  private readonly cacheTTL: number; // Environment-based: 5min dev, 1hr prod
  private cacheHits = 0;
  private cacheMisses = 0;

  // Optional dependencies from options
  private readonly loadAutoConfigFn?: () => Promise<AutoConfig | null>;
  private readonly getSkillRecommendationsFn?: (prompt: string) => SkillRecommendationInfo[];
  private readonly loadSkillContentFn?: (skillName: string) => Promise<SkillContentInfo | null>;
  private readonly loadAgentSystemPromptFn?: (
    agentName: string,
    mode: Mode,
  ) => Promise<AgentSystemPromptInfo | null>;
  private readonly getMaxIncludedSkillsFn?: () => Promise<number | null>;
  private readonly getClientTypeFn?: () => ClientType;

  /**
   * Context-aware specialist patterns for automatic agent recommendation.
   * Static patterns to avoid regex recompilation on each method call.
   */
  private static readonly CONTEXT_SPECIALIST_PATTERNS: ReadonlyArray<{
    pattern: RegExp;
    specialist: string;
  }> = [
    {
      pattern: /보안|security|auth|인증|JWT|OAuth|XSS|CSRF|취약점|vulnerability/i,
      specialist: 'security-specialist',
    },
    {
      pattern: /접근성|accessibility|a11y|WCAG|aria|스크린\s*리더|screen\s*reader/i,
      specialist: 'accessibility-specialist',
    },
    {
      pattern: /성능|performance|최적화|optimiz|빠르게|느린|slow|fast|bundle\s*size|로딩/i,
      specialist: 'performance-specialist',
    },
    {
      pattern: /다국어|i18n|internationalization|번역|locale|translation|localization/i,
      specialist: 'i18n-specialist',
    },
    {
      pattern: /SEO|검색\s*엔진|search\s*engine|메타|meta\s*tag|sitemap|구조화\s*데이터/i,
      specialist: 'seo-specialist',
    },
    {
      pattern: /문서화|document|README|API\s*문서|JSDoc|주석|comment/i,
      specialist: 'documentation-specialist',
    },
    {
      pattern: /UI|UX|디자인|design\s*system|사용자\s*경험|user\s*experience|인터랙션/i,
      specialist: 'ui-ux-designer',
    },
    {
      pattern:
        /외부\s*서비스|external\s*(api|service)|webhook|웹훅|third-?party|circuit\s*breaker|retry\s*pattern|API\s*integration|서드파티|연동|SDK\s*wrapper/i,
      specialist: 'integration-specialist',
    },
    {
      pattern:
        /observability|관측성|distributed\s*trac|분산\s*추적|SLI|SLO|error\s*budget|OpenTelemetry|otel|Prometheus|Grafana|Jaeger|Zipkin|log\s*aggregat|로그\s*수집|alerting\s*strateg|알림\s*전략|메트릭\s*수집|metric\s*collect|tracing\s*infra|monitoring|대시보드|dashboard|logs?\s*manag/i,
      specialist: 'observability-specialist',
    },
    {
      pattern:
        /event[- ]?driven|이벤트\s*기반|message\s*queue|메시지\s*큐|Kafka|RabbitMQ|SQS|Azure\s*Service\s*Bus|event\s*sourc|CQRS|saga\s*pattern|분산\s*트랜잭션|distributed\s*transaction|pub\/?sub|dead\s*letter|DLQ|websocket|SSE|server[- ]?sent|real[- ]?time|실시간|async\s*messag|비동기\s*통신/i,
      specialist: 'event-architecture-specialist',
    },
    {
      pattern:
        /migration|마이그레이션|migrate|이전|legacy\s*(system|code|moderniz)|레거시|upgrade\s*(framework|version|library)|업그레이드|strangler\s*fig|branch\s*by\s*abstraction|blue[- ]?green|canary\s*(deploy|release)|rollback|롤백|api\s*version|deprecat|dual[- ]?write|backward\s*compatib|호환성|zero[- ]?downtime|data\s*migration|데이터\s*마이그레이션|schema\s*migration|스키마\s*변경|cutover|전환/i,
      specialist: 'migration-specialist',
    },
  ];

  /**
   * Create a KeywordService instance.
   *
   * @param loadConfigFn - Function to load mode configuration
   * @param loadRuleFn - Function to load rule content by path
   * @param loadAgentInfoFn - Optional function to load agent info by name
   * @param options - Optional dependencies grouped for cleaner API
   */
  constructor(
    private readonly loadConfigFn: () => Promise<KeywordModesConfig>,
    private readonly loadRuleFn: (path: string) => Promise<string>,
    private readonly loadAgentInfoFn?: (agentName: string) => Promise<unknown>,
    options?: KeywordServiceOptions,
  ) {
    // Extract options with defaults
    this.primaryAgentResolver = options?.primaryAgentResolver;
    this.loadAutoConfigFn = options?.loadAutoConfigFn;
    this.getSkillRecommendationsFn = options?.getSkillRecommendationsFn;
    this.loadSkillContentFn = options?.loadSkillContentFn;
    this.loadAgentSystemPromptFn = options?.loadAgentSystemPromptFn;
    this.getMaxIncludedSkillsFn = options?.getMaxIncludedSkillsFn;
    this.getClientTypeFn = options?.getClientTypeFn;

    // Environment-based TTL: 5 minutes for development, 1 hour for production
    this.cacheTTL = process.env.NODE_ENV === 'production' ? 3600000 : 300000;
  }

  async parseMode(prompt: string, options?: ParseModeOptions): Promise<ParseModeResult> {
    // Defense-in-depth: validate input length to prevent ReDoS attacks
    if (prompt.length > MAX_PROMPT_LENGTH_REDOS_DEFENSE) {
      this.logger.warn(
        `Prompt exceeds maximum length (${prompt.length} > ${MAX_PROMPT_LENGTH_REDOS_DEFENSE}), truncating`,
      );
      prompt = prompt.slice(0, MAX_PROMPT_LENGTH_REDOS_DEFENSE);
    }

    const config = await this.loadModeConfig();
    const { mode, originalPrompt, warnings } = this.extractModeFromPrompt(
      prompt,
      config.defaultMode,
    );

    const modeConfig = config.modes[mode];
    const verbosity = options?.verbosity ?? 'standard';
    const rules = await this.getRulesForMode(mode, verbosity);

    // Only pass recommendedActAgent for ACT mode
    const effectiveRecommendedAgent = mode === 'ACT' ? options?.recommendedActAgent : undefined;

    return this.buildParseModeResult(
      mode,
      originalPrompt,
      warnings,
      modeConfig,
      rules,
      config,
      options,
      effectiveRecommendedAgent,
    );
  }

  /**
   * Extract mode and original prompt from user input.
   * Handles English and localized keywords with validation.
   *
   * Supported formats:
   * - "KEYWORD task" (space separated)
   * - "KEYWORD: task" (colon attached)
   * - "KEYWORD : task" (colon separated)
   * - Full-width colon (：) is also supported for CJK keyboards
   */
  private extractModeFromPrompt(
    prompt: string,
    defaultMode: Mode,
  ): { mode: Mode; originalPrompt: string; warnings: string[] } {
    const warnings: string[] = [];
    const trimmed = prompt.trim();

    // Regex: keyword (non-space, non-colon) + optional (space + colon + space) + rest
    // Supports: "KEYWORD: task", "KEYWORD : task", "KEYWORD task", "KEYWORD：task"
    const keywordRegex = /^([^\s:：]+)\s*[:：]?\s*(.*)$/s;
    const match = trimmed.match(keywordRegex);

    if (!match || !match[1]) {
      warnings.push('No keyword found, defaulting to PLAN');
      return { mode: defaultMode, originalPrompt: trimmed, warnings };
    }

    const keywordCandidate = match[1];
    const keywordUpper = keywordCandidate.toUpperCase();
    const originalPrompt = (match[2] ?? '').trim();

    // Check English keywords (case-insensitive)
    const isEnglishKeyword = KEYWORDS.includes(keywordUpper as Mode);
    // Check localized keywords (exact match for CJK, case-insensitive for Spanish)
    const localizedMode =
      LOCALIZED_KEYWORD_MAP[keywordCandidate] ?? LOCALIZED_KEYWORD_MAP[keywordUpper];

    if (isEnglishKeyword) {
      const mode = keywordUpper as Mode;
      this.checkForMultipleKeywordsInPrompt(originalPrompt, warnings);
      this.checkForEmptyContent(originalPrompt, warnings);
      return { mode, originalPrompt, warnings };
    }

    if (localizedMode) {
      this.checkForMultipleKeywordsInPrompt(originalPrompt, warnings);
      this.checkForEmptyContent(originalPrompt, warnings);
      return { mode: localizedMode, originalPrompt, warnings };
    }

    // No keyword found - use default mode
    warnings.push('No keyword found, defaulting to PLAN');
    return { mode: defaultMode, originalPrompt: trimmed, warnings };
  }

  /**
   * Check if first word of originalPrompt is also a keyword and add warning.
   */
  private checkForMultipleKeywordsInPrompt(originalPrompt: string, warnings: string[]): void {
    if (!originalPrompt) return;

    // Extract first word from originalPrompt (excluding colons)
    const firstWordMatch = originalPrompt.match(/^([^\s:：]+)/);
    if (!firstWordMatch) return;

    const firstWord = firstWordMatch[1];
    const firstWordUpper = firstWord.toUpperCase();

    const isSecondKeyword =
      KEYWORDS.includes(firstWordUpper as Mode) ||
      LOCALIZED_KEYWORD_MAP[firstWord] !== undefined ||
      LOCALIZED_KEYWORD_MAP[firstWordUpper] !== undefined;

    if (isSecondKeyword) {
      warnings.push('Multiple keywords found, using first');
    }
  }

  /**
   * Check if prompt content is empty after keyword and add warning.
   */
  private checkForEmptyContent(originalPrompt: string, warnings: string[]): void {
    if (originalPrompt === '') {
      warnings.push('No prompt content after keyword');
    }
  }

  /**
   * Build the ParseModeResult object with all resolved data.
   * Orchestrates multiple focused helper methods for clarity.
   */
  private async buildParseModeResult(
    mode: Mode,
    originalPrompt: string,
    warnings: string[],
    modeConfig: KeywordModesConfig['modes'][Mode],
    rules: RuleContent[],
    config: KeywordModesConfig,
    options?: ParseModeOptions,
    recommendedActAgent?: string,
  ): Promise<ParseModeResult> {
    // 1. Build base result object
    const result = this.buildBaseResult(mode, originalPrompt, warnings, modeConfig, rules);

    // 2. Resolve and add Primary Agent information
    const resolvedAgent = await this.resolvePrimaryAgent(
      mode,
      originalPrompt,
      modeConfig.delegates_to,
      options?.context,
      recommendedActAgent,
    );
    await this.addAgentInfoToResult(result, resolvedAgent);

    // 3. Add parallel agents recommendation
    this.addParallelAgentsToResult(result, mode, config, originalPrompt);

    // 4. Add ACT agent recommendation for PLAN mode
    await this.addActRecommendationToResult(result, mode, originalPrompt);

    // 5. Add activation message
    this.addActivationMessageToResult(result, resolvedAgent);

    // 5.5. Add display instruction for activation message
    this.addDisplayInstructionToResult(result, mode);

    // 6. Add AUTO config for AUTO mode
    await this.addAutoConfigToResult(result, mode);

    // 7. Add complexity classification for PLAN mode (or AUTO which includes PLAN phase)
    this.addComplexityToResult(result, mode, originalPrompt);

    // 8. Auto-include relevant skills (for MCP mode to force AI execution)
    await this.addIncludedSkillsToResult(result, originalPrompt, options);

    // 9. Auto-include primary agent system prompt (for MCP mode to force AI execution)
    await this.addIncludedAgentToResult(result, mode, options);

    // 10. Add available execution strategies (subagent, taskmaestro)
    const taskmaestroInstalled = isTaskmaestroAvailable();
    result.availableStrategies = taskmaestroInstalled ? ['subagent', 'taskmaestro'] : ['subagent'];
    if (!taskmaestroInstalled) {
      result.taskmaestroInstallHint =
        'TaskMaestro skill not found at ~/.claude/skills/taskmaestro/SKILL.md. To enable tmux-based parallel specialist execution, install the taskmaestro skill.';
    }

    return result;
  }

  /**
   * Build the base ParseModeResult with core fields.
   */
  private buildBaseResult(
    mode: Mode,
    originalPrompt: string,
    warnings: string[],
    modeConfig: KeywordModesConfig['modes'][Mode],
    rules: RuleContent[],
  ): ParseModeResult {
    const filteredRules = filterRulesByMode(rules, mode);

    const result: ParseModeResult = {
      mode,
      originalPrompt,
      instructions: modeConfig.instructions,
      rules: filteredRules,
      ...(warnings.length > 0 ? { warnings } : {}),
    };

    if (modeConfig.agent) {
      result.agent = modeConfig.agent;
    }

    return result;
  }

  /**
   * Add resolved agent information to result.
   */
  private async addAgentInfoToResult(
    result: ParseModeResult,
    resolvedAgent: { agentName: string; source: PrimaryAgentSource } | null,
  ): Promise<void> {
    if (!resolvedAgent) {
      return;
    }

    result.delegates_to = resolvedAgent.agentName;
    result.primary_agent_source = resolvedAgent.source;

    const delegateAgentInfo = await this.getAgentInfo(resolvedAgent.agentName);
    if (delegateAgentInfo) {
      result.delegate_agent_info = delegateAgentInfo;
    }
  }

  /**
   * Add parallel agents recommendation to result.
   */
  private addParallelAgentsToResult(
    result: ParseModeResult,
    mode: Mode,
    config: KeywordModesConfig,
    originalPrompt: string,
  ): void {
    const recommendation = this.getParallelAgentsRecommendation(mode, config, originalPrompt);
    if (recommendation) {
      result.parallelAgentsRecommendation = recommendation;
    }
  }

  /**
   * Add ACT agent recommendation for PLAN mode.
   */
  private async addActRecommendationToResult(
    result: ParseModeResult,
    mode: Mode,
    originalPrompt: string,
  ): Promise<void> {
    if ((mode !== 'PLAN' && mode !== 'EVAL') || !this.primaryAgentResolver) {
      return;
    }

    const actRecommendation = await this.getActAgentRecommendation(originalPrompt);
    if (actRecommendation) {
      result.recommended_act_agent = actRecommendation;
      result.available_act_agents = [...ACT_PRIMARY_AGENTS];
    }
  }

  /**
   * Add activation message to result.
   */
  private addActivationMessageToResult(
    result: ParseModeResult,
    resolvedAgent: { agentName: string; source: PrimaryAgentSource } | null,
  ): void {
    if (!resolvedAgent) {
      return;
    }

    const tier = this.getPrimaryAgentTier(resolvedAgent.agentName);
    if (tier === 'specialist') {
      result.activation_message = ActivationMessageBuilder.forSpecialistAgent(
        resolvedAgent.agentName,
      );
    } else {
      result.activation_message = ActivationMessageBuilder.forPrimaryAgent(resolvedAgent.agentName);
    }
  }

  /**
   * Prepends a display instruction to result.instructions so AI clients
   * show the activation_message and mode indicator at response start.
   */
  private addDisplayInstructionToResult(result: ParseModeResult, mode: Mode): void {
    if (!result.activation_message?.formatted) {
      return;
    }

    const displayPrefix = `📌 OUTPUT FORMAT: Start your response with "${result.activation_message.formatted}" followed by "# Mode: ${mode}" header.`;

    result.instructions = `${displayPrefix} ${result.instructions}`;
  }

  /**
   * Add AUTO config for AUTO mode.
   */
  private async addAutoConfigToResult(result: ParseModeResult, mode: Mode): Promise<void> {
    if (mode !== 'AUTO') {
      return;
    }

    const autoConfig = await this.getAutoConfig();
    result.autoConfig = autoConfig;
  }

  /**
   * Add complexity classification for PLAN mode (or AUTO which includes PLAN phase).
   *
   * Classifies task complexity as SIMPLE or COMPLEX and adds SRP instructions
   * when the task requires structured reasoning.
   *
   * @param result - The ParseModeResult to modify
   * @param mode - Current workflow mode
   * @param originalPrompt - User's original prompt
   */
  private addComplexityToResult(result: ParseModeResult, mode: Mode, originalPrompt: string): void {
    // Only apply complexity classification for PLAN mode or AUTO (which starts with PLAN)
    if (mode !== 'PLAN' && mode !== 'AUTO') {
      return;
    }

    // Classify the task complexity
    const classification: ComplexityClassification = classifyComplexity(originalPrompt);
    result.complexity = classification;

    // Generate SRP instructions if complexity warrants it
    // Note: srpInstructions is kept separate (no mutation of result.instructions)
    // Consumer can decide how to combine them
    const srpInstructions = generateSrpInstructions(classification);
    if (srpInstructions) {
      result.srpInstructions = srpInstructions;
    }

    this.logger.log(
      `Complexity: ${classification.complexity}, SRP: ${classification.applySrp ? 'applied' : 'skipped'}, confidence: ${classification.confidence.toFixed(2)}`,
    );
  }

  /**
   * Auto-include relevant skills in the response for MCP mode.
   * This forces AI clients to have skill content without additional tool calls.
   * Applies verbosity-based content control:
   * - minimal: metadata only (no content)
   * - standard: truncated content (3,000 chars max)
   * - full: complete content
   */
  private async addIncludedSkillsToResult(
    result: ParseModeResult,
    originalPrompt: string,
    options?: ParseModeOptions,
  ): Promise<void> {
    // Skip if explicitly disabled
    if (options?.includeSkills === false) {
      this.logger.log('Skipping skill inclusion (disabled by options)');
      return;
    }

    if (!this.getSkillRecommendationsFn || !this.loadSkillContentFn) return;

    try {
      const recommendations = this.getSkillRecommendationsFn(originalPrompt);
      if (recommendations.length === 0) return;

      // Use maxIncludedSkills from options if provided, otherwise use config value
      const maxSkills = options?.maxIncludedSkills ?? (await this.getMaxIncludedSkills());
      const verbosity = options?.verbosity ?? 'standard';
      const skills = await this.loadSkillsInParallel(
        recommendations.slice(0, maxSkills),
        verbosity,
      );

      if (skills.length > 0) {
        result.included_skills = skills;
        this.logger.log(
          `Auto-included ${skills.length} skills (verbosity: ${verbosity}): ${skills.map(s => s.name).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to auto-include skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /** Get max included skills from config or use default. */
  private async getMaxIncludedSkills(): Promise<number> {
    if (!this.getMaxIncludedSkillsFn) return DEFAULT_MAX_INCLUDED_SKILLS;

    const configValue = await asyncWithFallback({
      fn: () => this.getMaxIncludedSkillsFn!(),
      fallback: null,
      errorMessage: 'Failed to load maxIncludedSkills config: ${error}',
      logger: this.logger,
    });

    return configValue ?? DEFAULT_MAX_INCLUDED_SKILLS;
  }

  /**
   * Load multiple skills in parallel and filter out failed loads.
   * Applies verbosity-based content truncation:
   * - minimal: omit content entirely (metadata only)
   * - standard: truncate content to 3,000 chars
   * - full: include full content
   */
  private async loadSkillsInParallel(
    recommendations: SkillRecommendationInfo[],
    verbosity: VerbosityLevel,
  ): Promise<IncludedSkill[]> {
    const loadPromises = recommendations.map(async rec => {
      const content = await this.loadSkillContentFn!(rec.skillName);
      if (!content) return null;

      // Apply verbosity-based content control
      let finalContent: string;
      if (verbosity === 'minimal') {
        finalContent = ''; // Metadata only, no content
      } else if (verbosity === 'standard') {
        finalContent = truncateSkillContent(content.content);
      } else {
        finalContent = content.content; // Full content
      }

      return {
        name: content.name,
        description: content.description,
        content: finalContent,
        reason: `Matched patterns: ${rec.matchedPatterns.join(', ')} (confidence: ${rec.confidence})`,
      };
    });

    const results = await Promise.all(loadPromises);
    return results.filter((skill): skill is IncludedSkill => skill !== null);
  }

  /**
   * Auto-include primary agent system prompt for MCP mode.
   * Applies verbosity-based content control:
   * - minimal: summary only (no full system prompt)
   * - standard: summary only (no full system prompt)
   * - full: full system prompt included
   */
  private async addIncludedAgentToResult(
    result: ParseModeResult,
    mode: Mode,
    options?: ParseModeOptions,
  ): Promise<void> {
    // Skip if explicitly disabled
    if (options?.includeAgent === false) {
      this.logger.log('Skipping agent inclusion (disabled by options)');
      return;
    }

    if (!this.loadAgentSystemPromptFn || !result.delegates_to) return;

    const agentPrompt = await asyncWithFallback({
      fn: () => this.loadAgentSystemPromptFn!(result.delegates_to!, mode),
      fallback: null,
      errorMessage: 'Failed to auto-include agent: ${error}',
      logger: this.logger,
    });

    if (agentPrompt) {
      const verbosity = options?.verbosity ?? 'standard';
      const expertise = result.delegate_agent_info?.expertise ?? [];

      // Apply verbosity-based system prompt control
      if (verbosity === 'full') {
        // Full verbosity: include complete system prompt
        result.included_agent = {
          name: agentPrompt.displayName,
          systemPrompt: agentPrompt.systemPrompt,
          expertise,
        };
      } else {
        // Minimal/Standard: use summary instead of full system prompt
        const summary = createAgentSummary({
          name: result.delegates_to!,
          displayName: agentPrompt.displayName,
          expertise,
          systemPrompt: agentPrompt.systemPrompt,
        });

        result.included_agent = {
          name: summary.displayName,
          systemPrompt: summary.primaryFocus, // Truncated primary focus instead of full prompt
          expertise: summary.expertise, // Top 5 expertise items
        };
      }

      this.logger.log(`Auto-included agent: ${agentPrompt.displayName} (verbosity: ${verbosity})`);
    }
  }

  /**
   * Determine if an agent is a primary or specialist tier.
   */
  private getPrimaryAgentTier(agentName: string): 'primary' | 'specialist' {
    // Type assertion needed because ALL_PRIMARY_AGENTS is readonly tuple
    return (ALL_PRIMARY_AGENTS as readonly string[]).includes(agentName) ? 'primary' : 'specialist';
  }

  /**
   * Get recommended parallel agents for a given mode.
   * These specialists can be executed as Claude Code subagents via Task tool.
   * Now includes context-aware specialist recommendations based on prompt content.
   */
  private getParallelAgentsRecommendation(
    mode: Mode,
    config: KeywordModesConfig,
    prompt?: string,
  ): ParallelAgentRecommendation | undefined {
    const modeConfig = config.modes[mode];
    const baseSpecialists = modeConfig?.defaultSpecialists ?? [];

    // Get context-aware specialists based on prompt content
    const contextSpecialists = prompt ? this.getContextAwareSpecialists(prompt) : [];

    // Merge base and context specialists (deduplicated)
    const allSpecialists = [...new Set([...baseSpecialists, ...contextSpecialists])];

    if (allSpecialists.length === 0) {
      return undefined;
    }

    const clientType = this.getClientTypeFn?.() ?? 'unknown';
    let hint: string;
    if (clientType === 'cursor') {
      hint = `Execute specialists sequentially: call prepare_parallel_agents MCP tool to get specialist prompts, then analyze from each specialist's perspective one by one, consolidating findings at the end.`;
    } else if (clientType === 'opencode') {
      hint = `Execute specialists sequentially using /agent <name> command: for each recommended specialist, switch to the specialist agent, perform the analysis, record findings, then switch back. Consolidate all findings at the end. Use prepare_parallel_agents MCP tool to get specialist system prompts if dispatchReady is not available.`;
    } else {
      hint = `Use Task tool with subagent_type="general-purpose" and run_in_background=true for each specialist. Call prepare_parallel_agents MCP tool to get ready-to-use prompts.`;
    }

    return {
      specialists: allSpecialists,
      hint,
    };
  }

  /**
   * Detect additional specialists based on prompt content analysis.
   * This enables dynamic specialist recommendations beyond mode defaults.
   * Uses cached static regex patterns for performance.
   *
   * @param prompt - User prompt to analyze
   * @returns Array of specialist agent names detected from prompt
   */
  private getContextAwareSpecialists(prompt: string): string[] {
    const specialists: string[] = [];

    for (const { pattern, specialist } of KeywordService.CONTEXT_SPECIALIST_PATTERNS) {
      if (pattern.test(prompt)) {
        specialists.push(specialist);
      }
    }

    return specialists;
  }

  /**
   * Get recommended ACT agent based on prompt analysis.
   * Called during PLAN mode to suggest which agent should handle ACT.
   */
  private async getActAgentRecommendation(
    prompt: string,
  ): Promise<ActAgentRecommendation | undefined> {
    if (!this.primaryAgentResolver) {
      return undefined;
    }

    return asyncWithFallback({
      fn: async () => {
        // Use resolver to analyze prompt as if it were ACT mode
        // isRecommendation=true skips project config priority, allowing intent analysis
        const result = await this.primaryAgentResolver!.resolve(
          'ACT',
          prompt,
          undefined,
          undefined,
          true,
        );

        return {
          agentName: result.agentName,
          reason: result.reason,
          confidence: result.confidence,
        };
      },
      fallback: undefined,
      errorMessage: 'Failed to get ACT agent recommendation: ${error}',
      logger: this.logger,
    });
  }

  /**
   * Manually invalidate the configuration cache.
   * Use this when config files are modified externally to force reload on next access.
   */
  public invalidateConfigCache(): void {
    if (this.configCache) {
      this.logger.debug('Configuration cache manually invalidated');
      this.configCache = null;
    }
  }

  async loadModeConfig(): Promise<KeywordModesConfig> {
    // Check cache validity
    if (this.configCache) {
      const now = Date.now();
      const age = now - this.configCache.timestamp;

      if (age < this.cacheTTL) {
        // Cache is still valid
        this.cacheHits++;
        this.logger.debug(
          `Config cache HIT (total hits: ${this.cacheHits}, misses: ${this.cacheMisses}, hit rate: ${this.getCacheHitRate()}%)`,
        );
        return this.configCache.config;
      }

      // Cache expired, invalidate
      this.logger.debug(
        `Config cache expired (age: ${Math.round(age / 1000)}s, TTL: ${this.cacheTTL / 1000}s), reloading`,
      );
      this.configCache = null;
    }

    // Load fresh config
    this.cacheMisses++;
    this.logger.debug(
      `Config cache MISS (total hits: ${this.cacheHits}, misses: ${this.cacheMisses}, hit rate: ${this.getCacheHitRate()}%)`,
    );

    const config = await asyncWithFallback({
      fn: () => this.loadConfigFn(),
      fallback: DEFAULT_CONFIG,
      errorMessage: 'Failed to load mode config, using defaults: ${error}',
      logger: this.logger,
    });

    // Cache with timestamp
    this.configCache = {
      config,
      timestamp: Date.now(),
    };

    return config;
  }

  /**
   * Calculate cache hit rate as a percentage.
   * @returns Hit rate (0-100), or 0 if no cache accesses yet
   */
  private getCacheHitRate(): string {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) return '0.00';
    return ((this.cacheHits / total) * 100).toFixed(2);
  }

  async getRulesForMode(
    mode: Mode,
    verbosity: VerbosityLevel = 'standard',
  ): Promise<RuleContent[]> {
    const config = await this.loadModeConfig();
    const modeConfig = config.modes[mode];

    // Load all rules in parallel for better performance
    const rulePromises = modeConfig.rules.map(async rulePath => {
      const content = await asyncWithFallback({
        fn: () => this.loadRuleFn(rulePath),
        fallback: null as string | null,
        errorMessage: `Skipping rule file '${rulePath}': \${error}`,
        logger: this.logger,
      });

      if (content === null) return null;

      // Apply verbosity-based truncation
      const processedContent = truncateRuleContent(content, verbosity);
      return { name: rulePath, content: processedContent };
    });

    const results = await Promise.all(rulePromises);
    return results.filter((rule): rule is RuleContent => rule !== null);
  }

  private async getAgentInfo(agentName: string): Promise<AgentInfo | undefined> {
    if (!this.loadAgentInfoFn) {
      return undefined;
    }

    return asyncWithFallback({
      fn: async () => {
        const agentData = await this.loadAgentInfoFn!(agentName);

        // Type guard for agent data
        if (!agentData || typeof agentData !== 'object') {
          return undefined;
        }

        const agent = agentData as Record<string, unknown>;
        const role = agent.role as Record<string, unknown> | undefined;

        return {
          name: typeof agent.name === 'string' ? agent.name : agentName,
          description: typeof agent.description === 'string' ? agent.description : '',
          expertise: Array.isArray(role?.expertise) ? role.expertise : [],
        };
      },
      fallback: undefined,
      errorMessage: `Failed to load agent info for '${agentName}': \${error}`,
      logger: this.logger,
    });
  }

  /**
   * Get AUTO mode configuration from project config.
   * Falls back to default maxIterations of 3 if not configured.
   */
  private async getAutoConfig(): Promise<AutoConfig> {
    if (!this.loadAutoConfigFn) {
      return DEFAULT_AUTO_CONFIG;
    }

    return asyncWithFallback({
      fn: async () => {
        const config = await this.loadAutoConfigFn!();
        return config ?? DEFAULT_AUTO_CONFIG;
      },
      fallback: DEFAULT_AUTO_CONFIG,
      errorMessage: 'Failed to load AUTO config, using default: ${error}',
      logger: this.logger,
    });
  }

  /**
   * Resolve Primary Agent using PrimaryAgentResolver if available,
   * otherwise fall back to static config or default.
   */
  private async resolvePrimaryAgent(
    mode: Mode,
    prompt: string,
    staticDelegatesTo?: string,
    context?: ResolutionContext,
    recommendedActAgent?: string,
  ): Promise<{
    agentName: string;
    source: PrimaryAgentSource;
  } | null> {
    // If PrimaryAgentResolver is available, use it
    if (this.primaryAgentResolver) {
      const result = await this.primaryAgentResolver.resolve(
        mode,
        prompt,
        context,
        recommendedActAgent,
      );
      return { agentName: result.agentName, source: result.source };
    }

    // Fallback: use static config delegates_to or default
    if (staticDelegatesTo) {
      return { agentName: staticDelegatesTo, source: 'default' };
    }

    // Default fallback for PLAN/ACT modes (EVAL has static delegates_to)
    if (mode !== 'EVAL') {
      return { agentName: DEFAULT_ACT_AGENT, source: 'default' };
    }

    return null;
  }
}
