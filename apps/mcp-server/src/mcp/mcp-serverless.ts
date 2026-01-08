import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import type { AgentProfile, SearchResult } from '../rules/rules.types';
import type {
  Mode,
  RuleContent,
  ParseModeResult,
  KeywordModesConfig,
} from '../keyword/keyword.types';
import { KEYWORDS } from '../keyword/keyword.types';
import { loadConfig } from '../config/config.loader';
import type { CodingBuddyConfig } from '../config/config.schema';
import { isPathSafe } from '../shared/security.utils';
import { getPackageVersion } from '../shared/version.utils';
import { parseAgentProfile, AgentSchemaError } from '../rules/agent.schema';
import { parseSkill, SkillSchemaError } from '../rules/skill.schema';
import type { Skill } from '../rules/skill.schema';
import {
  validateQuery,
  validatePrompt,
  validateAgentName,
} from '../shared/validation.constants';
import { sanitizeError } from '../shared/error.utils';
import {
  createJsonResponse,
  createErrorResponse,
  type ToolResponse,
} from './response.utils';

// ============================================================================
// Types
// ============================================================================

interface ParseModeResponse extends ParseModeResult {
  language?: string;
}

interface SkillSummary {
  name: string;
  description: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_MODE_CONFIG: KeywordModesConfig = {
  modes: {
    PLAN: {
      description: 'Task planning and design phase',
      instructions:
        'Design first approach. Define test cases from TDD perspective. Review architecture before implementation.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
    },
    ACT: {
      description: 'Actual task execution phase',
      instructions:
        'Follow Red-Green-Refactor cycle. Implement minimally then improve incrementally. Verify quality standards.',
      rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
    },
    EVAL: {
      description: 'Result review and assessment phase',
      instructions:
        'Review code quality. Verify SOLID principles. Check test coverage. Suggest improvements.',
      rules: ['rules/core.md', 'rules/augmented-coding.md'],
    },
    AUTO: {
      description: 'Autonomous PLAN → ACT → EVAL cycle',
      instructions:
        'Execute autonomous iteration cycle. Run PLAN → ACT → EVAL until quality achieved or max iterations reached. Self-correct based on EVAL feedback.',
      rules: ['rules/core.md', 'rules/project.md', 'rules/augmented-coding.md'],
    },
  },
  defaultMode: 'PLAN',
};

// ============================================================================
// McpServerlessService
// ============================================================================

export class McpServerlessService {
  private server: McpServer;
  private rulesDir: string;
  private projectRoot: string;

  constructor(rulesDir?: string, projectRoot?: string) {
    this.rulesDir = rulesDir ?? this.findRulesDir();
    this.projectRoot = projectRoot ?? process.cwd();

    this.server = new McpServer({
      name: 'codingbuddy',
      version: getPackageVersion(),
    });

    this.registerTools();
    this.registerResources();
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  getServer(): McpServer {
    return this.server;
  }

  setRulesDir(rulesDir: string): void {
    this.rulesDir = rulesDir;
  }

  setProjectRoot(projectRoot: string): void {
    this.projectRoot = projectRoot;
  }

  // ============================================================================
  // Rules Directory Resolution
  // ============================================================================

  private findRulesDir(): string {
    // 1. Environment variable takes precedence
    if (process.env.CODINGBUDDY_RULES_DIR) {
      return process.env.CODINGBUDDY_RULES_DIR;
    }

    // 2. Try to find codingbuddy-rules package
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { rulesPath } = require('codingbuddy-rules');
      return rulesPath;
    } catch {
      // Package not found, use development fallback
    }

    // 3. Development fallback: search for .ai-rules directory
    const candidates = [
      path.resolve(__dirname, '../../../../packages/rules/.ai-rules'),
      path.resolve(__dirname, '../../../packages/rules/.ai-rules'),
      path.resolve(__dirname, '../../../../.ai-rules'),
      path.resolve(__dirname, '../../../.ai-rules'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    // Return first candidate as fallback
    return candidates[0];
  }

  // ============================================================================
  // Tool Registration
  // ============================================================================

  private registerTools(): void {
    // search_rules tool
    this.server.registerTool(
      'search_rules',
      {
        title: 'Search Rules',
        description: 'Search for rules and guidelines',
        inputSchema: {
          query: z.string().describe('Search query'),
        },
      },
      async ({ query }): Promise<ToolResponse> => {
        return this.handleSearchRules(query);
      },
    );

    // get_agent_details tool
    this.server.registerTool(
      'get_agent_details',
      {
        title: 'Get Agent Details',
        description: 'Get detailed profile of a specific AI agent',
        inputSchema: {
          agentName: z.string().describe('Name of the agent'),
        },
      },
      async ({ agentName }): Promise<ToolResponse> => {
        return this.handleGetAgentDetails(agentName);
      },
    );

    // parse_mode tool
    this.server.registerTool(
      'parse_mode',
      {
        title: 'Parse Mode',
        description:
          'Parse workflow mode keyword from prompt and return mode-specific rules with project language setting',
        inputSchema: {
          prompt: z
            .string()
            .describe('User prompt that may start with PLAN/ACT/EVAL keyword'),
        },
      },
      async ({ prompt }): Promise<ToolResponse> => {
        return this.handleParseMode(prompt);
      },
    );

    // get_project_config tool
    this.server.registerTool(
      'get_project_config',
      {
        title: 'Get Project Config',
        description:
          'Get project configuration including tech stack, architecture, conventions, and language settings',
        inputSchema: {},
      },
      async (): Promise<ToolResponse> => {
        return this.handleGetProjectConfig();
      },
    );

    // suggest_config_updates tool
    this.server.registerTool(
      'suggest_config_updates',
      {
        title: 'Suggest Config Updates',
        description:
          'Analyze the project and suggest config updates based on detected changes (new frameworks, dependencies, patterns)',
        inputSchema: {
          projectRoot: z
            .string()
            .optional()
            .describe(
              'Project root directory (defaults to current working directory)',
            ),
        },
      },
      async ({ projectRoot }): Promise<ToolResponse> => {
        return this.handleSuggestConfigUpdates(projectRoot);
      },
    );

    // list_skills tool
    this.server.registerTool(
      'list_skills',
      {
        title: 'List Skills',
        description: 'List all available skills with descriptions',
        inputSchema: {},
      },
      async (): Promise<ToolResponse> => {
        return this.handleListSkills();
      },
    );

    // get_skill tool
    this.server.registerTool(
      'get_skill',
      {
        title: 'Get Skill',
        description: 'Get skill content by name',
        inputSchema: {
          skillName: z.string().describe('Name of the skill'),
        },
      },
      async ({ skillName }): Promise<ToolResponse> => {
        return this.handleGetSkill(skillName);
      },
    );
  }

  private registerResources(): void {
    // Resources will be registered here in the future
    // For serverless, we focus on tools
  }

  // ============================================================================
  // Tool Handlers
  // ============================================================================

  private async handleSearchRules(query: string): Promise<ToolResponse> {
    // Validate input
    const validation = validateQuery(query);
    if (!validation.valid) {
      return createErrorResponse(validation.error ?? 'Invalid query');
    }

    try {
      const results = await this.searchRules(query);
      return createJsonResponse(results);
    } catch (error) {
      return createErrorResponse(
        `Failed to search rules: ${sanitizeError(error)}`,
      );
    }
  }

  private async handleGetAgentDetails(
    agentName: string,
  ): Promise<ToolResponse> {
    // Validate input
    const validation = validateAgentName(agentName);
    if (!validation.valid) {
      return createErrorResponse(validation.error ?? 'Invalid agent name');
    }

    try {
      const agent = await this.getAgent(agentName);
      return createJsonResponse(agent);
    } catch {
      return createErrorResponse(`Agent '${agentName}' not found.`);
    }
  }

  private async handleParseMode(prompt: string): Promise<ToolResponse> {
    // Validate input
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return createErrorResponse(validation.error ?? 'Invalid prompt');
    }

    try {
      const result = await this.parseMode(prompt);
      const settings = await this.loadProjectSettings();
      const response: ParseModeResponse = {
        ...result,
        language: settings.language,
      };
      return createJsonResponse(response);
    } catch (error) {
      return createErrorResponse(
        `Failed to parse mode: ${sanitizeError(error)}`,
      );
    }
  }

  private async handleGetProjectConfig(): Promise<ToolResponse> {
    try {
      const settings = await this.loadProjectSettings();
      return createJsonResponse(settings);
    } catch (error) {
      return createErrorResponse(
        `Failed to get project config: ${sanitizeError(error)}`,
      );
    }
  }

  private async handleListSkills(): Promise<ToolResponse> {
    try {
      const skills = await this.listSkills();
      return createJsonResponse(skills);
    } catch (error) {
      return createErrorResponse(
        `Failed to list skills: ${sanitizeError(error)}`,
      );
    }
  }

  private async handleGetSkill(skillName: string): Promise<ToolResponse> {
    // Validate skill name
    if (!skillName || !/^[a-z0-9-]+$/.test(skillName)) {
      return createErrorResponse('Invalid skill name format');
    }

    try {
      const skill = await this.getSkill(skillName);
      return createJsonResponse(skill);
    } catch {
      return createErrorResponse(`Skill '${skillName}' not found.`);
    }
  }

  private async handleSuggestConfigUpdates(
    projectRoot?: string,
  ): Promise<ToolResponse> {
    try {
      const root = projectRoot ?? this.projectRoot;

      // For serverless environment, we provide a simplified analysis
      // Full analyzer would require too many dependencies
      const packageJsonPath = path.join(root, 'package.json');
      const detectedStack: string[] = [];

      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8'),
        );
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // Detect common frameworks
        const frameworks: Record<string, string> = {
          react: 'React',
          vue: 'Vue',
          angular: 'Angular',
          next: 'Next.js',
          nuxt: 'Nuxt',
          express: 'Express',
          nestjs: 'NestJS',
          '@nestjs/core': 'NestJS',
          fastify: 'Fastify',
          typescript: 'TypeScript',
          tailwindcss: 'Tailwind CSS',
          jest: 'Jest',
          vitest: 'Vitest',
          prisma: 'Prisma',
          '@prisma/client': 'Prisma',
        };

        for (const [pkg, name] of Object.entries(frameworks)) {
          if (allDeps[pkg]) {
            detectedStack.push(name);
          }
        }
      }

      const currentConfig = await this.loadProjectSettings();
      const suggestions: string[] = [];

      // Check for missing tech stack
      if (
        !currentConfig.techStack ||
        Object.keys(currentConfig.techStack).length === 0
      ) {
        if (detectedStack.length > 0) {
          suggestions.push(
            `Add detected technologies to config: ${detectedStack.join(', ')}`,
          );
        }
      }

      // Check for missing language setting
      if (!currentConfig.language) {
        suggestions.push(
          'Consider adding a language setting (e.g., "ko" or "en")',
        );
      }

      return createJsonResponse({
        detectedStack,
        currentConfig,
        suggestions,
        needsUpdate: suggestions.length > 0,
      });
    } catch (error) {
      return createErrorResponse(
        `Failed to suggest config updates: ${sanitizeError(error)}`,
      );
    }
  }

  // ============================================================================
  // Rules Operations (extracted from RulesService)
  // ============================================================================

  private async getRuleContent(relativePath: string): Promise<string> {
    // Security: Validate path to prevent directory traversal
    if (!isPathSafe(this.rulesDir, relativePath)) {
      throw new Error(`Access denied: Invalid path`);
    }

    const fullPath = path.join(this.rulesDir, relativePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      throw new Error(`Failed to read rule file: ${relativePath}`);
    }
  }

  private async listAgents(): Promise<string[]> {
    const agentsDir = path.join(this.rulesDir, 'agents');
    try {
      const files = await fs.readdir(agentsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  private async getAgent(name: string): Promise<AgentProfile> {
    const content = await this.getRuleContent(`agents/${name}.json`);
    try {
      const parsed = JSON.parse(content);
      // Validate against schema and check for prototype pollution
      const validated = parseAgentProfile(parsed);
      return validated as unknown as AgentProfile;
    } catch (error) {
      if (error instanceof AgentSchemaError) {
        throw new Error(`Invalid agent profile: ${name}`);
      }
      throw error;
    }
  }

  private async searchRules(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

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
          results.push({ file, matches, score });
        }
      } catch {
        // Ignore errors for missing files
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // ============================================================================
  // Skills Operations
  // ============================================================================

  async listSkills(): Promise<SkillSummary[]> {
    const skillsDir = path.join(this.rulesDir, 'skills');
    const summaries: SkillSummary[] = [];

    try {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
          try {
            const content = await fs.readFile(skillPath, 'utf-8');
            const skill = parseSkill(content, `skills/${entry.name}/SKILL.md`);
            summaries.push({
              name: skill.name,
              description: skill.description,
            });
          } catch {
            // Skip invalid skills
          }
        }
      }
    } catch {
      // Skills directory doesn't exist
    }

    return summaries;
  }

  async getSkill(name: string): Promise<Skill> {
    // Validate name format
    if (!/^[a-z0-9-]+$/.test(name)) {
      throw new Error(`Invalid skill name format: ${name}`);
    }

    const skillPath = `skills/${name}/SKILL.md`;

    // Security check
    if (!isPathSafe(this.rulesDir, skillPath)) {
      throw new Error('Access denied: Invalid path');
    }

    const fullPath = path.join(this.rulesDir, skillPath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return parseSkill(content, skillPath);
    } catch (error) {
      if (error instanceof SkillSchemaError) {
        throw new Error(`Invalid skill: ${name}`);
      }
      throw new Error(`Skill not found: ${name}`);
    }
  }

  // ============================================================================
  // Keyword/Mode Operations (extracted from KeywordService)
  // ============================================================================

  private async parseMode(prompt: string): Promise<ParseModeResult> {
    const config = DEFAULT_MODE_CONFIG;
    const warnings: string[] = [];

    const trimmed = prompt.trim();
    const parts = trimmed.split(/\s+/);
    const firstWord = parts[0]?.toUpperCase() ?? '';

    let mode: Mode;
    let originalPrompt: string;

    const isKeyword = KEYWORDS.includes(firstWord as Mode);

    if (isKeyword) {
      mode = firstWord as Mode;
      originalPrompt = trimmed.slice(parts[0].length).trim();

      // Check for multiple keywords
      if (parts.length > 1) {
        const secondWord = parts[1].toUpperCase();
        if (KEYWORDS.includes(secondWord as Mode)) {
          warnings.push('Multiple keywords found, using first');
        }
      }

      // Check for empty content after keyword
      if (originalPrompt === '') {
        warnings.push('No prompt content after keyword');
      }
    } else {
      mode = config.defaultMode;
      originalPrompt = trimmed;
      warnings.push('No keyword found, defaulting to PLAN');
    }

    const modeConfig = config.modes[mode];
    const rules = await this.getRulesForMode(mode, config);

    return {
      mode,
      originalPrompt,
      instructions: modeConfig.instructions,
      rules,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  private async getRulesForMode(
    mode: Mode,
    config: KeywordModesConfig,
  ): Promise<RuleContent[]> {
    const modeConfig = config.modes[mode];
    const rules: RuleContent[] = [];

    for (const rulePath of modeConfig.rules) {
      try {
        const content = await this.getRuleContent(rulePath);
        rules.push({ name: rulePath, content });
      } catch {
        // Skip missing files
      }
    }

    return rules;
  }

  // ============================================================================
  // Config Operations (extracted from ConfigService)
  // ============================================================================

  private async loadProjectSettings(): Promise<CodingBuddyConfig> {
    try {
      const result = await loadConfig(this.projectRoot);
      return result.config;
    } catch {
      return {};
    }
  }
}
