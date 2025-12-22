# Codingbuddy MCP Server

[![CI](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/Codingbuddydev/codingbuddy/actions/workflows/dev.yml)

A NestJS-based Model Context Protocol (MCP) server that provides AI coding assistants with project-specific context and rules.

## Quick Start

```bash
# Initialize project configuration (AI-powered)
npx codingbuddy init

# This analyzes your project and creates codingbuddy.config.js
```

## Features

### CLI Commands

| Command | Description |
|---------|-------------|
| `codingbuddy init` | Analyze project and generate configuration |
| `codingbuddy --help` | Show help |
| `codingbuddy --version` | Show version |

### MCP Resources

| Resource | Description |
|----------|-------------|
| `config://project` | Project configuration (tech stack, architecture, language) |
| `rules://rules/core.md` | Core workflow rules |
| `rules://rules/project.md` | Project setup rules |
| `rules://agents/{name}.json` | Specialist agent definitions |

### MCP Tools

| Tool | Description |
|------|-------------|
| `get_project_config` | Get project configuration settings |
| `search_rules` | Search through rules and guidelines |
| `get_agent_details` | Get detailed profile of a specialist agent |
| `parse_mode` | Parse PLAN/ACT/EVAL workflow mode (includes language setting) |

### MCP Prompts

| Prompt | Description |
|--------|-------------|
| `activate_agent` | Activate a specialist agent with project context |

## Prerequisites

- Node.js v18+

## Installation

### Option 1: npx (Recommended - No Installation Required)

Add the following configuration to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codingbuddy-rules": {
      "command": "npx",
      "args": ["codingbuddy-mcp"]
    }
  }
}
```

> **Note**: Use `codingbuddy-mcp` for the MCP server. The `codingbuddy` command is for CLI operations like `init`.

### Option 2: Global Installation

```bash
npm install -g codingbuddy
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "codingbuddy-rules": {
      "command": "codingbuddy-mcp"
    }
  }
}
```

### Option 3: Local Development (Stdio Mode)

```bash
cd mcp-server
yarn install
yarn build
```

```json
{
  "mcpServers": {
    "codingbuddy-rules": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/codingbuddy/mcp-server/dist/src/main.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO` with your actual path.

### Option 4: AWS Fargate / Docker - SSE Mode

Build the Docker image from the **repository root**:

```bash
# Run from codingbuddy root
docker build -f mcp-server/Dockerfile -t codingbuddy-rules-mcp .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e MCP_TRANSPORT=sse \
  -e PORT=3000 \
  codingbuddy-rules-mcp
```

The server will start in SSE mode, exposing:
- `GET /sse`: SSE Endpoint
- `POST /messages`: Message Endpoint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode (`stdio` or `sse`) | `stdio` |
| `PORT` | HTTP port for SSE mode | `3000` |
| `CODINGBUDDY_RULES_DIR` | Custom path to `.ai-rules` directory | Auto-detected |
| `CODINGBUDDY_PROJECT_ROOT` | Project root for config loading | Current directory |
| `ANTHROPIC_API_KEY` | API key for `codingbuddy init` | Required for init |

## Project Configuration

### Initialize Configuration

```bash
# Basic usage (requires ANTHROPIC_API_KEY env var)
npx codingbuddy init

# With options
npx codingbuddy init --format json        # Output as JSON instead of JS
npx codingbuddy init --force              # Overwrite existing config
npx codingbuddy init /path/to/project     # Specify project path
npx codingbuddy init --api-key sk-...     # Pass API key directly
```

### Configuration File

The `codingbuddy init` command creates a `codingbuddy.config.js` file:

```javascript
module.exports = {
  // Response language (ko, en, ja, etc.)
  language: 'ko',

  // Project metadata
  projectName: 'my-awesome-app',
  description: 'A modern web application',

  // Technology stack
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js', 'Tailwind CSS'],
    backend: ['Node.js', 'Prisma'],
    database: ['PostgreSQL'],
    tools: ['ESLint', 'Prettier', 'Vitest'],
  },

  // Architecture pattern
  architecture: {
    pattern: 'feature-sliced-design',
    structure: ['app', 'widgets', 'features', 'entities', 'shared'],
  },

  // Coding conventions
  conventions: {
    style: 'airbnb',
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
      functions: 'camelCase',
    },
  },

  // Testing strategy
  testStrategy: {
    approach: 'tdd',
    frameworks: ['Vitest', 'Playwright'],
    coverage: 80,
  },
};
```

### File Structure

```
my-project/
├── codingbuddy.config.js     # Main configuration
├── .codingignore             # Files to ignore (gitignore syntax)
└── .codingbuddy/             # Additional context (optional)
    └── context/
        ├── architecture.md   # Architecture documentation
        └── api-guide.md      # API usage guide
```

### How AI Uses Configuration

When you use an AI assistant with this MCP server:

1. **Language**: AI responds in your configured language
2. **Tech Stack**: AI provides code examples using your frameworks
3. **Architecture**: AI suggests structures following your patterns
4. **Conventions**: AI follows your naming and style rules

## Development

```bash
# Watch mode
yarn start:dev
```

## Testing

### 1. Using MCP Inspector (Recommended)

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a web-based tool to interactively test your MCP server.

```bash
# Build the server first
yarn build

# Run with Inspector
npx @modelcontextprotocol/inspector node dist/src/main.js
```

### 2. Manual Test Script

A simple script is provided to verify basic connectivity and JSON-RPC responses.

```bash
# Build the server
yarn build

# Run the test script
node test/manual-client.js
```

## Publishing

Automated via GitHub Actions on `master` push.

1. **Update Version**:
   ```bash
   npm version patch # or minor, major
   ```

2. **Push to Master**:
   ```bash
   git push
   ```

The workflow will:
1. Detect version change.
2. Create a GitHub Release (e.g., `v1.0.1`).
3. Publish to NPM as `codingbuddy`.

