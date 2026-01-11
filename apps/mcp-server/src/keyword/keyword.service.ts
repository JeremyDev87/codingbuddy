import { Logger } from '@nestjs/common';
import {
  KEYWORDS,
  LOCALIZED_KEYWORD_MAP,
  MODE_AGENTS,
  ALL_PRIMARY_AGENTS,
  ACT_PRIMARY_AGENTS,
  DEFAULT_ACT_AGENT,
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
} from './keyword.types';
import { DEFAULT_AUTO_CONFIG } from './auto-executor.types';

/**
 * Options for parseMode method
 */
export interface ParseModeOptions {
  /** ACT agent recommended from previous PLAN mode (only applies to ACT mode) */
  recommendedActAgent?: string;
  /** Resolution context for file-based inference */
  context?: ResolutionContext;
}
import { PrimaryAgentResolver } from './primary-agent-resolver';
import { ActivationMessageBuilder } from './activation-message.builder';
import { asyncWithFallback } from '../shared/async.utils';
import { filterRulesByMode } from './rule-filter';

/**
 * Maximum allowed prompt length for defense-in-depth input validation.
 * Prevents potential ReDoS attacks from extremely long input strings.
 * 50KB should be sufficient for any reasonable prompt while protecting against abuse.
 */
const MAX_PROMPT_LENGTH = 50_000;

const DEFAULT_CONFIG: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions:
        '🔴 SESSION AUTO-CREATED: Check autoSession field for session ID. ' +
        'Call update_session with mode=PLAN, recommendedActAgent, and decisions to persist context. ' +
        'Design first approach. Define test cases from TDD perspective. Review architecture before implementation.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
      agent: MODE_AGENTS[0],
      // delegates_to is now resolved dynamically via PrimaryAgentResolver
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
      ],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions:
        '🔴 FIRST: Check autoSession or call get_active_session to read PLAN context and recommended agent. ' +
        'Use the recommended agent from PLAN. Follow Red-Green-Refactor cycle. ' +
        'Call update_session with mode=ACT to record implementation progress.',
      rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      agent: MODE_AGENTS[1],
      // delegates_to is now resolved dynamically via PrimaryAgentResolver
      defaultSpecialists: [
        'code-quality-specialist',
        'test-strategy-specialist',
      ],
    },
    EVAL: {
      description: 'Result review and assessment phase',
      instructions:
        '🔴 FIRST: Check autoSession or call get_active_session to read full context. ' +
        'Review code quality. Verify SOLID principles. Check test coverage. ' +
        'Call update_session with mode=EVAL and findings.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
      agent: MODE_AGENTS[2],
      delegates_to: 'code-reviewer', // EVAL always uses code-reviewer
      defaultSpecialists: [
        'security-specialist',
        'accessibility-specialist',
        'performance-specialist',
        'code-quality-specialist',
      ],
    },
    AUTO: {
      description:
        'Autonomous execution mode - PLAN → ACT → EVAL cycle until quality achieved',
      instructions:
        '🔴 SESSION AUTO-CREATED: Check autoSession field. ' +
        'Execute PLAN → ACT → EVAL cycle automatically. Repeat until Critical/High issues = 0 or max iterations reached. ' +
        'Update session at each phase transition to maintain context across iterations.',
      rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
      agent: MODE_AGENTS[3], // 'auto-mode'
      defaultSpecialists: [
        'architecture-specialist',
        'test-strategy-specialist',
        'security-specialist',
        'code-quality-specialist',
      ],
    },
  },
  defaultMode: 'PLAN',
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

  /**
   * Cached regex patterns for context-aware specialist detection.
   * Static properties to avoid regex recompilation on each method call.
   * Follows Open/Closed principle - add new specialists by adding patterns.
   */
  private static readonly CONTEXT_SPECIALIST_PATTERNS: ReadonlyArray<{
    pattern: RegExp;
    specialist: string;
  }> = [
    // Security keywords → security-specialist
    {
      pattern:
        /보안|security|auth|인증|JWT|OAuth|XSS|CSRF|취약점|vulnerability/i,
      specialist: 'security-specialist',
    },
    // Accessibility keywords → accessibility-specialist
    {
      pattern:
        /접근성|accessibility|a11y|WCAG|aria|스크린\s*리더|screen\s*reader/i,
      specialist: 'accessibility-specialist',
    },
    // Performance keywords → performance-specialist
    {
      pattern:
        /성능|performance|최적화|optimiz|빠르게|느린|slow|fast|bundle\s*size|로딩/i,
      specialist: 'performance-specialist',
    },
    // i18n keywords → i18n-specialist
    {
      pattern:
        /다국어|i18n|internationalization|번역|locale|translation|localization/i,
      specialist: 'i18n-specialist',
    },
    // SEO keywords → seo-specialist
    {
      pattern:
        /SEO|검색\s*엔진|search\s*engine|메타|meta\s*tag|sitemap|구조화\s*데이터/i,
      specialist: 'seo-specialist',
    },
    // Documentation keywords → documentation-specialist
    {
      pattern: /문서화|document|README|API\s*문서|JSDoc|주석|comment/i,
      specialist: 'documentation-specialist',
    },
    // UI/UX keywords → ui-ux-designer
    {
      pattern:
        /UI|UX|디자인|design\s*system|사용자\s*경험|user\s*experience|인터랙션/i,
      specialist: 'ui-ux-designer',
    },
  ];

  constructor(
    private readonly loadConfigFn: () => Promise<KeywordModesConfig>,
    private readonly loadRuleFn: (path: string) => Promise<string>,
    private readonly loadAgentInfoFn?: (agentName: string) => Promise<unknown>,
    primaryAgentResolver?: PrimaryAgentResolver,
    private readonly loadAutoConfigFn?: () => Promise<AutoConfig | null>,
  ) {
    this.primaryAgentResolver = primaryAgentResolver;
    // Environment-based TTL: 5 minutes for development, 1 hour for production
    this.cacheTTL = process.env.NODE_ENV === 'production' ? 3600000 : 300000;
  }

  async parseMode(
    prompt: string,
    options?: ParseModeOptions,
  ): Promise<ParseModeResult> {
    // Defense-in-depth: validate input length to prevent ReDoS attacks
    if (prompt.length > MAX_PROMPT_LENGTH) {
      this.logger.warn(
        `Prompt exceeds maximum length (${prompt.length} > ${MAX_PROMPT_LENGTH}), truncating`,
      );
      prompt = prompt.slice(0, MAX_PROMPT_LENGTH);
    }

    const config = await this.loadModeConfig();
    const { mode, originalPrompt, warnings } = this.extractModeFromPrompt(
      prompt,
      config.defaultMode,
    );

    const modeConfig = config.modes[mode];
    const rules = await this.getRulesForMode(mode);

    // Only pass recommendedActAgent for ACT mode
    const effectiveRecommendedAgent =
      mode === 'ACT' ? options?.recommendedActAgent : undefined;

    return this.buildParseModeResult(
      mode,
      originalPrompt,
      warnings,
      modeConfig,
      rules,
      config,
      options?.context,
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
      LOCALIZED_KEYWORD_MAP[keywordCandidate] ??
      LOCALIZED_KEYWORD_MAP[keywordUpper];

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
  private checkForMultipleKeywordsInPrompt(
    originalPrompt: string,
    warnings: string[],
  ): void {
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
  private checkForEmptyContent(
    originalPrompt: string,
    warnings: string[],
  ): void {
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
    context?: ResolutionContext,
    recommendedActAgent?: string,
  ): Promise<ParseModeResult> {
    // 1. Build base result object
    const result = this.buildBaseResult(
      mode,
      originalPrompt,
      warnings,
      modeConfig,
      rules,
    );

    // 2. Resolve and add Primary Agent information
    const resolvedAgent = await this.resolvePrimaryAgent(
      mode,
      originalPrompt,
      modeConfig.delegates_to,
      context,
      recommendedActAgent,
    );
    await this.addAgentInfoToResult(result, resolvedAgent);

    // 3. Add parallel agents recommendation
    this.addParallelAgentsToResult(result, mode, config, originalPrompt);

    // 4. Add ACT agent recommendation for PLAN mode
    await this.addActRecommendationToResult(result, mode, originalPrompt);

    // 5. Add activation message
    this.addActivationMessageToResult(result, resolvedAgent);

    // 6. Add AUTO config for AUTO mode
    await this.addAutoConfigToResult(result, mode);

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
    const recommendation = this.getParallelAgentsRecommendation(
      mode,
      config,
      originalPrompt,
    );
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
    if (mode !== 'PLAN' || !this.primaryAgentResolver) {
      return;
    }

    const actRecommendation =
      await this.getActAgentRecommendation(originalPrompt);
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
      result.activation_message = ActivationMessageBuilder.forPrimaryAgent(
        resolvedAgent.agentName,
      );
    }
  }

  /**
   * Add AUTO config for AUTO mode.
   */
  private async addAutoConfigToResult(
    result: ParseModeResult,
    mode: Mode,
  ): Promise<void> {
    if (mode !== 'AUTO') {
      return;
    }

    const autoConfig = await this.getAutoConfig();
    result.autoConfig = autoConfig;
  }

  /**
   * Determine if an agent is a primary or specialist tier.
   */
  private getPrimaryAgentTier(agentName: string): 'primary' | 'specialist' {
    // Type assertion needed because ALL_PRIMARY_AGENTS is readonly tuple
    return (ALL_PRIMARY_AGENTS as readonly string[]).includes(agentName)
      ? 'primary'
      : 'specialist';
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
    const contextSpecialists = prompt
      ? this.getContextAwareSpecialists(prompt)
      : [];

    // Merge base and context specialists (deduplicated)
    const allSpecialists = [
      ...new Set([...baseSpecialists, ...contextSpecialists]),
    ];

    if (allSpecialists.length === 0) {
      return undefined;
    }

    return {
      specialists: allSpecialists,
      hint: `Use Task tool with subagent_type="general-purpose" and run_in_background=true for each specialist. Call prepare_parallel_agents MCP tool to get ready-to-use prompts.`,
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

    for (const {
      pattern,
      specialist,
    } of KeywordService.CONTEXT_SPECIALIST_PATTERNS) {
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
        const result = await this.primaryAgentResolver!.resolve('ACT', prompt);

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

  async getRulesForMode(mode: Mode): Promise<RuleContent[]> {
    const config = await this.loadModeConfig();
    const modeConfig = config.modes[mode];
    const rules: RuleContent[] = [];

    for (const rulePath of modeConfig.rules) {
      const content = await asyncWithFallback({
        fn: () => this.loadRuleFn(rulePath),
        fallback: null as string | null,
        errorMessage: `Skipping rule file '${rulePath}': \${error}`,
        logger: this.logger,
      });

      if (content !== null) {
        rules.push({ name: rulePath, content });
      }
    }

    return rules;
  }

  private async getAgentInfo(
    agentName: string,
  ): Promise<AgentInfo | undefined> {
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
          description:
            typeof agent.description === 'string' ? agent.description : '',
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
