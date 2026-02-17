import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CUSTOM_DIR,
  CUSTOM_SUBDIRS,
  CustomRule,
  CustomAgent,
  CustomAgentSchema,
  CustomSkill,
} from './custom.types';

@Injectable()
export class CustomService {
  private readonly logger = new Logger(CustomService.name);

  async findCustomPath(projectRoot: string): Promise<string | null> {
    const customPath = path.join(projectRoot, CUSTOM_DIR);
    try {
      await fs.access(customPath);
      this.logger.debug(`Found custom rules at: ${customPath}`);
      return customPath;
    } catch {
      return null;
    }
  }

  async listCustomRules(projectRoot: string): Promise<CustomRule[]> {
    const customPath = await this.findCustomPath(projectRoot);
    if (!customPath) return [];

    const rulesPath = path.join(customPath, CUSTOM_SUBDIRS.rules);
    try {
      await fs.access(rulesPath);
    } catch {
      return [];
    }

    const entries = await fs.readdir(rulesPath, { withFileTypes: true });
    const rules: CustomRule[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(rulesPath, entry.name);
        const content = await fs.readFile(filePath, 'utf-8');
        rules.push({
          type: 'rule',
          name: entry.name,
          path: filePath,
          content,
          source: 'custom',
        });
      }
    }

    return rules;
  }

  async listCustomAgents(projectRoot: string): Promise<CustomAgent[]> {
    const customPath = await this.findCustomPath(projectRoot);
    if (!customPath) return [];

    const agentsPath = path.join(customPath, CUSTOM_SUBDIRS.agents);
    try {
      await fs.access(agentsPath);
    } catch {
      return [];
    }

    const entries = await fs.readdir(agentsPath, { withFileTypes: true });
    const agents: CustomAgent[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const filePath = path.join(agentsPath, entry.name);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const parsed = JSON.parse(content) as CustomAgentSchema;

          // Validate required fields (compatible with AgentProfile)
          if (!parsed.name || !parsed.description || !parsed.role) {
            this.logger.warn(`Invalid agent file (missing required fields): ${filePath}`);
            continue;
          }

          agents.push({
            type: 'agent',
            name: entry.name,
            path: filePath,
            content,
            source: 'custom',
            parsed,
          });
        } catch {
          this.logger.warn(`Invalid JSON in agent file: ${filePath}`);
          // Skip invalid JSON
        }
      }
    }

    return agents;
  }

  async listCustomSkills(projectRoot: string): Promise<CustomSkill[]> {
    const customPath = await this.findCustomPath(projectRoot);
    if (!customPath) return [];

    const skillsPath = path.join(customPath, CUSTOM_SUBDIRS.skills);
    try {
      await fs.access(skillsPath);
    } catch {
      return [];
    }

    const entries = await fs.readdir(skillsPath, { withFileTypes: true });
    const skills: CustomSkill[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFile = path.join(skillsPath, entry.name, 'SKILL.md');
        try {
          const content = await fs.readFile(skillFile, 'utf-8');
          skills.push({
            type: 'skill',
            name: entry.name,
            path: skillFile,
            content,
            source: 'custom',
          });
        } catch {
          // Skip folders without SKILL.md
        }
      }
    }

    return skills;
  }
}
