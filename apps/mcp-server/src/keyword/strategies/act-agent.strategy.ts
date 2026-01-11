/**
 * ACT Mode Agent Resolution Strategy
 *
 * Resolves the appropriate implementation agent based on multiple factors.
 *
 * Resolution Priority Order:
 * 1. Explicit request in prompt ("backend-developer로 작업해")
 * 2. Recommended agent from PLAN mode
 * 3. Project configuration (primaryAgent setting)
 * 4. Meta-discussion detection (skip intent patterns if discussing agent names)
 * 5-11. Intent patterns (agent, tooling, platform, data, ai-ml, backend, mobile)
 * 12. Context-based suggestion (file path inference)
 * 13. Default fallback (frontend-developer)
 */

import { Logger } from '@nestjs/common';
import { DEFAULT_ACT_AGENT, ACT_PRIMARY_AGENTS } from '../keyword.types';
import type {
  PrimaryAgentResolutionResult,
  PrimaryAgentSource,
} from '../keyword.types';
import {
  EXPLICIT_PATTERNS,
  INTENT_PATTERN_CHECKS,
  CONTEXT_PATTERNS,
  META_AGENT_DISCUSSION_PATTERNS,
  type IntentPattern,
} from '../patterns';
import type {
  ResolutionStrategy,
  StrategyContext,
  GetProjectConfigFn,
} from './resolution-strategy.interface';

/**
 * Create a resolution result object.
 */
function createResult(
  agentName: string,
  source: PrimaryAgentSource,
  confidence: number,
  reason: string,
): PrimaryAgentResolutionResult {
  return { agentName, source, confidence, reason };
}

/**
 * Parse explicit agent request from prompt.
 */
function parseExplicitRequest(
  prompt: string,
  availableAgents: string[],
): PrimaryAgentResolutionResult | null {
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const agentName = match[1].toLowerCase();
      const isAvailable = availableAgents.includes(agentName);
      const isAllowed = (ACT_PRIMARY_AGENTS as readonly string[]).includes(
        agentName,
      );
      if (isAvailable && isAllowed) {
        return createResult(
          agentName,
          'explicit',
          1.0,
          `Explicit request for ${agentName} in prompt`,
        );
      }
    }
  }
  return null;
}

/**
 * Check if the prompt is a meta-discussion about agents.
 */
function isMetaAgentDiscussion(prompt: string): boolean {
  return META_AGENT_DISCUSSION_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * Infer agent from intent patterns.
 */
function inferFromIntentPatterns(
  prompt: string,
  availableAgents: string[],
  targetAgent: string,
  patterns: ReadonlyArray<IntentPattern>,
  patternCategory: string,
): PrimaryAgentResolutionResult | null {
  if (!availableAgents.includes(targetAgent)) {
    return null;
  }

  for (const { pattern, confidence, description } of patterns) {
    if (pattern.test(prompt)) {
      return createResult(
        targetAgent,
        'intent',
        confidence,
        `${patternCategory} pattern detected: ${description}`,
      );
    }
  }

  return null;
}

/**
 * Infer agent from context (file path).
 */
function inferFromContext(
  filePath: string | undefined,
  projectType: string | undefined,
  availableAgents: string[],
): PrimaryAgentResolutionResult | null {
  if (filePath) {
    for (const { pattern, agent, confidence } of CONTEXT_PATTERNS) {
      if (pattern.test(filePath)) {
        if (availableAgents.includes(agent)) {
          return createResult(
            agent,
            'context',
            confidence,
            `Inferred from file path: ${filePath}`,
          );
        }
      }
    }
  }

  if (projectType === 'infrastructure') {
    if (availableAgents.includes('devops-engineer')) {
      return createResult(
        'devops-engineer',
        'context',
        0.85,
        `Inferred from project type: ${projectType}`,
      );
    }
  }

  return null;
}

/**
 * ACT Agent Strategy
 *
 * Resolves the appropriate implementation agent based on multiple factors.
 */
export class ActAgentStrategy implements ResolutionStrategy {
  private readonly logger = new Logger(ActAgentStrategy.name);

  constructor(private readonly getProjectConfig: GetProjectConfigFn) {}

  async resolve(ctx: StrategyContext): Promise<PrimaryAgentResolutionResult> {
    const { prompt, availableAgents, context, recommendedActAgent } = ctx;

    // 1. Check explicit request in prompt
    const explicit = parseExplicitRequest(prompt, availableAgents);
    if (explicit) {
      this.logger.debug(`Explicit ACT agent request: ${explicit.agentName}`);
      return explicit;
    }

    // 2. Use recommended agent from PLAN mode if provided
    if (recommendedActAgent && availableAgents.includes(recommendedActAgent)) {
      this.logger.debug(
        `Using recommended agent from PLAN: ${recommendedActAgent}`,
      );
      return createResult(
        recommendedActAgent,
        'config',
        1.0,
        `Using recommended agent from PLAN mode: ${recommendedActAgent}`,
      );
    }

    // 3. Check project configuration
    const fromConfig = await this.getFromProjectConfig(availableAgents);
    if (fromConfig) {
      this.logger.debug(`Agent from project config: ${fromConfig.agentName}`);
      return fromConfig;
    }

    // 4. Meta-discussion detection
    if (isMetaAgentDiscussion(prompt)) {
      this.logger.debug(
        'Meta-agent discussion detected, skipping intent patterns',
      );
    } else {
      // 5-11. Check intent patterns in priority order
      for (const { agent, patterns, category } of INTENT_PATTERN_CHECKS) {
        const result = inferFromIntentPatterns(
          prompt,
          availableAgents,
          agent,
          patterns,
          category,
        );
        if (result) {
          this.logger.debug(
            `Intent pattern match: ${result.agentName} (${result.reason})`,
          );
          return result;
        }
      }
    }

    // 12. Check context-based suggestion
    if (context) {
      const fromContext = inferFromContext(
        context.filePath,
        context.projectType,
        availableAgents,
      );
      if (fromContext && fromContext.confidence >= 0.8) {
        this.logger.debug(`Context-based agent: ${fromContext.agentName}`);
        return fromContext;
      }
    }

    // 13. Default fallback
    return this.getDefaultFallback(availableAgents);
  }

  private async getFromProjectConfig(
    availableAgents: string[],
  ): Promise<PrimaryAgentResolutionResult | null> {
    try {
      const config = await this.getProjectConfig();
      if (config?.primaryAgent) {
        const agentName = config.primaryAgent.toLowerCase();
        if (availableAgents.includes(agentName)) {
          return createResult(
            agentName,
            'config',
            1.0,
            `Configured in project: ${agentName}`,
          );
        }
        this.logger.warn(
          `Configured agent '${config.primaryAgent}' not found in registry. ` +
            `Available: ${availableAgents.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load project config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
    return null;
  }

  private getDefaultFallback(
    availableAgents: string[],
  ): PrimaryAgentResolutionResult {
    if (availableAgents.includes(DEFAULT_ACT_AGENT)) {
      return createResult(
        DEFAULT_ACT_AGENT,
        'default',
        1.0,
        'ACT mode default: frontend-developer (no specific intent detected)',
      );
    }

    if (availableAgents.length > 0) {
      return createResult(
        availableAgents[0],
        'default',
        0.8,
        `ACT mode fallback: ${availableAgents[0]} (default agent excluded)`,
      );
    }

    return createResult(
      DEFAULT_ACT_AGENT,
      'default',
      0.5,
      'ACT mode fallback: frontend-developer (no agents available)',
    );
  }
}
