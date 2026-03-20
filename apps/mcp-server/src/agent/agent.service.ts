import { Injectable, Logger } from '@nestjs/common';
import { RulesService } from '../rules/rules.service';
import type { Mode } from '../keyword/keyword.types';
import type {
  AgentContext,
  AgentSystemPrompt,
  ParallelAgentSet,
  PreparedAgent,
  FailedAgent,
  DispatchAgentsInput,
  DispatchResult,
  DispatchedAgent,
  ExecutionStrategy,
  TaskMaestroAssignment,
} from './agent.types';
import { FILE_PATTERN_SPECIALISTS } from './agent.types';
import {
  buildAgentSystemPrompt,
  buildTaskDescription,
  buildParallelExecutionHint,
} from './agent-prompt.builder';
import { createAgentSummary } from './agent-summary.utils';
import type { VerbosityLevel } from '../shared/verbosity.types';
import { getVerbosityConfig } from '../shared/verbosity.types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly rulesService: RulesService) {}

  /**
   * Get complete system prompt for a single agent to be executed as subagent
   */
  async getAgentSystemPrompt(agentName: string, context: AgentContext): Promise<AgentSystemPrompt> {
    const agentProfile = await this.rulesService.getAgent(agentName);

    const systemPrompt = buildAgentSystemPrompt(agentProfile, context);
    const description = buildTaskDescription(agentProfile, context);

    return {
      agentName,
      displayName: agentProfile.name,
      systemPrompt,
      description,
    };
  }

  /**
   * Prepare multiple agents for parallel execution via Claude Code Task tool
   *
   * @param mode - Current workflow mode
   * @param specialists - List of specialist agent names
   * @param targetFiles - Files to analyze or review
   * @param sharedContext - Shared context or task description for all agents
   * @param verbosity - Response detail level: minimal (name only), standard (summary, default), full (complete prompt)
   */
  async prepareParallelAgents(
    mode: Mode,
    specialists: string[],
    targetFiles?: string[],
    sharedContext?: string,
    verbosity?: VerbosityLevel,
  ): Promise<ParallelAgentSet> {
    const uniqueSpecialists = Array.from(new Set(specialists));
    const context: AgentContext = {
      mode,
      targetFiles,
      taskDescription: sharedContext,
    };

    const verbosityConfig = getVerbosityConfig(verbosity || 'standard');

    const { agents, failedAgents } = await this.loadAgents(
      uniqueSpecialists,
      context,
      verbosityConfig.includeAgentPrompt,
    );

    return this.buildParallelAgentSet(agents, failedAgents);
  }

  private async loadAgents(
    specialists: string[],
    context: AgentContext,
    includeFullPrompt: boolean,
  ): Promise<{ agents: PreparedAgent[]; failedAgents: FailedAgent[] }> {
    const results = await Promise.all(
      specialists.map(name => this.tryLoadAgent(name, context, includeFullPrompt)),
    );

    const agents: PreparedAgent[] = [];
    const failedAgents: FailedAgent[] = [];

    for (const result of results) {
      if (result.success) {
        agents.push(result.agent);
      } else {
        // TypeScript narrowing: result is now { success: false; error: FailedAgent }
        const errorResult = result as { success: false; error: FailedAgent };
        failedAgents.push(errorResult.error);
      }
    }

    return { agents, failedAgents };
  }

  /**
   * Try to load a single agent with verbosity control
   *
   * @param specialistName - Agent identifier
   * @param context - Agent context for prompt generation
   * @param includeFullPrompt - Whether to include full taskPrompt (true) or summary only (false)
   */
  private async tryLoadAgent(
    specialistName: string,
    context: AgentContext,
    includeFullPrompt: boolean,
  ): Promise<{ success: true; agent: PreparedAgent } | { success: false; error: FailedAgent }> {
    try {
      const profile = await this.rulesService.getAgent(specialistName);
      const agent: PreparedAgent = {
        id: specialistName,
        displayName: profile.name,
        description: buildTaskDescription(profile, context),
      };

      if (includeFullPrompt) {
        // Full verbosity: include complete taskPrompt
        agent.taskPrompt = buildAgentSystemPrompt(profile, context);
      } else {
        // Minimal/Standard verbosity: include summary only
        const summary = createAgentSummary({
          name: specialistName,
          displayName: profile.name,
          expertise: profile.role?.expertise,
          systemPrompt: profile.description,
        });
        agent.summary = {
          expertise: summary.expertise,
          primaryFocus: summary.primaryFocus,
          fullPromptAvailable: summary.fullPromptAvailable,
        };
      }

      return { success: true, agent };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to load agent '${specialistName}': ${reason}`);
      return { success: false, error: { id: specialistName, reason } };
    }
  }

  private buildParallelAgentSet(
    agents: PreparedAgent[],
    failedAgents: FailedAgent[],
  ): ParallelAgentSet {
    const result: ParallelAgentSet = {
      agents,
      parallelExecutionHint: buildParallelExecutionHint(),
    };

    if (failedAgents.length > 0) {
      result.failedAgents = failedAgents;
    }

    return result;
  }

  /**
   * Get recommended agents based on mode and file patterns.
   * @param modeDefaults - Mode-specific defaults from config
   * @param files - Files to analyze for pattern matching
   */
  getRecommendedAgents(modeDefaults: string[], files: string[]): string[] {
    const recommended = new Set<string>(modeDefaults);
    files.forEach(file => this.addFilePatternAgents(file.toLowerCase(), recommended));
    return Array.from(recommended);
  }

  private addFilePatternAgents(fileLower: string, recommended: Set<string>): void {
    for (const [pattern, agents] of Object.entries(FILE_PATTERN_SPECIALISTS)) {
      if (fileLower.includes(pattern)) {
        agents.forEach(agent => recommended.add(agent));
      }
    }
  }

  /**
   * Dispatch agents with Task-tool-ready parameters.
   *
   * Returns structured dispatch data that can be directly used with
   * Claude Code's Task tool, eliminating the need for manual prompt assembly.
   */
  async dispatchAgents(input: DispatchAgentsInput): Promise<DispatchResult> {
    const strategy: ExecutionStrategy = input.executionStrategy || 'subagent';
    const context: AgentContext = {
      mode: input.mode,
      targetFiles: input.targetFiles,
      taskDescription: input.taskDescription,
    };

    const result: DispatchResult = {
      executionStrategy: strategy,
      executionHint: buildParallelExecutionHint(),
    };

    // Dispatch primary agent (subagent strategy only)
    if (strategy === 'subagent' && input.primaryAgent) {
      try {
        const agentPrompt = await this.getAgentSystemPrompt(input.primaryAgent, context);
        result.primaryAgent = {
          name: input.primaryAgent,
          displayName: agentPrompt.displayName,
          description: agentPrompt.description,
          dispatchParams: {
            subagent_type: 'general-purpose',
            prompt: agentPrompt.systemPrompt,
            description: agentPrompt.description,
          },
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to dispatch primary agent '${input.primaryAgent}': ${reason}`);
        result.failedAgents = [...(result.failedAgents || []), { id: input.primaryAgent, reason }];
      }
    }

    if (strategy === 'taskmaestro' && input.specialists?.length) {
      // TaskMaestro strategy: return tmux assignments
      const uniqueSpecialists = Array.from(new Set(input.specialists));
      const { agents, failedAgents } = await this.loadAgents(uniqueSpecialists, context, true);

      const assignments: TaskMaestroAssignment[] = agents.map(agent => ({
        name: agent.id,
        displayName: agent.displayName,
        prompt: this.buildTaskMaestroPrompt(
          agent.taskPrompt || `Perform ${agent.displayName} analysis in ${input.mode} mode`,
        ),
      }));

      const sessionName = `${input.mode.toLowerCase()}-specialists`;
      result.taskmaestro = {
        sessionName,
        paneCount: assignments.length,
        assignments,
      };
      result.executionHint = this.buildTaskMaestroHint(sessionName, assignments.length);

      if (failedAgents.length > 0) {
        result.failedAgents = failedAgents;
      }
    } else if (strategy === 'subagent' && input.includeParallel && input.specialists?.length) {
      // SubAgent strategy: existing behavior
      const uniqueSpecialists = Array.from(new Set(input.specialists));
      const { agents, failedAgents } = await this.loadAgents(uniqueSpecialists, context, true);

      result.parallelAgents = agents.map(
        (agent): DispatchedAgent => ({
          name: agent.id,
          displayName: agent.displayName,
          description: agent.description,
          dispatchParams: {
            subagent_type: 'general-purpose',
            prompt:
              agent.taskPrompt || `Perform ${agent.displayName} analysis in ${input.mode} mode`,
            description: agent.description,
            run_in_background: true,
          },
        }),
      );

      if (failedAgents.length > 0) {
        result.failedAgents = failedAgents;
      }
    }

    return result;
  }

  private buildTaskMaestroPrompt(basePrompt: string): string {
    return `${basePrompt}\n\n## Output Format\n\nFor each finding, include:\n- Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO\n- File reference\n- Recommendation`;
  }

  private buildTaskMaestroHint(sessionName: string, paneCount: number): string {
    return [
      `1. /taskmaestro start --panes ${paneCount}`,
      `2. /taskmaestro assign --session ${sessionName}`,
      `3. /taskmaestro status`,
      `4. /taskmaestro stop all`,
    ].join('\n');
  }
}
