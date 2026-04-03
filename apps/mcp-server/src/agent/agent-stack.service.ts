import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RulesService } from '../rules/rules.service';
import { ConfigService } from '../config/config.service';
import type { AgentStack, AgentStackSummary } from './agent.types';

const AGENT_STACKS_DIR = 'agent-stacks';
const CUSTOM_STACKS_DIR = '.codingbuddy/agent-stacks';

@Injectable()
export class AgentStackService {
  private readonly logger = new Logger(AgentStackService.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List all available agent stacks, optionally filtered by category.
   * Custom stacks (.codingbuddy/agent-stacks/) override default stacks with the same name.
   */
  async listStacks(category?: string): Promise<AgentStackSummary[]> {
    const stackMap = new Map<string, AgentStack>();

    // Load default stacks first
    const defaultDir = path.join(this.rulesService.getRulesDir(), AGENT_STACKS_DIR);
    const defaultStacks = await this.loadStacksFromDir(defaultDir);
    for (const stack of defaultStacks) {
      stackMap.set(stack.name, stack);
    }

    // Load custom stacks (override defaults)
    const customDir = path.join(this.configService.getProjectRoot(), CUSTOM_STACKS_DIR);
    const customStacks = await this.loadStacksFromDir(customDir);
    for (const stack of customStacks) {
      stackMap.set(stack.name, stack);
    }

    let stacks = Array.from(stackMap.values());

    if (category) {
      stacks = stacks.filter(s => s.category === category);
    }

    return stacks.map(this.toSummary);
  }

  /**
   * Resolve a stack by name.
   * Resolution order: custom (.codingbuddy/agent-stacks/) > default (rules/agent-stacks/).
   */
  async resolveStack(stackName: string): Promise<AgentStack> {
    // Try custom first
    const customDir = path.join(this.configService.getProjectRoot(), CUSTOM_STACKS_DIR);
    const customStack = await this.loadStackFile(path.join(customDir, `${stackName}.json`));
    if (customStack) return customStack;

    // Fall back to default
    const defaultDir = path.join(this.rulesService.getRulesDir(), AGENT_STACKS_DIR);
    const defaultStack = await this.loadStackFile(path.join(defaultDir, `${stackName}.json`));
    if (defaultStack) return defaultStack;

    throw new Error(`Agent stack '${stackName}' not found`);
  }

  private async loadStacksFromDir(dirPath: string): Promise<AgentStack[]> {
    let entries: string[];
    try {
      entries = (await fs.readdir(dirPath)) as string[];
    } catch {
      return [];
    }

    const stacks: AgentStack[] = [];
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const stack = await this.loadStackFile(path.join(dirPath, entry));
      if (stack) stacks.push(stack);
    }
    return stacks;
  }

  private async loadStackFile(filePath: string): Promise<AgentStack | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as Record<string, unknown>;

      if (!this.isValidStack(parsed)) {
        this.logger.warn(`Invalid agent stack file (missing required fields): ${filePath}`);
        return null;
      }

      return parsed as unknown as AgentStack;
    } catch {
      return null;
    }
  }

  private isValidStack(obj: Record<string, unknown>): boolean {
    return (
      typeof obj.name === 'string' &&
      typeof obj.description === 'string' &&
      typeof obj.category === 'string' &&
      typeof obj.primary_agent === 'string' &&
      Array.isArray(obj.specialist_agents)
    );
  }

  private toSummary(stack: AgentStack): AgentStackSummary {
    return {
      name: stack.name,
      description: stack.description,
      category: stack.category,
      primary_agent: stack.primary_agent,
      specialist_count: stack.specialist_agents.length,
      tags: stack.tags,
    };
  }
}
