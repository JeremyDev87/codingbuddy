# Codingbuddy Development Guide

This guide helps you set up a local development environment and understand the project architecture.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Project Architecture](#project-architecture)
- [Development Commands](#development-commands)
- [Debugging](#debugging)
- [Testing](#testing)
- [Building and Deployment](#building-and-deployment)

## Prerequisites

### Required

- **Node.js**: v18 or higher
- **Yarn**: via Corepack (included with Node.js)

### Recommended

- **VS Code**: For debugging support
- **Docker**: For container-based deployment testing

### Enable Corepack

```bash
corepack enable
```

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Codingbuddydev/codingbuddy.git
cd codingbuddy
```

### 2. Install Dependencies

```bash
cd mcp-server
yarn install
```

### 3. Verify Installation

```bash
# Run tests
yarn test

# Build the project
yarn build

# Start in development mode
yarn start:dev
```

### 4. Test with MCP Inspector

```bash
yarn build
npx @modelcontextprotocol/inspector node dist/src/main.js
```

## Project Architecture

### Directory Structure

```
codingbuddy/
├── .ai-rules/                    # AI coding rules (single source of truth)
│   ├── rules/                    # Core rules
│   │   ├── core.md               # PLAN/ACT/EVAL workflow
│   │   ├── project.md            # Project setup guidelines
│   │   └── augmented-coding.md   # TDD and coding practices
│   ├── agents/                   # Specialist agent definitions
│   │   ├── frontend-developer.json
│   │   ├── backend-developer.json
│   │   ├── code-reviewer.json
│   │   └── ...
│   └── adapters/                 # Tool-specific integrations
├── mcp-server/                   # NestJS MCP server
│   ├── src/
│   │   ├── main.ts               # Entry point
│   │   ├── app.module.ts         # Root module
│   │   ├── mcp/                  # MCP protocol handlers
│   │   │   ├── mcp.module.ts
│   │   │   ├── mcp.service.ts    # Resources, Tools, Prompts
│   │   │   └── mcp.controller.ts # SSE transport
│   │   ├── rules/                # Rules file access
│   │   │   ├── rules.module.ts
│   │   │   └── rules.service.ts
│   │   ├── config/               # Configuration loading
│   │   │   ├── config.module.ts
│   │   │   ├── config.service.ts
│   │   │   ├── config.loader.ts
│   │   │   └── config.schema.ts
│   │   ├── keyword/              # Mode keyword parsing
│   │   │   └── keyword.service.ts
│   │   └── shared/               # Shared utilities
│   ├── test/                     # Test utilities
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docs/                         # Documentation
├── CLAUDE.md                     # Claude Code instructions
├── CONTRIBUTING.md               # Contribution guidelines
└── codingbuddy.config.js         # Project configuration (optional)
```

### Module Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AppModule                         │
├─────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ McpModule │  │RulesModule│  │ ConfigModule  │   │
│  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│        │              │                │            │
│        v              v                v            │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │McpService │──│RulesService│  │ ConfigService │   │
│  │           │  │            │  │               │   │
│  │- Resources│  │- listAgents│  │- getSettings  │   │
│  │- Tools    │  │- getAgent  │  │- getLanguage  │   │
│  │- Prompts  │  │- searchRules│ │               │   │
│  └───────────┘  └───────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Request Flow

```
Client Request
      │
      v
┌─────────────────┐
│ Transport Layer │  (Stdio or SSE)
└────────┬────────┘
         │
         v
┌─────────────────┐
│   McpService    │  (Request routing)
└────────┬────────┘
         │
    ┌────┴────┐
    v         v
┌───────┐ ┌───────┐
│Rules  │ │Config │  (Data access)
│Service│ │Service│
└───────┘ └───────┘
    │         │
    v         v
┌───────┐ ┌───────┐
│.ai-   │ │config │  (File system)
│rules/ │ │.js    │
└───────┘ └───────┘
```

## Development Commands

### Daily Development

```bash
# Start development server with hot reload
yarn start:dev

# Run linting
yarn lint
yarn lint:fix

# Run formatting
yarn format:check
yarn format

# Run type checking
yarn typecheck
```

### Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test src/mcp/mcp.service.spec.ts
```

### Quality Checks

```bash
# All checks (run before commit)
yarn lint && yarn format:check && yarn typecheck && yarn test:coverage && yarn circular && yarn build
```

### Rules Validation

Validate `.ai-rules/` files before committing:

```bash
# Full validation (structure + schema + markdown)
yarn validate:rules

# Schema validation only
yarn validate:rules:schema

# Markdown linting only
yarn validate:rules:markdown
```

The validation includes:
- Directory structure checks
- Required file existence
- JSON syntax and schema validation (agent files)
- Markdown linting

### Building

```bash
# Production build
yarn build

# Run production build
node dist/src/main.js
```

## Debugging

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "yarn",
      "runtimeArgs": ["start:dev"],
      "cwd": "${workspaceFolder}/mcp-server",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "yarn",
      "runtimeArgs": ["test", "--run"],
      "cwd": "${workspaceFolder}/mcp-server",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode (`stdio` or `sse`) | `stdio` |
| `PORT` | HTTP port for SSE mode | `3000` |
| `CODINGBUDDY_RULES_DIR` | Custom `.ai-rules` path | Auto-detected |
| `CODINGBUDDY_PROJECT_ROOT` | Project root path | Current directory |

### Logging

The server uses NestJS Logger. Set log level via environment:

```bash
# Debug logging
DEBUG=* yarn start:dev
```

## Testing

### Test Structure

```
src/
├── mcp/
│   ├── mcp.service.ts
│   └── mcp.service.spec.ts      # Unit tests
├── rules/
│   ├── rules.service.ts
│   └── rules.service.spec.ts
└── config/
    ├── config.loader.ts
    └── config.loader.spec.ts
```

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  it('should do something', () => {
    const result = service.doSomething();
    expect(result).toBe(expected);
  });

  it('should handle errors', () => {
    expect(() => service.doSomething()).toThrow('Error message');
  });
});
```

### Mocking

```typescript
import { vi } from 'vitest';

// Mock a module
vi.mock('./my-module', () => ({
  myFunction: vi.fn().mockReturnValue('mocked'),
}));

// Mock a service method
vi.spyOn(service, 'method').mockResolvedValue('result');
```

### Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

## Building and Deployment

### Local Build

```bash
cd mcp-server
yarn build
```

### Docker Build

From repository root:

```bash
docker build -f mcp-server/Dockerfile -t codingbuddy-rules-mcp .
```

### Docker Run

```bash
# Stdio mode (for CLI integration)
docker run codingbuddy-rules-mcp

# SSE mode (for HTTP integration)
docker run -p 3000:3000 -e MCP_TRANSPORT=sse codingbuddy-rules-mcp
```

### NPM Publishing

Publishing is automated via GitHub Actions on push to master:

1. Update version: `npm version patch|minor|major`
2. Push to master
3. GitHub Actions creates release and publishes to npm

### Manual Publishing

```bash
cd mcp-server
yarn prepublishOnly  # Copies .ai-rules and builds
npm publish
```

---

## See Also

- [API Reference](./api.md)
- [Customization Guide](./customization.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
