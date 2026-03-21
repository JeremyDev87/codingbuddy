/**
 * MCP Resource Implementation Example
 *
 * Demonstrates a complete Resource handler following the MCP specification.
 * Resources are read-only data exposed via URI that the AI can read.
 *
 * Key patterns:
 * - URI-based addressing with scheme://path convention
 * - Resource templates for dynamic URIs
 * - List + Read separation
 * - Proper MIME type handling
 */

import { Injectable } from '@nestjs/common';

// --- 1. Define Static Resources ---

export const staticResources = [
  {
    uri: 'config://project',
    name: 'Project Configuration',
    description: 'Current project settings including tech stack, conventions, and build config',
    mimeType: 'application/json',
  },
  {
    uri: 'docs://changelog',
    name: 'Changelog',
    description: 'Project changelog with recent changes and version history',
    mimeType: 'text/markdown',
  },
];

// --- 2. Define Resource Templates (Dynamic URIs) ---

export const resourceTemplates = [
  {
    uriTemplate: 'rules://{ruleName}',
    name: 'AI Rule',
    description: 'Retrieve a specific AI coding rule by name (e.g., "core", "project")',
    mimeType: 'text/markdown',
  },
  {
    uriTemplate: 'agents://{agentName}',
    name: 'Agent Definition',
    description: 'Retrieve a specialist agent definition by name (e.g., "solution-architect")',
    mimeType: 'application/json',
  },
  {
    uriTemplate: 'skills://{skillName}',
    name: 'Skill Content',
    description: 'Retrieve a skill definition by name (e.g., "mcp-builder", "api-design")',
    mimeType: 'text/markdown',
  },
];

// --- 3. Result Types ---

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

// --- 4. Implement the Resource Handler ---

@Injectable()
export class ResourceHandler {
  constructor(
    private readonly rulesService: RulesService,
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * List all available resources (static + dynamic discovered).
   * Called by MCP client via resources/list.
   */
  async listResources(): Promise<typeof staticResources> {
    // Static resources are always available
    const resources = [...staticResources];

    // Dynamically discover available rules
    const ruleNames = await this.rulesService.listRuleNames();
    for (const name of ruleNames) {
      resources.push({
        uri: `rules://${name}`,
        name: `Rule: ${name}`,
        description: `AI coding rule: ${name}`,
        mimeType: 'text/markdown',
      });
    }

    return resources;
  }

  /**
   * Read a specific resource by URI.
   * Called by MCP client via resources/read.
   */
  async readResource(uri: string): Promise<ResourceContent> {
    // Parse the URI scheme and path
    const match = uri.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
      throw new ResourceNotFoundError(`Invalid resource URI format: ${uri}`);
    }

    const [, scheme, path] = match;

    switch (scheme) {
      case 'config':
        return this.readConfig(uri, path);
      case 'docs':
        return this.readDocs(uri, path);
      case 'rules':
        return this.readRule(uri, path);
      case 'agents':
        return this.readAgent(uri, path);
      case 'skills':
        return this.readSkill(uri, path);
      default:
        throw new ResourceNotFoundError(`Unknown resource scheme: ${scheme}`);
    }
  }

  private async readConfig(uri: string, path: string): Promise<ResourceContent> {
    if (path !== 'project') {
      throw new ResourceNotFoundError(`Unknown config resource: ${path}`);
    }

    const config = await this.configService.getProjectConfig();
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(config, null, 2),
    };
  }

  private async readDocs(uri: string, path: string): Promise<ResourceContent> {
    if (path !== 'changelog') {
      throw new ResourceNotFoundError(`Unknown docs resource: ${path}`);
    }

    const changelog = await this.rulesService.readFile('CHANGELOG.md');
    return {
      uri,
      mimeType: 'text/markdown',
      text: changelog,
    };
  }

  private async readRule(uri: string, ruleName: string): Promise<ResourceContent> {
    const content = await this.rulesService.getRule(ruleName);
    if (!content) {
      throw new ResourceNotFoundError(`Rule not found: ${ruleName}`);
    }

    return {
      uri,
      mimeType: 'text/markdown',
      text: content,
    };
  }

  private async readAgent(uri: string, agentName: string): Promise<ResourceContent> {
    const agent = await this.agentsService.getAgent(agentName);
    if (!agent) {
      throw new ResourceNotFoundError(`Agent not found: ${agentName}`);
    }

    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(agent, null, 2),
    };
  }

  private async readSkill(uri: string, skillName: string): Promise<ResourceContent> {
    const content = await this.rulesService.getSkill(skillName);
    if (!content) {
      throw new ResourceNotFoundError(`Skill not found: ${skillName}`);
    }

    return {
      uri,
      mimeType: 'text/markdown',
      text: content,
    };
  }
}

// --- 5. Register in MCP Service ---

/*
// In mcp.service.ts:
import { staticResources, resourceTemplates, ResourceHandler } from './resources/resource-handler';

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: await this.resourceHandler.listResources(),
}));

server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
  resourceTemplates,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => ({
  contents: [await this.resourceHandler.readResource(request.params.uri)],
}));
*/

// --- Error Types ---

class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

// Placeholder interfaces for dependency injection
interface RulesService {
  listRuleNames(): Promise<string[]>;
  getRule(name: string): Promise<string | null>;
  getSkill(name: string): Promise<string | null>;
  readFile(path: string): Promise<string>;
}

interface AgentsService {
  getAgent(name: string): Promise<Record<string, unknown> | null>;
}

interface ConfigService {
  getProjectConfig(): Promise<Record<string, unknown>>;
}
