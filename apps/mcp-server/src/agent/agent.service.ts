import { Injectable, Logger } from '@nestjs/common';
import { RulesService } from '../rules/rules.service';
import { CustomService } from '../custom';
import { ConfigService } from '../config/config.service';
import type { Mode } from '../keyword/keyword.types';
import type { AgentProfile } from '../rules/rules.types';
import type {
  AgentContext,
  AgentSystemPrompt,
  InlineAgentDefinition,
  ParallelAgentSet,
  PreparedAgent,
  FailedAgent,
  DispatchAgentsInput,
  DispatchResult,
  DispatchedAgent,
  TaskmaestroAssignment,
  TeamsTeammate,
  ExecutionPlan,
} from './agent.types';
import { FILE_PATTERN_SPECIALISTS } from './agent.types';
import {
  buildAgentSystemPrompt,
  buildTaskDescription,
  buildParallelExecutionHint,
} from './agent-prompt.builder';
import { createAgentSummary } from './agent-summary.utils';
import {
  buildSimplePlan,
  buildNestedPlan,
  subagentLayer,
  taskmaestroLayer,
  teamsLayer,
} from './execution-plan';
import type { VerbosityLevel } from '../shared/verbosity.types';
import { getVerbosityConfig } from '../shared/verbosity.types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly customService: CustomService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get complete system prompt for a single agent to be executed as subagent
   */
  async getAgentSystemPrompt(
    agentName: string,
    context: AgentContext,
    inlineAgents?: Record<string, InlineAgentDefinition>,
  ): Promise<AgentSystemPrompt> {
    const agentProfile = await this.resolveAgent(agentName, inlineAgents);

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
    inlineAgents?: Record<string, InlineAgentDefinition>,
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
      inlineAgents,
    );

    return this.buildParallelAgentSet(agents, failedAgents);
  }

  private async loadAgents(
    specialists: string[],
    context: AgentContext,
    includeFullPrompt: boolean,
    inlineAgents?: Record<string, InlineAgentDefinition>,
  ): Promise<{ agents: PreparedAgent[]; failedAgents: FailedAgent[] }> {
    const results = await Promise.all(
      specialists.map(name => this.tryLoadAgent(name, context, includeFullPrompt, inlineAgents)),
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
    inlineAgents?: Record<string, InlineAgentDefinition>,
  ): Promise<{ success: true; agent: PreparedAgent } | { success: false; error: FailedAgent }> {
    try {
      const profile = await this.resolveAgent(specialistName, inlineAgents);
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
   *
   * Supports composable execution strategies:
   * - `'subagent'` (default): parallel subagents via Claude Code Agent tool
   * - `'taskmaestro'`: tmux-based pane execution
   * - `'teams'`: Claude Code native Teams coordination
   * - `'taskmaestro+teams'`: TaskMaestro as outer transport, Teams as inner coordination
   */
  async dispatchAgents(input: DispatchAgentsInput): Promise<DispatchResult> {
    const context: AgentContext = {
      mode: input.mode,
      targetFiles: input.targetFiles,
      taskDescription: input.taskDescription,
    };

    const result: DispatchResult = {
      executionHint: buildParallelExecutionHint(),
    };

    // Dispatch primary agent
    if (input.primaryAgent) {
      try {
        const agentPrompt = await this.getAgentSystemPrompt(
          input.primaryAgent,
          context,
          input.inlineAgents,
        );
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

    // Dispatch taskmaestro+teams composable strategy
    if (input.executionStrategy === 'taskmaestro+teams' && input.specialists?.length) {
      return this.dispatchComposable(input, context, result);
    }

    // Dispatch taskmaestro strategy
    if (input.executionStrategy === 'taskmaestro' && input.specialists?.length) {
      return this.dispatchTaskmaestro(input, context, result);
    }

    // Dispatch teams strategy
    if (input.executionStrategy === 'teams' && input.specialists?.length) {
      return this.dispatchTeams(input, context, result);
    }

    // Dispatch parallel agents (subagent strategy)
    return this.dispatchSubagent(input, context, result);
  }

  private async dispatchTaskmaestro(
    input: DispatchAgentsInput,
    context: AgentContext,
    result: DispatchResult,
  ): Promise<DispatchResult> {
    const uniqueSpecialists = Array.from(new Set(input.specialists!));
    const { agents, failedAgents } = await this.loadAgents(
      uniqueSpecialists,
      context,
      true,
      input.inlineAgents,
    );

    const assignments: TaskmaestroAssignment[] = agents.map(agent => ({
      name: agent.id,
      displayName: agent.displayName,
      prompt: this.buildTaskmaestroPrompt(agent, input),
    }));

    const tmDispatch = {
      sessionName: `${(input.mode ?? 'eval').toLowerCase()}-specialists`,
      paneCount: assignments.length,
      assignments,
    };

    return {
      primaryAgent: result.primaryAgent,
      taskmaestro: tmDispatch,
      executionStrategy: 'taskmaestro',
      executionHint: this.buildTaskmaestroHint(assignments.length),
      executionPlan: buildSimplePlan(taskmaestroLayer(tmDispatch)),
      failedAgents: failedAgents.length > 0 ? failedAgents : result.failedAgents,
    };
  }

  private async dispatchTeams(
    input: DispatchAgentsInput,
    context: AgentContext,
    result: DispatchResult,
  ): Promise<DispatchResult> {
    const uniqueSpecialists = Array.from(new Set(input.specialists!));
    const teamName = `${(input.mode ?? 'eval').toLowerCase()}-specialists`;
    const { agents, failedAgents } = await this.loadAgents(
      uniqueSpecialists,
      context,
      true,
      input.inlineAgents,
    );

    const teammates: TeamsTeammate[] = agents.map(agent => ({
      name: agent.id,
      subagent_type: 'general-purpose' as const,
      team_name: teamName,
      prompt: agent.taskPrompt || `Perform ${agent.displayName} analysis in ${input.mode} mode`,
    }));

    const teamsConfig = {
      team_name: teamName,
      description: `${input.mode} mode specialist team`,
      teammates,
    };

    return {
      primaryAgent: result.primaryAgent,
      teams: teamsConfig,
      executionStrategy: 'teams',
      executionHint: this.buildTeamsHint(teamName, teammates.length),
      executionPlan: buildSimplePlan(teamsLayer(teamsConfig)),
      failedAgents: failedAgents.length > 0 ? failedAgents : result.failedAgents,
    };
  }

  private async dispatchSubagent(
    input: DispatchAgentsInput,
    context: AgentContext,
    result: DispatchResult,
  ): Promise<DispatchResult> {
    if (input.includeParallel && input.specialists?.length) {
      const uniqueSpecialists = Array.from(new Set(input.specialists));
      const { agents, failedAgents } = await this.loadAgents(
        uniqueSpecialists,
        context,
        true,
        input.inlineAgents,
      );

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

      result.executionPlan = buildSimplePlan(subagentLayer(result.parallelAgents));
    }

    result.executionStrategy = 'subagent';
    return result;
  }

  /**
   * Dispatch with composable taskmaestro+teams strategy.
   * TaskMaestro manages tmux panes (outer), Teams coordinates within panes (inner).
   */
  private async dispatchComposable(
    input: DispatchAgentsInput,
    context: AgentContext,
    result: DispatchResult,
  ): Promise<DispatchResult> {
    const uniqueSpecialists = Array.from(new Set(input.specialists!));
    const teamName = `${(input.mode ?? 'eval').toLowerCase()}-specialists`;
    const { agents, failedAgents } = await this.loadAgents(
      uniqueSpecialists,
      context,
      true,
      input.inlineAgents,
    );

    // Build TaskMaestro assignments (outer transport)
    const assignments: TaskmaestroAssignment[] = agents.map(agent => ({
      name: agent.id,
      displayName: agent.displayName,
      prompt: this.buildTaskmaestroPrompt(agent, input),
    }));

    const tmDispatch = {
      sessionName: teamName,
      paneCount: assignments.length,
      assignments,
    };

    // Build Teams config (inner coordination)
    const teammates: TeamsTeammate[] = agents.map(agent => ({
      name: agent.id,
      subagent_type: 'general-purpose' as const,
      team_name: teamName,
      prompt: agent.taskPrompt || `Perform ${agent.displayName} analysis in ${input.mode} mode`,
    }));

    const teamsConfig = {
      team_name: teamName,
      description: `${input.mode} mode specialist team (coordinated within TaskMaestro panes)`,
      teammates,
    };

    const executionPlan: ExecutionPlan = buildNestedPlan(
      taskmaestroLayer(tmDispatch),
      teamsLayer(teamsConfig),
    );

    return {
      primaryAgent: result.primaryAgent,
      taskmaestro: tmDispatch,
      teams: teamsConfig,
      executionStrategy: 'taskmaestro+teams',
      executionHint: this.buildComposableHint(teamName, assignments.length),
      executionPlan,
      failedAgents: failedAgents.length > 0 ? failedAgents : result.failedAgents,
    };
  }

  private buildTaskmaestroPrompt(agent: PreparedAgent, input: DispatchAgentsInput): string {
    const taskContext = input.taskDescription ? `\n\n**Task:** ${input.taskDescription}` : '';
    const fileContext = input.targetFiles?.length
      ? `\n\n**Target Files:**\n${input.targetFiles.map(f => '- ' + f).join('\n')}`
      : '';

    return `${agent.taskPrompt || agent.summary || ''}${taskContext}${fileContext}

**Output Format:**
- Severity: CRITICAL / HIGH / MEDIUM / LOW / INFO
- File reference
- Finding description
- Recommendation

When done, provide a summary of all findings.`;
  }

  private buildTaskmaestroHint(paneCount: number): string {
    return `TaskMaestro execution:
1. /taskmaestro start --panes ${paneCount}
2. Wait for all panes to show Claude Code prompt
3. For each assignment: /taskmaestro assign <pane_index> "<prompt>"
4. /taskmaestro status — monitor progress
5. When all panes show idle: collect results
6. /taskmaestro stop all — cleanup`;
  }

  private buildTeamsHint(teamName: string, teammateCount: number): string {
    return `Teams execution:
1. TeamCreate: { team_name: "${teamName}" }
2. Spawn ${teammateCount} teammate(s) via Agent tool with team_name: "${teamName}"
3. Create tasks via TaskCreate and assign with TaskUpdate
4. Monitor via TaskList — teammates coordinate via shared task list
5. Collect results when all teammates go idle
6. Shutdown teammates via SendMessage with shutdown_request`;
  }

  private buildComposableHint(teamName: string, paneCount: number): string {
    return `Composable execution (TaskMaestro + Teams):
Outer — TaskMaestro manages ${paneCount} tmux pane(s):
  1. /taskmaestro start --panes ${paneCount}
  2. Assign each pane its specialist prompt
Inner — Teams coordinates within panes:
  1. Each pane worker uses TeamCreate: { team_name: "${teamName}" }
  2. Workers share task list for coordination
  3. Monitor via TaskList and /taskmaestro status
Teardown:
  1. Shutdown teammates via SendMessage with shutdown_request
  2. /taskmaestro stop all`;
  }

  /**
   * Resolve an agent by name using the unified registry.
   * Resolution order: inline > custom local > primary (override chain).
   */
  async resolveAgent(
    agentName: string,
    inlineAgents?: Record<string, InlineAgentDefinition>,
  ): Promise<AgentProfile> {
    // 1. Highest priority: inline agent definitions
    if (inlineAgents?.[agentName]) {
      const inline = inlineAgents[agentName];
      this.logger.debug(`Resolved agent '${agentName}' from inline definition`);
      return {
        name: inline.name,
        description: inline.description,
        role: inline.role,
        communication: inline.communication,
        source: 'custom',
      };
    }

    // 2. Medium priority: custom local agents (.codingbuddy/agents/)
    try {
      const projectRoot = this.configService.getProjectRoot();
      const customAgents = await this.customService.listCustomAgents(projectRoot);
      const customAgent = customAgents.find(a => a.name === `${agentName}.json`);
      if (customAgent) {
        this.logger.debug(`Resolved agent '${agentName}' from custom local`);
        return {
          name: customAgent.parsed.name,
          description: customAgent.parsed.description,
          role: customAgent.parsed.role,
          source: 'custom',
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to check custom agents for '${agentName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // 3. Lowest priority: primary agents (packages/rules/.ai-rules/agents/)
    return this.rulesService.getAgent(agentName);
  }
}
