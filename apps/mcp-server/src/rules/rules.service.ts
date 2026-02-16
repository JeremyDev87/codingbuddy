import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { AgentProfile, SearchResult } from './rules.types';
import type { Skill } from './skill.schema';
import { CustomService } from '../custom';
import { ConfigService } from '../config/config.service';
import { MODE_AGENTS } from '../keyword/keyword.types';
import {
  resolveRulesDir,
  readRuleContent,
  listAgentNames,
  loadAgentProfile,
  searchInRuleFiles,
  listSkillSummaries,
  loadSkill,
} from '../shared/rules-core';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private readonly rulesDir: string;

  constructor(
    private readonly customService: CustomService,
    private readonly configService: ConfigService,
  ) {
    // Path resolution strategy:
    // 1. Use environment variable if directly specified
    // 2. Get path from codingbuddy-rules package
    // 3. Development fallback: when require.resolve fails

    if (process.env.CODINGBUDDY_RULES_DIR) {
      this.rulesDir = resolveRulesDir(__dirname, {
        envRulesDir: process.env.CODINGBUDDY_RULES_DIR,
      });
      this.logger.log(`Rules directory set from env: ${this.rulesDir}`);
      return;
    }

    try {
      // Get rulesPath from codingbuddy-rules package
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { rulesPath } = require('codingbuddy-rules');
      this.rulesDir = resolveRulesDir(__dirname, {
        packageRulesPath: rulesPath,
      });
      this.logger.log(`Rules directory set from package: ${this.rulesDir}`);
    } catch {
      // Development fallback: when package is not found
      this.logger.warn(
        'codingbuddy-rules package not found, using development fallback',
      );
      this.rulesDir = resolveRulesDir(__dirname, {
        existsSync: (pathStr: string) => {
          try {
            return existsSync(pathStr);
          } catch {
            return false;
          }
        },
      });
      this.logger.log(`Rules directory set to: ${this.rulesDir}`);
    }
  }

  async getRuleContent(relativePath: string): Promise<string> {
    try {
      return await readRuleContent(this.rulesDir, relativePath);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Access denied')) {
        this.logger.warn(`Path traversal attempt blocked: ${relativePath}`);
      } else {
        this.logger.error(`Failed to read rule file: ${relativePath}`, error);
      }
      throw error;
    }
  }

  async listAgents(): Promise<string[]> {
    try {
      const agents = await listAgentNames(this.rulesDir);
      return this.sortAgentsByPriority(agents);
    } catch (error) {
      this.logger.error('Failed to list agents', error);
      return [];
    }
  }

  private sortAgentsByPriority(agents: string[]): string[] {
    const modeAgentSet = new Set<string>(MODE_AGENTS);

    const foundModeAgents = agents.filter(agent => modeAgentSet.has(agent));
    const otherAgents = agents.filter(agent => !modeAgentSet.has(agent));

    const sortedModeAgents = MODE_AGENTS.filter(agent =>
      foundModeAgents.includes(agent),
    );

    return [...sortedModeAgents, ...otherAgents.sort()];
  }

  isModeAgent(agentName: string): boolean {
    return (MODE_AGENTS as readonly string[]).includes(agentName);
  }

  async getAgent(name: string): Promise<AgentProfile> {
    try {
      const profile = await loadAgentProfile(this.rulesDir, name);
      // Add source field for default agents
      const agent: AgentProfile = {
        ...profile,
        source: 'default',
      };

      // Override communication.language with config language if available
      try {
        const configLanguage = await this.configService.getLanguage();
        if (configLanguage) {
          agent.communication = {
            ...agent.communication,
            language: configLanguage,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get config language for agent '${name}', using agent default: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      return agent;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('Invalid agent profile')
      ) {
        this.logger.warn(`Invalid agent profile: ${name}`, error.message);
      }
      throw error;
    }
  }

  async searchRules(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Get custom rules first (they appear first in results)
    const projectRoot = this.configService.getProjectRoot();
    const customRules = await this.customService.listCustomRules(projectRoot);

    for (const customRule of customRules) {
      const lines = customRule.content.split('\n');
      const matches: string[] = [];
      let score = 0;

      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(queryLower)) {
          matches.push(`Line ${index + 1}: ${line.trim()}`);
          score++;
        }
      });

      if (score > 0) {
        results.push({
          file: customRule.name,
          matches,
          score,
          source: 'custom',
        });
      }
    }

    // Then search default rules
    const agents = await this.listAgents();
    const filesToSearch = [
      'rules/core.md',
      'rules/project.md',
      'rules/augmented-coding.md',
      ...agents.map(a => `agents/${a}.json`),
    ];

    const defaultResults = await searchInRuleFiles(
      this.rulesDir,
      query,
      filesToSearch,
    );

    // Add source: 'default' to results from searchInRuleFiles
    for (const result of defaultResults) {
      results.push({ ...result, source: 'default' });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // ============================================================================
  // Skill Operations
  // ============================================================================

  /**
   * List all available skills from the skills directory
   * @returns Array of skill summaries with name and description
   */
  async listSkillsFromDir(): Promise<
    Array<{ name: string; description: string }>
  > {
    try {
      return await listSkillSummaries(this.rulesDir);
    } catch (error) {
      this.logger.warn(
        `Failed to list skills: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  /**
   * Get a skill by name
   * @param name - Skill name (must be lowercase alphanumeric with hyphens)
   * @returns Parsed skill object
   * @throws Error if skill not found or invalid
   */
  async getSkill(name: string): Promise<Skill> {
    try {
      return await loadSkill(this.rulesDir, name);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.startsWith('Access denied')) {
          this.logger.warn(`Path traversal attempt blocked for skill: ${name}`);
        } else if (error.message.startsWith('Invalid skill:')) {
          this.logger.warn(`Invalid skill '${name}': ${error.message}`);
        }
      }
      throw error;
    }
  }
}
