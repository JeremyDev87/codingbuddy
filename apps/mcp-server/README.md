# Codingbuddy MCP Server

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)

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
| `codingbuddy mcp` | Start MCP server (stdio mode by default) |
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
| `recommend_skills` | Recommend skills based on user prompt with multi-language support |
| `get_code_conventions` | **🆕** Get project code conventions from config files (tsconfig, eslint, prettier, editorconfig, markdownlint) |
| `generate_checklist` | Generate contextual checklists including conventions domain |
| `analyze_task` | Comprehensive task analysis with risk assessment |

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
    "codingbuddy": {
      "command": "npx",
      "args": ["-y", "codingbuddy", "mcp"]
    }
  }
}
```

### Option 2: Global Installation

```bash
npm install -g codingbuddy
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": ["mcp"]
    }
  }
}
```

### Option 3: Local Development (Stdio Mode)

```bash
cd apps/mcp-server
yarn install
yarn build
```

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/codingbuddy/apps/mcp-server/dist/src/cli/cli.js", "mcp"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO` with your actual path.

### Option 4: AWS Fargate / Docker - SSE Mode

Build the Docker image from the **repository root**:

```bash
# Run from codingbuddy root
docker build -f apps/mcp-server/Dockerfile -t codingbuddy-mcp .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e MCP_TRANSPORT=sse \
  -e PORT=3000 \
  codingbuddy-mcp
```

The server will start in SSE mode, exposing:
- `GET /sse`: SSE Endpoint
- `POST /messages`: Message Endpoint

### Option 5: Vercel Deployment

The MCP server can be deployed to Vercel as a serverless function:

#### Deploy

```bash
cd apps/mcp-server
npx vercel deploy
```

#### Endpoint

- **URL**: `https://your-project.vercel.app/api/mcp`
- **Method**: POST
- **Content-Type**: application/json

#### Example Request

```bash
curl -X POST https://your-project.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### Transport Modes

| Mode | Use Case | Command |
|------|----------|---------|
| Stdio | CLI integration | `yarn start` |
| SSE | Self-hosted HTTP | `MCP_TRANSPORT=sse yarn start` |
| Vercel | Serverless HTTPS | `npx vercel deploy` |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_TRANSPORT` | Transport mode (`stdio` or `sse`) | `stdio` |
| `PORT` | HTTP port for SSE mode | `3000` |
| `CODINGBUDDY_RULES_DIR` | Custom path to `.ai-rules` directory | Auto-detected |
| `CODINGBUDDY_PROJECT_ROOT` | Project root for config loading | Current directory |
| `ANTHROPIC_API_KEY` | API key for `codingbuddy init` | Required for init |

## Cache Behavior

The MCP server caches configuration to improve performance. Cache TTL varies by environment:

| Environment | Cache TTL | Use Case |
|-------------|-----------|----------|
| Development | 5 minutes | Frequent config changes during development |
| Production | 1 hour | Stable configs, reduced file system access |

**Note**: To force a config reload in development, restart the MCP server or wait for cache expiration.

## 🆕 Code Conventions Usage

The `get_code_conventions` MCP tool automatically parses your project's config files and enforces conventions.

### Supported Config Files

| File | Conventions Extracted |
|------|----------------------|
| `tsconfig.json` | TypeScript strict mode, compiler options, path aliases |
| `eslint.config.js` / `.eslintrc.json` | ESLint flat/legacy config, rules, parser options |
| `.prettierrc` | Quote style, semicolons, trailing commas, indentation |
| `.editorconfig` | Indent style/size, line endings, charset |
| `.markdownlint.json` | Markdown linting rules (MD001, MD003, etc.) |

### Example Usage in ACT Mode

```typescript
// AI calls this tool before implementing
const conventions = await get_code_conventions();

// TypeScript conventions
if (conventions.typescript.strict) {
  // ✅ Use strict mode - no implicit any
}

// Prettier conventions
const quote = conventions.prettier.singleQuote ? "'" : '"';
const semi = conventions.prettier.semi ? ';' : '';

// EditorConfig conventions
const indent = ' '.repeat(conventions.editorconfig.indent_size || 2);
```

### Checklist Domain: `conventions`

The conventions checklist includes 26 validation items across 5 categories:

1. **TypeScript** (4 items): strict mode, noImplicitAny, strictNullChecks, path aliases
2. **ESLint** (3 items): flat config usage, rules compliance, no errors
3. **Prettier** (5 items): quotes, semicolons, trailing commas, indentation, arrow parens
4. **EditorConfig** (6 items): indent style/size, line endings, charset, whitespace, final newline
5. **Markdown** (3 items): heading style, list style, markdownlint rules

### EVAL Mode Integration

```typescript
// AI automatically includes conventions in code review
const checklist = await generate_checklist({
  files: ['src/auth/login.ts'],
  domains: ['security', 'conventions'] // conventions added automatically
});

// Checklist items include:
// - "TypeScript strict mode is enabled"
// - "Code uses consistent quote style per .prettierrc"
// - "Indentation style matches .editorconfig"
// ... and 23 more convention checks
```

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

