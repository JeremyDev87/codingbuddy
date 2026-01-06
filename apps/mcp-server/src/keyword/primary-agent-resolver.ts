import { Logger } from '@nestjs/common';
import {
  type Mode,
  type PrimaryAgentResolutionResult,
  type PrimaryAgentSource,
  type ResolutionContext,
} from './keyword.types';

/** Project config interface for Primary Agent configuration */
interface ProjectConfig {
  primaryAgent?: string;
}

/** Function type for loading project config */
type GetProjectConfigFn = () => Promise<ProjectConfig | null>;

/** Function type for listing available primary agents */
type ListPrimaryAgentsFn = () => Promise<string[]>;

/**
 * PrimaryAgentResolver - Resolves which Primary Agent to use based on:
 * 1. Explicit request in prompt (highest priority)
 * 2. Project configuration
 * 3. Context (file path, project type)
 * 4. Default fallback (frontend-developer)
 */
export class PrimaryAgentResolver {
  private readonly logger = new Logger(PrimaryAgentResolver.name);
  private static readonly DEFAULT_AGENT = 'frontend-developer';
  private static readonly EVAL_AGENT = 'code-reviewer';

  /** Patterns for explicit agent request in prompts */
  private static readonly EXPLICIT_PATTERNS = [
    // Korean patterns: "~로 작업해", "~으로 해줘", "~로 해"
    /(\w+-\w+)(?:로|으로)\s*(?:작업|개발|해)/i,
    // English patterns: "use ~ agent", "using ~"
    /(?:use|using)\s+(\w+-\w+)(?:\s+agent)?/i,
    // English pattern: "as ~"
    /as\s+(\w+-\w+)/i,
    // Direct pattern: "~ agent로"
    /(\w+-\w+)\s+agent(?:로|으로)/i,
  ];

  /** Context patterns for suggesting agents based on file paths */
  private static readonly CONTEXT_PATTERNS: Array<{
    pattern: RegExp;
    agent: string;
    confidence: number;
  }> = [
    {
      pattern: /Dockerfile|docker-compose/i,
      agent: 'devops-engineer',
      confidence: 0.9,
    },
    { pattern: /\.go$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.py$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.java$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.rs$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.tsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
    { pattern: /\.jsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
    { pattern: /agents?.*\.json$/i, agent: 'agent-architect', confidence: 0.8 },
  ];

  constructor(
    private readonly getProjectConfig: GetProjectConfigFn,
    private readonly listPrimaryAgents: ListPrimaryAgentsFn,
  ) {}

  /**
   * Resolve which Primary Agent to use.
   * Priority: explicit > config > context > default
   *
   * Note: EVAL mode always returns code-reviewer regardless of other settings.
   */
  async resolve(
    mode: Mode,
    prompt: string,
    context?: ResolutionContext,
  ): Promise<PrimaryAgentResolutionResult> {
    // EVAL mode is special - always use code-reviewer
    if (mode === 'EVAL') {
      return this.createResult(
        PrimaryAgentResolver.EVAL_AGENT,
        'default',
        1.0,
        'EVAL mode always uses code-reviewer',
      );
    }

    const availableAgents = await this.safeListPrimaryAgents();

    // 1. Check explicit request in prompt
    const explicit = this.parseExplicitRequest(prompt, availableAgents);
    if (explicit) {
      return explicit;
    }

    // 2. Check project configuration
    const fromConfig = await this.getFromProjectConfig(availableAgents);
    if (fromConfig) {
      return fromConfig;
    }

    // 3. Check context-based suggestion
    if (context) {
      const fromContext = this.inferFromContext(context, availableAgents);
      if (fromContext && fromContext.confidence >= 0.8) {
        return fromContext;
      }
    }

    // 4. Default fallback
    return this.createResult(
      PrimaryAgentResolver.DEFAULT_AGENT,
      'default',
      1.0,
      'No explicit preference, using default frontend-developer',
    );
  }

  /**
   * Parse explicit agent request from prompt.
   * Returns null if no explicit request found or agent not in registry.
   */
  private parseExplicitRequest(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    for (const pattern of PrimaryAgentResolver.EXPLICIT_PATTERNS) {
      const match = prompt.match(pattern);
      if (match?.[1]) {
        const agentName = match[1].toLowerCase();
        if (availableAgents.includes(agentName)) {
          return this.createResult(
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
   * Get Primary Agent from project configuration.
   * Returns null if no config or configured agent not in registry.
   */
  private async getFromProjectConfig(
    availableAgents: string[],
  ): Promise<PrimaryAgentResolutionResult | null> {
    try {
      const config = await this.getProjectConfig();
      if (config?.primaryAgent) {
        const agentName = config.primaryAgent.toLowerCase();
        if (availableAgents.includes(agentName)) {
          return this.createResult(
            agentName,
            'config',
            1.0,
            `Configured in project: ${agentName}`,
          );
        }
        // Agent configured but not available
        this.logger.warn(
          `Configured agent '${config.primaryAgent}' not found in registry. ` +
            `Available: ${availableAgents.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load project config for agent resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
    return null;
  }

  /**
   * Infer Primary Agent from context (file path, project type).
   * Returns result with confidence score.
   */
  private inferFromContext(
    context: ResolutionContext,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    if (context.filePath) {
      for (const {
        pattern,
        agent,
        confidence,
      } of PrimaryAgentResolver.CONTEXT_PATTERNS) {
        if (pattern.test(context.filePath)) {
          if (availableAgents.includes(agent)) {
            return this.createResult(
              agent,
              'context',
              confidence,
              `Inferred from file path: ${context.filePath}`,
            );
          }
        }
      }
    }

    // Additional inference from projectType if provided
    if (context.projectType === 'infrastructure') {
      if (availableAgents.includes('devops-engineer')) {
        return this.createResult(
          'devops-engineer',
          'context',
          0.85,
          `Inferred from project type: ${context.projectType}`,
        );
      }
    }

    return null;
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
        return ['frontend-developer', 'backend-developer', 'code-reviewer'];
      }
      return agents;
    } catch (error) {
      this.logger.warn(
        `Failed to list primary agents: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Using fallback list.`,
      );
      return ['frontend-developer', 'backend-developer', 'code-reviewer'];
    }
  }

  /**
   * Create a resolution result object.
   */
  private createResult(
    agentName: string,
    source: PrimaryAgentSource,
    confidence: number,
    reason: string,
  ): PrimaryAgentResolutionResult {
    return { agentName, source, confidence, reason };
  }
}
