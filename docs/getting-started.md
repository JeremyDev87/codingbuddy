<p align="center">
  <a href="getting-started.md">English</a> |
  <a href="ko/getting-started.md">한국어</a> |
  <a href="zh-CN/getting-started.md">中文</a> |
  <a href="ja/getting-started.md">日本語</a> |
  <a href="es/getting-started.md">Español</a>
</p>

# Getting Started

Get up and running with Codingbuddy in minutes.

**Codingbuddy orchestrates 35 AI agents** to deliver human-expert-team-level code quality through the PLAN → ACT → EVAL workflow.

## Prerequisites

- **Node.js**: v18 or higher
- **AI Tool**: Any supported AI coding assistant ([see full list](./supported-tools.md))

## Quick Start

### Step 1: Initialize Your Project

```bash
# Initialize Codingbuddy in your project (no API key required)
npx codingbuddy init
```

This command analyzes your project and creates a `codingbuddy.config.json` file with:

- Detected tech stack (languages, frameworks, tools)
- Architecture patterns
- Coding conventions
- Testing strategy
- Default AI model selection

#### AI Model Selection

During initialization, you'll be prompted to select a default AI model (Claude Sonnet 4, Opus 4, or Haiku 3.5). Your selection is saved to `ai.defaultModel` in the config file.

> **Note**: Haiku 3.5 is not recommended for complex coding tasks due to its smaller context window and reduced capability for multi-step reasoning. Use Sonnet 4 or Opus 4 for best results.

See [AI Configuration](./config-schema.md#ai-configuration-ai) for detailed model options and characteristics.

#### AI-Powered Initialization (Optional)

For more detailed analysis using AI, use the `--ai` flag:

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run AI-powered initialization
npx codingbuddy init --ai
```

The AI-powered mode provides deeper project analysis and more tailored configurations.

#### Environment Variables

The CLI respects standard environment variables for color output control:

| Variable | Description |
|----------|-------------|
| `NO_COLOR` | Set to any value to disable colored output (follows [no-color.org](https://no-color.org/) standard) |
| `FORCE_COLOR` | Set to `1` to force colors (useful in CI). Set to `0` to disable. Takes precedence over `NO_COLOR` |

Example usage:

```bash
# Disable colors for accessibility or piping
NO_COLOR=1 npx codingbuddy init

# Force colors in CI environments
FORCE_COLOR=1 npx codingbuddy init
```

### Step 2: Configure Your AI Tool

Add Codingbuddy to your AI assistant. Here's an example for Claude Desktop:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

For other AI tools, see [Supported Tools](./supported-tools.md).

### Alternative: Claude Code Plugin

For enhanced integration with Claude Code, install the dedicated plugin:

```bash
# 1. Add the marketplace
claude marketplace add JeremyDev87/codingbuddy

# 2. Install the plugin
claude plugin install codingbuddy@jeremydev87

# 3. Install MCP server for full functionality
npm install -g codingbuddy
```

The plugin provides:
- **Workflow Modes**: PLAN/ACT/EVAL/AUTO structured development
- **Specialist Agents**: 35 AI agents (security, performance, accessibility and more)
- **Skills**: Reusable workflows (TDD, debugging, API design)
- **Context Persistence**: Decisions survive conversation compaction

**Plugin Documentation:**
- [Plugin Setup Guide](./plugin-guide.md) - Detailed installation and configuration
- [Quick Reference](./plugin-quick-reference.md) - Commands and modes at a glance
- [Architecture](./plugin-architecture.md) - How plugin and MCP work together
- [Usage Examples](./plugin-examples.md) - Real-world workflow examples
- [Troubleshooting](./plugin-troubleshooting.md) - Common issues and solutions
- [FAQ](./plugin-faq.md) - Frequently asked questions

### Step 3: Start Coding

Your AI assistant now has access to:

- **Project context**: Tech stack, architecture, conventions
- **Workflow modes**: PLAN → ACT → EVAL
- **Specialist agents**: Security, performance, accessibility experts

Try it:

```
You: PLAN Create a user authentication feature

AI: # Mode: PLAN
    I'll design an authentication feature following your project's patterns...
```

## Configuration

### Generated Config File

The `codingbuddy.config.json` file customizes AI behavior:

```javascript
module.exports = {
  // AI responds in this language
  language: 'en',

  // Project metadata
  projectName: 'my-app',

  // Technology stack
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
  },

  // Architecture pattern
  architecture: {
    pattern: 'feature-sliced-design',
  },

  // Coding conventions
  conventions: {
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },

  // Testing approach
  testStrategy: {
    approach: 'tdd',
    coverage: 80,
  },
};
```

See [Configuration Schema](./config-schema.md) for all options.

### Additional Context

Add project-specific documentation that AI should know about:

```
my-project/
├── codingbuddy.config.json
└── .codingbuddy/
    └── context/
        ├── architecture.md    # System architecture docs
        └── api-conventions.md # API design guidelines
```

### Ignore Patterns

Create `.codingignore` to exclude files from AI analysis:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
.next/

# Sensitive files
.env*
*.pem
```

## Using Workflow Modes

### PLAN Mode (Default)

Start with planning before making changes:

```
You: PLAN Add dark mode support

AI: # Mode: PLAN

    ## Implementation Plan
    1. Create theme context...
    2. Add toggle component...
    3. Persist preference...
```

### ACT Mode

Execute the plan with code changes:

```
You: ACT

AI: # Mode: ACT

    Creating theme context...
    [Makes code changes following TDD]
```

### EVAL Mode

Review and improve implementation:

```
You: EVAL

AI: # Mode: EVAL

    ## Code Review
    - ✅ Theme context properly typed
    - ⚠️ Consider adding system preference detection
```

## Using Specialist Agents

Activate domain experts for specific tasks:

```
You: Activate the security-specialist agent to review authentication

AI: [Activates security-specialist]

    ## Security Review
    - Password hashing: ✅ Using bcrypt
    - Session management: ⚠️ Consider shorter token expiry
    ...
```

Available specialists:

- `security-specialist` - Security audits
- `performance-specialist` - Optimization
- `accessibility-specialist` - WCAG compliance
- `code-reviewer` - Code quality
- `architecture-specialist` - System architecture
- `test-strategy-specialist` - Testing approaches
- `i18n-specialist` - Internationalization
- `seo-specialist` - SEO optimization
- `ui-ux-designer` - UI/UX design
- `documentation-specialist` - Documentation
- `code-quality-specialist` - Code standards
- `integration-specialist` - External API integrations
- `event-architecture-specialist` - Message queues, Event Sourcing
- `observability-specialist` - Distributed tracing, SLI/SLO
- `migration-specialist` - Legacy modernization, zero-downtime migrations
- See [full agent list](../packages/rules/.ai-rules/agents/README.md)

## Next Steps

- [Supported Tools](./supported-tools.md) - Setup guides for each AI tool
- [Philosophy](./philosophy.md) - Understanding the design principles
- [API Reference](./api.md) - MCP server capabilities
- [Development Guide](./development.md) - Contributing to Codingbuddy
