/**
 * Primary Agent Resolver
 *
 * Resolves which Primary Agent to use based on:
 * 1. Explicit request in prompt (highest priority)
 * 2. Project configuration
 * 3. Intent analysis (prompt content analysis)
 * 4. Context (file path, project type)
 * 5. Default fallback (frontend-developer)
 *
 * This is the main entry point for agent resolution.
 * Resolution logic is delegated to mode-specific strategies.
 */

import { Logger } from '@nestjs/common';
import {
  ALL_PRIMARY_AGENTS,
  type Mode,
  type PrimaryAgentResolutionResult,
  type ResolutionContext,
} from './keyword.types';
import {
  EvalAgentStrategy,
  PlanAgentStrategy,
  ActAgentStrategy,
  type ResolutionStrategy,
  type GetProjectConfigFn,
  type ListPrimaryAgentsFn,
  type StrategyContext,
} from './strategies';

// Re-export types for backward compatibility
export type { IntentPattern } from './patterns';

/**
 * PrimaryAgentResolver - Main resolver class for agent selection.
 *
 * Uses the Strategy pattern to delegate resolution logic to mode-specific strategies:
 * - PLAN mode: PlanAgentStrategy (solution-architect or technical-planner)
 * - ACT mode: ActAgentStrategy (intent-based resolution)
 * - EVAL mode: EvalAgentStrategy (always code-reviewer)
 */
export class PrimaryAgentResolver {
  private readonly logger = new Logger(PrimaryAgentResolver.name);

  private readonly evalStrategy: ResolutionStrategy;
  private readonly planStrategy: ResolutionStrategy;
  private readonly actStrategy: ResolutionStrategy;

  constructor(
    private readonly getProjectConfig: GetProjectConfigFn,
    private readonly listPrimaryAgents: ListPrimaryAgentsFn,
  ) {
    this.evalStrategy = new EvalAgentStrategy();
    this.planStrategy = new PlanAgentStrategy();
    this.actStrategy = new ActAgentStrategy(this.getProjectConfig);
  }

  /**
   * Resolve which Primary Agent to use.
   *
   * Mode-specific behavior:
   * - PLAN: Always uses solution-architect or technical-planner
   * - ACT: Uses recommended agent if provided, otherwise AI analysis
   * - EVAL: Always uses code-reviewer
   *
   * @param mode - Current workflow mode (PLAN, ACT, EVAL)
   * @param prompt - User's prompt to analyze
   * @param context - Optional context (file path, project type)
   * @param recommendedActAgent - ACT agent recommended by PLAN mode (only for ACT mode)
   * @returns Resolution result with agent name, source, confidence, and reason
   */
  async resolve(
    mode: Mode,
    prompt: string,
    context?: ResolutionContext,
    recommendedActAgent?: string,
  ): Promise<PrimaryAgentResolutionResult> {
    // Get available agents and filter out excluded ones
    const allAgents = await this.safeListPrimaryAgents();
    const availableAgents = await this.filterExcludedAgents(allAgents);

    // Build strategy context
    const strategyContext: StrategyContext = {
      prompt,
      availableAgents,
      context,
      recommendedActAgent,
    };

    // Delegate to mode-specific strategy
    const strategy = this.getStrategy(mode);
    const result = await strategy.resolve(strategyContext);

    this.logger.debug(
      `[${mode}] Resolved agent: ${result.agentName} (source: ${result.source}, confidence: ${result.confidence})`,
    );

    return result;
  }

  /**
   * Get the appropriate strategy for the given mode.
   */
  private getStrategy(mode: Mode): ResolutionStrategy {
    switch (mode) {
      case 'EVAL':
        return this.evalStrategy;
      case 'PLAN':
        return this.planStrategy;
      case 'ACT':
      default:
        return this.actStrategy;
    }
  }

  /**
   * Filter out agents that are excluded in project configuration.
   * This allows projects to prevent certain agents from being recommended.
   *
   * @example
   * // codingbuddy.config.js
   * ai: {
   *   excludeAgents: ['mobile-developer', 'frontend-developer'],
   * }
   */
  private async filterExcludedAgents(agents: string[]): Promise<string[]> {
    try {
      const config = await this.getProjectConfig();
      if (config?.excludeAgents && config.excludeAgents.length > 0) {
        const excluded = new Set(
          config.excludeAgents.map(a => a.toLowerCase()),
        );
        const filtered = agents.filter(agent => !excluded.has(agent));

        if (filtered.length < agents.length) {
          this.logger.debug(
            `Excluded agents from resolution: ${config.excludeAgents.join(', ')}`,
          );
        }

        return filtered;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get excludeAgents from config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
    return agents;
  }

  /**
   * Safely list primary agents, returning default list on error.
   */
  private async safeListPrimaryAgents(): Promise<string[]> {
    try {
      const agents = await this.listPrimaryAgents();
      if (agents.length === 0) {
        this.logger.debug(
          'No primary agents found in registry, using default fallback list',
        );
        return [...ALL_PRIMARY_AGENTS];
      }
      return agents;
    } catch (error) {
      this.logger.warn(
        `Failed to list primary agents: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Using fallback list.`,
      );
      return [...ALL_PRIMARY_AGENTS];
    }
  }
}
