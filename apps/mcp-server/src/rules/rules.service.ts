import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { AgentProfile, SearchResult } from './rules.types';
import { isPathSafe } from '../shared/security.utils';
import { parseAgentProfile, AgentSchemaError } from './agent.schema';
import { CustomService } from '../custom';
import { MODE_AGENTS } from '../keyword/keyword.types';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private readonly rulesDir: string;

  constructor(private readonly customService: CustomService) {
    // Path resolution strategy:
    // 1. Use environment variable if directly specified
    // 2. Get path from codingbuddy-rules package
    // 3. Development fallback: when require.resolve fails

    if (process.env.CODINGBUDDY_RULES_DIR) {
      this.rulesDir = process.env.CODINGBUDDY_RULES_DIR;
      this.logger.log(`Rules directory set from env: ${this.rulesDir}`);
      return;
    }

    try {
      // Get rulesPath from codingbuddy-rules package
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { rulesPath } = require('codingbuddy-rules');
      this.rulesDir = rulesPath;
      this.logger.log(`Rules directory set from package: ${this.rulesDir}`);
    } catch {
      // Development fallback: when package is not found
      this.logger.warn(
        'codingbuddy-rules package not found, using development fallback',
      );
      this.rulesDir = this.findDevRulesDir();
      this.logger.log(`Rules directory set to: ${this.rulesDir}`);
    }
  }

  private findDevRulesDir(): string {
    // Find packages/rules/.ai-rules or root .ai-rules symlink in development
    // After build: dist/src/rules → 4 levels up is apps/mcp-server
    // Development: src/rules → 3 levels up is apps/mcp-server
    const candidates = [
      path.resolve(__dirname, '../../../../packages/rules/.ai-rules'), // after build
      path.resolve(__dirname, '../../../packages/rules/.ai-rules'), // development
      path.resolve(__dirname, '../../../../.ai-rules'), // symlink (after build)
      path.resolve(__dirname, '../../../.ai-rules'), // symlink (development)
    ];

    for (const candidate of candidates) {
      if (this.checkExists(candidate)) {
        return candidate;
      }
    }

    // Final fallback
    return candidates[0];
  }

  private checkExists(pathStr: string): boolean {
    try {
      return existsSync(pathStr);
    } catch {
      return false;
    }
  }
  async getRuleContent(relativePath: string): Promise<string> {
    // Security: Validate path to prevent directory traversal
    if (!isPathSafe(this.rulesDir, relativePath)) {
      this.logger.warn(`Path traversal attempt blocked: ${relativePath}`);
      throw new Error(`Access denied: Invalid path`);
    }

    const fullPath = path.join(this.rulesDir, relativePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to read rule file: ${relativePath}`, error);
      throw new Error(`Failed to read rule file: ${relativePath}`);
    }
  }

  async listAgents(): Promise<string[]> {
    const agentsDir = path.join(this.rulesDir, 'agents');
    try {
      const files = await fs.readdir(agentsDir);
      const agents = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));

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
    const content = await this.getRuleContent(`agents/${name}.json`);
    try {
      const parsed = JSON.parse(content);
      // Validate against schema and check for prototype pollution
      const validated = parseAgentProfile(parsed);
      // Add source field for default agents
      return { ...(validated as unknown as AgentProfile), source: 'default' };
    } catch (error) {
      if (error instanceof AgentSchemaError) {
        this.logger.warn(`Invalid agent profile: ${name}`, error.message);
        throw new Error(`Invalid agent profile: ${name}`);
      }
      throw error;
    }
  }

  async searchRules(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Get custom rules first (they appear first in results)
    const projectRoot = process.cwd();
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

    for (const file of filesToSearch) {
      try {
        const content = await this.getRuleContent(file);
        const lines = content.split('\n');
        const matches: string[] = [];
        let score = 0;

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(queryLower)) {
            matches.push(`Line ${index + 1}: ${line.trim()}`);
            score++;
          }
        });

        if (score > 0) {
          results.push({ file, matches, score, source: 'default' });
        }
      } catch {
        // Ignore errors
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
