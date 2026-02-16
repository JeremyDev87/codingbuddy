import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import type { SearchResult } from '../rules/rules.types';
import type { ParseModeResult } from '../keyword/keyword.types';
import { loadConfig } from '../config/config.loader';
import type { CodingBuddyConfig } from '../config/config.schema';
import { getPackageVersion } from '../shared/version.utils';
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
import {
  resolveRulesDir,
  readRuleContent,
  listAgentNames,
  loadAgentProfile,
  searchInRuleFiles,
  listSkillSummaries,
  loadSkill,
} from '../shared/rules-core';
import {
  extractModeFromPrompt,
  getDefaultModeConfig,
  loadRulesForMode,
} from '../shared/keyword-core';

// ============================================================================
// Types
// ============================================================================

interface ParseModeResponse extends ParseModeResult {
  language?: string;
}

// ============================================================================
// McpServerlessService
// ============================================================================

export class McpServerlessService {
  private server: McpServer;
  private rulesDir: string;
  private projectRoot: string;

  constructor(rulesDir?: string, projectRoot?: string) {
    this.rulesDir = rulesDir ?? this.resolveRulesDirectory();
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

  private resolveRulesDirectory(): string {
    let packageRulesPath: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { rulesPath } = require('codingbuddy-rules');
      packageRulesPath = rulesPath;
    } catch {
      /* not found */
    }

    return resolveRulesDir(__dirname, {
      envRulesDir: process.env.CODINGBUDDY_RULES_DIR,
      packageRulesPath,
      existsSync,
    });
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
      const agent = await loadAgentProfile(this.rulesDir, agentName);
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
      const skills = await listSkillSummaries(this.rulesDir);
      return createJsonResponse(skills);
    } catch (error) {
      return createErrorResponse(
        `Failed to list skills: ${sanitizeError(error)}`,
      );
    }
  }

  private async handleGetSkill(skillName: string): Promise<ToolResponse> {
    try {
      const skill = await loadSkill(this.rulesDir, skillName);
      return createJsonResponse(skill);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Skill '${skillName}' not found.`;
      return createErrorResponse(message);
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
  // Rules Operations (delegating to shared/rules-core)
  // ============================================================================

  private async searchRules(query: string): Promise<SearchResult[]> {
    const agents = await listAgentNames(this.rulesDir);
    const filesToSearch = [
      'rules/core.md',
      'rules/project.md',
      'rules/augmented-coding.md',
      ...agents.map(a => `agents/${a}.json`),
    ];

    return searchInRuleFiles(this.rulesDir, query, filesToSearch);
  }

  // ============================================================================
  // Keyword/Mode Operations (delegating to shared/keyword-core)
  // ============================================================================

  private async parseMode(prompt: string): Promise<ParseModeResult> {
    const config = getDefaultModeConfig();
    const { mode, originalPrompt, warnings } = extractModeFromPrompt(
      prompt,
      config.defaultMode,
    );

    const modeConfig = config.modes[mode];
    const rules = await loadRulesForMode(mode, config, (rulePath: string) =>
      readRuleContent(this.rulesDir, rulePath),
    );

    return {
      mode,
      originalPrompt,
      instructions: modeConfig.instructions,
      rules,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
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
