---
name: mcp-builder
description: Use when building or extending MCP (Model Context Protocol) servers. Covers NestJS-based server design, Tools/Resources/Prompts capability design, transport implementation (stdio/SSE), and testing strategies.
argument-hint: [capability-name]
---

# MCP Builder

## Overview

The Model Context Protocol (MCP) is the standard for connecting AI assistants to external tools, data, and prompts. Building a quality MCP server requires understanding the protocol's three capability types and implementing them with proper error handling and transport support.

**Core principle:** MCP servers are AI interfaces, not REST APIs. Design for machine consumption and LLM context efficiency.

**Iron Law:**
```
SCHEMA FIRST. Every Tool, Resource, and Prompt must have complete JSON Schema before implementation.
```

## When to Use

- Creating a new MCP server from scratch
- Adding new Tools, Resources, or Prompts to an existing server
- Implementing new transport modes (stdio ↔ SSE)
- Testing MCP server capabilities
- Debugging MCP communication issues

## MCP Architecture Overview

```
MCP Client (Claude, Cursor, etc.)
        ↕  stdio / SSE
MCP Server
  ├── Tools      → Functions the AI can call (side effects allowed)
  ├── Resources  → Data the AI can read (read-only, URI-addressed)
  └── Prompts    → Reusable prompt templates
```

## NestJS MCP Server Structure

```
apps/mcp-server/src/
├── main.ts              # Transport setup (stdio vs SSE)
├── app.module.ts        # Root module
├── mcp/
│   ├── mcp.module.ts    # MCP module
│   ├── mcp.service.ts   # MCP server registration
│   ├── tools/           # Tool handlers
│   ├── resources/       # Resource handlers
│   └── prompts/         # Prompt handlers
└── rules/
    ├── rules.module.ts
    └── rules.service.ts # Business logic (pure)
```

## Designing MCP Capabilities

### Tools (AI can call these)

Tools perform actions and return results. They CAN have side effects.

```typescript
// Tool Schema (define first)
const searchRulesTool = {
  name: 'search_rules',
  description: 'Search AI coding rules by keyword or topic. Returns matching rules with their content.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search term to find relevant rules',
        minLength: 1,
        maxLength: 200,
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 10)',
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
    required: ['query'],
  },
};
```

```typescript
// Tool Handler
@Injectable()
export class SearchRulesHandler {
  constructor(private readonly rulesService: RulesService) {}

  async handle(params: { query: string; limit?: number }): Promise<ToolResult> {
    // Validate input
    if (!params.query?.trim()) {
      return {
        content: [{ type: 'text', text: 'Error: query is required' }],
        isError: true,
      };
    }

    try {
      const results = await this.rulesService.search(params.query, {
        limit: params.limit ?? 10,
      });

      return {
        content: [
          {
            type: 'text',
            text: results.length === 0
              ? 'No rules found for: ' + params.query
              : results.map(r => `## ${r.name}\n${r.content}`).join('\n\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
}
```

### Resources (AI can read these)

Resources are read-only data exposed via URI. Use for static/cacheable content.

```typescript
// Resource definition
const ruleResource = {
  uri: 'rules://core',
  name: 'Core Rules',
  description: 'Core workflow rules (PLAN/ACT/EVAL modes)',
  mimeType: 'text/markdown',
};

// Resource handler
async readResource(uri: string): Promise<ResourceContent> {
  const ruleName = uri.replace('rules://', '');
  const content = await this.rulesService.getRule(ruleName);

  if (!content) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'text/markdown',
    text: content,
  };
}
```

**Resource URI design:**
```
rules://core           → Core rules file
rules://agents/list    → List of agents
agents://planner       → Specific agent definition
checklists://security  → Security checklist
```

### Prompts (Reusable templates)

```typescript
const activateAgentPrompt = {
  name: 'activate_agent',
  description: 'Generate activation prompt for a specialist agent',
  arguments: [
    {
      name: 'agentName',
      description: 'Name of the agent to activate (e.g., "solution-architect")',
      required: true,
    },
    {
      name: 'task',
      description: 'Task description for the agent',
      required: false,
    },
  ],
};

async getPrompt(name: string, args: Record<string, string>): Promise<PromptResult> {
  if (name === 'activate_agent') {
    const agent = await this.agentsService.getAgent(args.agentName);
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Activate the ${agent.displayName} specialist.\n\n${agent.systemPrompt}\n\n${args.task ?? ''}`,
          },
        },
      ],
    };
  }
  throw new Error(`Unknown prompt: ${name}`);
}
```

## Transport Implementation

### Stdio Transport (Default)

```typescript
// main.ts
async function bootstrap() {
  const transport = process.env.MCP_TRANSPORT ?? 'stdio';

  if (transport === 'stdio') {
    const app = await NestFactory.createApplicationContext(AppModule);
    const mcpService = app.get(McpService);
    await mcpService.startStdio();
  } else {
    const app = await NestFactory.create(AppModule);
    await app.listen(process.env.PORT ?? 3000);
  }
}
```

### SSE Transport (HTTP)

```typescript
// SSE endpoint with optional auth
@Get('/sse')
@UseGuards(SseAuthGuard)
async sse(@Req() req: Request, @Res() res: Response) {
  const transport = new SSEServerTransport('/messages', res);
  await this.mcpService.connect(transport);
}

@Post('/messages')
@UseGuards(SseAuthGuard)
async messages(@Req() req: Request, @Res() res: Response) {
  await this.mcpService.handleMessage(req, res);
}
```

```typescript
// Auth guard
@Injectable()
export class SseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const token = process.env.MCP_SSE_TOKEN;
    if (!token) return true; // Auth disabled if token not set

    const request = context.switchToHttp().getRequest();
    const provided = request.headers.authorization?.replace('Bearer ', '');
    return provided === token;
  }
}
```

## Testing Strategy

### Unit Tests (Tools/Resources)

```typescript
describe('SearchRulesHandler', () => {
  let handler: SearchRulesHandler;
  let rulesService: RulesService;

  beforeEach(() => {
    rulesService = new RulesService('./test-fixtures/.ai-rules');
    handler = new SearchRulesHandler(rulesService);
  });

  it('returns results for valid query', async () => {
    const result = await handler.handle({ query: 'TDD' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('TDD');
  });

  it('returns error for empty query', async () => {
    const result = await handler.handle({ query: '' });
    expect(result.isError).toBe(true);
  });
});
```

### Integration Tests (Protocol Level)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('MCP Server Integration', () => {
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/main.js'],
    });
    client = new Client({ name: 'test', version: '1.0.0' }, {});
    await client.connect(transport);
  });

  it('lists available tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toContain('search_rules');
  });

  it('calls search_rules tool', async () => {
    const result = await client.callTool({
      name: 'search_rules',
      arguments: { query: 'TDD' },
    });
    expect(result.isError).toBeFalsy();
  });
});
```

## Design Checklist

```
Tool Design:
- [ ] Name is a verb or verb_noun (search_rules, get_agent)
- [ ] Description explains WHAT and WHEN (for LLM to understand)
- [ ] All parameters have descriptions and types
- [ ] Required vs optional params clearly marked
- [ ] Error responses use isError: true with descriptive messages
- [ ] Input validated before processing

Resource Design:
- [ ] URI follows scheme://path pattern
- [ ] mimeType set correctly (text/markdown, application/json)
- [ ] Read-only (no side effects)
- [ ] Returns 404-equivalent for missing resources

Prompt Design:
- [ ] Arguments have clear descriptions
- [ ] Output is ready-to-use for the LLM
- [ ] Does not duplicate Tool functionality

Server:
- [ ] Stdio and SSE transports both tested
- [ ] Auth guard works when MCP_SSE_TOKEN is set
- [ ] Auth disabled when MCP_SSE_TOKEN is unset
- [ ] Error handling prevents server crashes
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Tool does too many things | One Tool = one action |
| Resource has side effects | Move to Tool if it changes state |
| Schema has no descriptions | LLM uses descriptions to decide when/how to call |
| No error handling in tools | Always catch and return isError: true |
| Breaking stdio with console.log | Use stderr for logs: `process.stderr.write(...)` |
| Hardcoded paths | Use env vars or config injection |
