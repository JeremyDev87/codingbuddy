import { Injectable, Logger } from '@nestjs/common';
import { RulesService } from '../rules/rules.service';
import type { Mode } from '../keyword/keyword.types';
import type {
  AgentContext,
  AgentSystemPrompt,
  ParallelAgentSet,
  PreparedAgent,
  FailedAgent,
} from './agent.types';
import { FILE_PATTERN_SPECIALISTS } from './agent.types';
import {
  buildAgentSystemPrompt,
  buildTaskDescription,
  buildParallelExecutionHint,
} from './agent-prompt.builder';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly rulesService: RulesService) {}

  /**
   * Get complete system prompt for a single agent to be executed as subagent
   */
  async getAgentSystemPrompt(
    agentName: string,
    context: AgentContext,
  ): Promise<AgentSystemPrompt> {
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
   */
  async prepareParallelAgents(
    mode: Mode,
    specialists: string[],
    targetFiles?: string[],
    sharedContext?: string,
  ): Promise<ParallelAgentSet> {
    const uniqueSpecialists = [...new Set(specialists)];
    const context: AgentContext = {
      mode,
      targetFiles,
      taskDescription: sharedContext,
    };

    const { agents, failedAgents } = await this.loadAgents(
      uniqueSpecialists,
      context,
    );

    return this.buildParallelAgentSet(agents, failedAgents);
  }

  private async loadAgents(
    specialists: string[],
    context: AgentContext,
  ): Promise<{ agents: PreparedAgent[]; failedAgents: FailedAgent[] }> {
    const results = await Promise.all(
      specialists.map(name => this.tryLoadAgent(name, context)),
    );

    const agents: PreparedAgent[] = [];
    const failedAgents: FailedAgent[] = [];

    for (const result of results) {
      if (result.success) {
        agents.push(result.agent);
      } else {
        failedAgents.push(result.error);
      }
    }

    return { agents, failedAgents };
  }

  private async tryLoadAgent(
    specialistName: string,
    context: AgentContext,
  ): Promise<
    | { success: true; agent: PreparedAgent }
    | { success: false; error: FailedAgent }
  > {
    try {
      const profile = await this.rulesService.getAgent(specialistName);
      const agent: PreparedAgent = {
        id: specialistName,
        displayName: profile.name,
        taskPrompt: buildAgentSystemPrompt(profile, context),
        description: buildTaskDescription(profile, context),
      };
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
    files.forEach(file =>
      this.addFilePatternAgents(file.toLowerCase(), recommended),
    );
    return Array.from(recommended);
  }

  private addFilePatternAgents(
    fileLower: string,
    recommended: Set<string>,
  ): void {
    for (const [pattern, agents] of Object.entries(FILE_PATTERN_SPECIALISTS)) {
      if (fileLower.includes(pattern)) {
        agents.forEach(agent => recommended.add(agent));
      }
    }
  }
}
