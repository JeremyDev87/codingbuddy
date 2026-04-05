import { Injectable } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import {
  extractRequiredString,
  extractStringArray,
  extractOptionalString,
} from '../../shared/validation.constants';
import type {
  AgentOpinion,
  DisabledDiscussionResult,
  DiscussionResult,
  ExperimentalDiscussionResult,
  OpinionSeverity,
  ConsensusStatus,
} from './discussion.types';
import {
  DISABLED_DISCUSSION_REASON,
  EXPERIMENTAL_DISCUSSION_ENV,
  EXPERIMENTAL_DISCUSSION_WARNING,
  VALID_SEVERITIES,
} from './discussion.types';
import { RuleEventCollector } from '../../rules/rule-event-collector';

/**
 * Specialist domain knowledge mapping.
 * Maps agent names to their domain focus areas.
 */
const SPECIALIST_DOMAINS: Record<string, { domain: string; defaultSeverity: OpinionSeverity }> = {
  'security-specialist': { domain: 'security', defaultSeverity: 'high' },
  'performance-specialist': { domain: 'performance', defaultSeverity: 'medium' },
  'accessibility-specialist': { domain: 'accessibility', defaultSeverity: 'medium' },
  'code-quality': { domain: 'code quality', defaultSeverity: 'low' },
  'test-strategy': { domain: 'testing', defaultSeverity: 'medium' },
  architecture: { domain: 'architecture', defaultSeverity: 'medium' },
  'seo-specialist': { domain: 'SEO', defaultSeverity: 'low' },
  documentation: { domain: 'documentation', defaultSeverity: 'info' },
};

const SEVERITY_ORDER: readonly OpinionSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];

/**
 * Handler for the agent_discussion tool.
 *
 * EXPERIMENTAL — disabled by default. Current output is templated synthesis of
 * specialist opinions rather than real specialist execution, so it does NOT
 * represent collective intelligence from live agents. The tool returns a
 * {@link DisabledDiscussionResult} unless the caller explicitly opts in via
 * `CODINGBUDDY_EXPERIMENTAL_DISCUSSION=1`, in which case it returns an
 * {@link ExperimentalDiscussionResult} that carries a warning banner so
 * consumers cannot mistake the output for a real multi-agent debate.
 *
 * A follow-up effort should rebuild this on top of real specialist dispatch;
 * until then callers should prefer `dispatch_agents` for actual expert input.
 */
@Injectable()
export class DiscussionHandler extends AbstractHandler {
  constructor(private readonly ruleEventCollector: RuleEventCollector) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['agent_discussion'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'agent_discussion':
        return this.handleAgentDiscussion(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'agent_discussion',
        description:
          '[EXPERIMENTAL — disabled by default] Produces templated synthesis of ' +
          'specialist opinions, not real specialist execution. The output does ' +
          'not reflect collective intelligence from live agents; treat it as a ' +
          'placeholder until the rebuild lands. Enable by setting ' +
          `${EXPERIMENTAL_DISCUSSION_ENV}=1. When disabled, the tool returns ` +
          '{disabled: true} without invoking synthesis.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'The topic or question to discuss among specialists',
            },
            specialists: {
              type: 'array',
              items: { type: 'string' },
              description:
                'List of specialist agent names to participate in the discussion ' +
                '(e.g., ["security-specialist", "performance-specialist"])',
            },
            context: {
              type: 'string',
              description: 'Optional additional context for the discussion',
            },
          },
          required: ['topic', 'specialists'],
        },
      },
    ];
  }

  private async handleAgentDiscussion(
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    if (!this.isExperimentalEnabled()) {
      const disabled: DisabledDiscussionResult = {
        disabled: true,
        reason: DISABLED_DISCUSSION_REASON,
        experimentalFlag: EXPERIMENTAL_DISCUSSION_ENV,
      };
      return createJsonResponse(disabled);
    }

    const topic = extractRequiredString(args, 'topic');
    if (topic === null) {
      return createErrorResponse('Missing required parameter: topic');
    }

    const specialists = extractStringArray(args, 'specialists');
    if (!specialists || specialists.length === 0) {
      return createErrorResponse(
        'Missing required parameter: specialists (array with at least one specialist)',
      );
    }

    const context = extractOptionalString(args, 'context');

    const opinions = this.collectOpinions(topic, specialists, context);
    const consensus = this.detectConsensus(opinions);
    const maxSeverity = this.computeMaxSeverity(opinions);
    const summary = this.generateSummary(topic, opinions, consensus);

    const base: DiscussionResult = {
      topic,
      specialists,
      opinions,
      consensus,
      summary,
      maxSeverity,
    };

    const result: ExperimentalDiscussionResult = {
      ...base,
      experimental: true,
      warning: EXPERIMENTAL_DISCUSSION_WARNING,
    };

    try {
      const timestamp = new Date().toISOString();
      for (const specialist of specialists) {
        this.ruleEventCollector.record({
          type: 'specialist_dispatched',
          timestamp,
          domain: specialist,
        });
      }
    } catch {
      // Fire-and-forget: never break handler execution
    }

    return createJsonResponse(result);
  }

  /**
   * Returns true only when the experimental flag env var is set to the
   * explicit opt-in value "1". Any other value (including "true", "yes",
   * or unset) leaves the tool disabled so callers cannot accidentally
   * consume templated synthesis.
   */
  private isExperimentalEnabled(): boolean {
    return process.env[EXPERIMENTAL_DISCUSSION_ENV] === '1';
  }

  /**
   * Collect opinions from each specialist agent.
   */
  private collectOpinions(
    topic: string,
    specialists: string[],
    context: string | undefined,
  ): AgentOpinion[] {
    return specialists.map(agent => this.generateOpinion(agent, topic, context));
  }

  /**
   * Generate an opinion for a given specialist agent.
   */
  private generateOpinion(agent: string, topic: string, context: string | undefined): AgentOpinion {
    const domainInfo = SPECIALIST_DOMAINS[agent] ?? {
      domain: agent,
      defaultSeverity: 'medium' as OpinionSeverity,
    };
    const contextNote = context ? ` (context: ${context})` : '';

    return {
      agent,
      opinion:
        `${domainInfo.domain} analysis of "${topic}"${contextNote}: ` +
        `Reviewed from ${domainInfo.domain} perspective. Findings require attention.`,
      severity: domainInfo.defaultSeverity,
      evidence: [
        `Analyzed topic from ${domainInfo.domain} perspective`,
        `Applied ${domainInfo.domain} best practices and guidelines`,
      ],
      recommendation:
        `Address ${domainInfo.domain} considerations for "${topic}" ` +
        `following established best practices.`,
    };
  }

  /**
   * Detect consensus among agent opinions based on severity distribution.
   */
  private detectConsensus(opinions: AgentOpinion[]): ConsensusStatus {
    if (opinions.length <= 1) {
      return 'consensus';
    }

    const severities = opinions.map(o => o.severity);
    const uniqueSeverities = new Set(severities);

    if (uniqueSeverities.size === 1) {
      return 'consensus';
    }

    // Check if majority agrees (>50% same severity)
    const severityCounts = new Map<OpinionSeverity, number>();
    for (const s of severities) {
      severityCounts.set(s, (severityCounts.get(s) ?? 0) + 1);
    }
    const maxCount = Math.max(...severityCounts.values());
    const majorityThreshold = opinions.length / 2;

    if (maxCount > majorityThreshold) {
      return 'majority';
    }

    if (uniqueSeverities.size === opinions.length) {
      return 'disagreement';
    }

    return 'split';
  }

  /**
   * Compute the highest severity across all opinions.
   */
  private computeMaxSeverity(opinions: AgentOpinion[]): OpinionSeverity {
    if (opinions.length === 0) {
      return 'info';
    }

    let maxIndex = 0;
    for (const opinion of opinions) {
      const index = SEVERITY_ORDER.indexOf(opinion.severity);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }
    return SEVERITY_ORDER[maxIndex];
  }

  /**
   * Generate a human-readable summary of the discussion.
   */
  private generateSummary(
    topic: string,
    opinions: AgentOpinion[],
    consensus: ConsensusStatus,
  ): string {
    const agentCount = opinions.length;
    const consensusLabel = {
      consensus: 'reached consensus',
      majority: 'reached majority agreement',
      split: 'had split opinions',
      disagreement: 'had significant disagreement',
    }[consensus];

    const severities = [...new Set(opinions.map(o => o.severity))].join(', ');

    return (
      `Discussion on "${topic}" with ${agentCount} specialist(s) ${consensusLabel}. ` +
      `Severity levels: ${severities}. ` +
      `${VALID_SEVERITIES.indexOf(this.computeMaxSeverity(opinions)) >= 3 ? 'Immediate action recommended.' : 'Review recommended.'}`
    );
  }
}
