import { Logger } from '@nestjs/common';
import {
  KEYWORDS,
  LOCALIZED_KEYWORD_MAP,
  MODE_AGENTS,
  ALL_PRIMARY_AGENTS_LIST,
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
} from './keyword.types';

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
import { filterRulesByMode } from './rule-filter';

const DEFAULT_CONFIG: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions:
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
        'Follow Red-Green-Refactor cycle. Implement minimally then improve incrementally. Verify quality standards.',
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
        'Review code quality. Verify SOLID principles. Check test coverage. Suggest improvements.',
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
        'Execute PLAN → ACT → EVAL cycle automatically. Repeat until Critical/High issues = 0 or max iterations reached.',
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

export class KeywordService {
  private readonly logger = new Logger(KeywordService.name);
  private configCache: KeywordModesConfig | null = null;
  private readonly primaryAgentResolver?: PrimaryAgentResolver;

  constructor(
    private readonly loadConfigFn: () => Promise<KeywordModesConfig>,
    private readonly loadRuleFn: (path: string) => Promise<string>,
    private readonly loadAgentInfoFn?: (agentName: string) => Promise<unknown>,
    primaryAgentResolver?: PrimaryAgentResolver,
  ) {
    this.primaryAgentResolver = primaryAgentResolver;
  }

  async parseMode(
    prompt: string,
    options?: ParseModeOptions,
  ): Promise<ParseModeResult> {
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
   */
  private extractModeFromPrompt(
    prompt: string,
    defaultMode: Mode,
  ): { mode: Mode; originalPrompt: string; warnings: string[] } {
    const warnings: string[] = [];
    const trimmed = prompt.trim();
    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0] ?? '';
    const firstWordUpper = firstWord.toUpperCase();

    // Check English keywords (case-insensitive)
    const isEnglishKeyword = KEYWORDS.includes(firstWordUpper as Mode);
    // Check localized keywords (exact match for CJK, case-insensitive for Spanish)
    const localizedMode =
      LOCALIZED_KEYWORD_MAP[firstWord] ?? LOCALIZED_KEYWORD_MAP[firstWordUpper];

    if (isEnglishKeyword) {
      const mode = firstWordUpper as Mode;
      const originalPrompt = trimmed.slice(firstWord.length).trim();
      this.checkForMultipleKeywords(parts, warnings);
      this.checkForEmptyContent(originalPrompt, warnings);
      return { mode, originalPrompt, warnings };
    }

    if (localizedMode) {
      const originalPrompt = trimmed.slice(firstWord.length).trim();
      this.checkForMultipleKeywords(parts, warnings);
      this.checkForEmptyContent(originalPrompt, warnings);
      return { mode: localizedMode, originalPrompt, warnings };
    }

    // No keyword found - use default mode
    warnings.push('No keyword found, defaulting to PLAN');
    return { mode: defaultMode, originalPrompt: trimmed, warnings };
  }

  /**
   * Check if second word is also a keyword and add warning.
   */
  private checkForMultipleKeywords(parts: string[], warnings: string[]): void {
    if (parts.length <= 1) return;

    const secondWord = parts[1];
    const secondWordUpper = secondWord.toUpperCase();
    const isSecondKeyword =
      KEYWORDS.includes(secondWordUpper as Mode) ||
      LOCALIZED_KEYWORD_MAP[secondWord] !== undefined ||
      LOCALIZED_KEYWORD_MAP[secondWordUpper] !== undefined;

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
    // Filter rules by mode to reduce token usage
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

    // Resolve Primary Agent dynamically
    const resolvedAgent = await this.resolvePrimaryAgent(
      mode,
      originalPrompt,
      modeConfig.delegates_to,
      context,
      recommendedActAgent,
    );

    if (resolvedAgent) {
      result.delegates_to = resolvedAgent.agentName;
      result.primary_agent_source = resolvedAgent.source;

      const delegateAgentInfo = await this.getAgentInfo(
        resolvedAgent.agentName,
      );
      if (delegateAgentInfo) {
        result.delegate_agent_info = delegateAgentInfo;
      }
    }

    // Add parallel agents recommendation
    const parallelAgentsRecommendation = this.getParallelAgentsRecommendation(
      mode,
      config,
    );
    if (parallelAgentsRecommendation) {
      result.parallelAgentsRecommendation = parallelAgentsRecommendation;
    }

    // Add ACT agent recommendation for PLAN mode
    if (mode === 'PLAN' && this.primaryAgentResolver) {
      const actRecommendation =
        await this.getActAgentRecommendation(originalPrompt);
      if (actRecommendation) {
        result.recommended_act_agent = actRecommendation;
        result.available_act_agents = [...ACT_PRIMARY_AGENTS];
      }
    }

    // Add activation message for transparency
    if (resolvedAgent) {
      const tier = this.getPrimaryAgentTier(resolvedAgent.agentName);
      const activationMessage = ActivationMessageBuilder.forPrimaryAgent(
        resolvedAgent.agentName,
      );
      // Adjust tier in activation if needed
      if (tier === 'specialist') {
        result.activation_message = ActivationMessageBuilder.forSpecialistAgent(
          resolvedAgent.agentName,
        );
      } else {
        result.activation_message = activationMessage;
      }
    }

    // Add autoConfig for AUTO mode
    if (mode === 'AUTO') {
      result.autoConfig = {
        maxIterations: 3, // TODO: Make configurable via config file
      };
    }

    return result;
  }

  /**
   * Determine if an agent is a primary or specialist tier.
   */
  private getPrimaryAgentTier(agentName: string): 'primary' | 'specialist' {
    return ALL_PRIMARY_AGENTS_LIST.includes(agentName)
      ? 'primary'
      : 'specialist';
  }

  /**
   * Get recommended parallel agents for a given mode.
   * These specialists can be executed as Claude Code subagents via Task tool.
   */
  private getParallelAgentsRecommendation(
    mode: Mode,
    config: KeywordModesConfig,
  ): ParallelAgentRecommendation | undefined {
    const modeConfig = config.modes[mode];
    const specialists = modeConfig?.defaultSpecialists;
    if (!specialists || specialists.length === 0) {
      return undefined;
    }

    return {
      specialists: [...specialists],
      hint: `Use Task tool with subagent_type="general-purpose" and run_in_background=true for each specialist. Call prepare_parallel_agents MCP tool to get ready-to-use prompts.`,
    };
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

    try {
      // Use resolver to analyze prompt as if it were ACT mode
      const result = await this.primaryAgentResolver.resolve('ACT', prompt);

      return {
        agentName: result.agentName,
        reason: result.reason,
        confidence: result.confidence,
      };
    } catch (error) {
      this.logger.debug(
        `Failed to get ACT agent recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
  }

  async loadModeConfig(): Promise<KeywordModesConfig> {
    if (this.configCache) {
      return this.configCache;
    }

    try {
      this.configCache = await this.loadConfigFn();
      return this.configCache;
    } catch (error) {
      this.logger.debug(
        `Failed to load mode config, using defaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  async getRulesForMode(mode: Mode): Promise<RuleContent[]> {
    const config = await this.loadModeConfig();
    const modeConfig = config.modes[mode];
    const rules: RuleContent[] = [];

    for (const rulePath of modeConfig.rules) {
      try {
        const content = await this.loadRuleFn(rulePath);
        rules.push({ name: rulePath, content });
      } catch (error) {
        this.logger.debug(
          `Skipping rule file '${rulePath}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
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

    try {
      const agentData = await this.loadAgentInfoFn(agentName);

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
    } catch (error) {
      this.logger.debug(
        `Failed to load agent info for '${agentName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return undefined;
    }
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
