<p align="center">
  <a href="plugin-guide.md">English</a> |
  <a href="ko/plugin-guide.md">한국어</a> |
  <a href="zh-CN/plugin-guide.md">中文</a> |
  <a href="ja/plugin-guide.md">日本語</a> |
  <a href="es/plugin-guide.md">Español</a> |
  <a href="pt-BR/plugin-guide.md">Português</a>
</p>

# Claude Code Plugin Installation & Setup Guide

**Codingbuddy orchestrates 29 specialized AI agents** to deliver human-expert-team-level code quality through the PLAN → ACT → EVAL workflow.

This guide provides step-by-step instructions for installing and configuring the CodingBuddy Claude Code Plugin.

## Prerequisites

Before installing the plugin, ensure you have:

- **Node.js** 18.0 or higher
- **Claude Code** CLI installed and authenticated
- **npm** or **yarn** package manager

To verify your environment:

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check Claude Code is installed
claude --version
```

## Installation Methods

### Method 1: Via Claude Code Marketplace (Recommended)

The simplest way to install the plugin:

```bash
# 1. Add the marketplace
claude marketplace add JeremyDev87/codingbuddy

# 2. Install the plugin
claude plugin install codingbuddy@jeremydev87
```

> **Migration Note**: If you previously used `claude marketplace add https://jeremydev87.github.io/codingbuddy`, please remove the old marketplace and use the GitHub repository format shown above. The URL format is deprecated.

This automatically:
- Downloads the latest plugin version
- Registers it with Claude Code
- Sets up the MCP configuration

### Method 2: Via npm

For more control over the installation:

```bash
# Global installation
npm install -g codingbuddy-claude-plugin

# Or with yarn
yarn global add codingbuddy-claude-plugin
```

## MCP Server Setup (Required)

The plugin requires the CodingBuddy MCP server for full functionality. The MCP server provides:

- Specialist agents and skills
- Workflow modes (PLAN/ACT/EVAL/AUTO)
- Contextual checklists
- Session management

### Install MCP Server

```bash
npm install -g codingbuddy
```

### Configure Claude Code

Add the MCP server to your Claude Code configuration:

**Option A: Global Configuration**

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

**Option B: Project-Level Configuration**

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "codingbuddy",
      "args": []
    }
  }
}
```

## Verify Installation

### Step 1: Check Plugin is Registered

```bash
claude plugin list
```

You should see `codingbuddy` in the list.

### Step 2: Test MCP Connection

Start Claude Code and try a workflow command:

```bash
claude

# In Claude Code, type:
PLAN implement a user login feature
```

If configured correctly, you'll see:
- Mode indicator: `# Mode: PLAN`
- Agent activation message
- Structured plan output

### Step 3: Verify MCP Tools

In Claude Code, check available tools:

```
/mcp
```

You should see CodingBuddy tools like:
- `parse_mode`
- `get_agent_details`
- `generate_checklist`
- `read_context`
- `update_context`

## Troubleshooting Installation

### Plugin Not Appearing

**Symptom**: `claude plugin list` doesn't show codingbuddy

**Solutions**:
1. Reinstall the plugin:
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

2. Check Claude Code version:
   ```bash
   claude --version
   # Update if needed
   npm update -g @anthropic-ai/claude-code
   ```

### MCP Server Not Connecting

**Symptom**: Workflow commands don't work, no agent activation

**Solutions**:
1. Verify codingbuddy is installed globally:
   ```bash
   which codingbuddy  # Should show path
   codingbuddy --version
   ```

2. Check MCP configuration:
   ```bash
   cat ~/.claude/settings.json
   # Verify mcpServers section exists
   ```

3. Restart Claude Code:
   ```bash
   # Exit and restart
   claude
   ```

### Permission Errors

**Symptom**: Installation fails with EACCES or permission denied

**Solutions**:
1. Fix npm permissions:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

2. Or use a Node version manager (nvm, fnm)

### Version Mismatch

**Symptom**: Features don't work as expected

**Solutions**:
1. Update both packages:
   ```bash
   npm update -g codingbuddy codingbuddy-claude-plugin
   ```

2. Verify versions match:
   ```bash
   codingbuddy --version
   # Plugin version shown at startup in Claude Code
   ```

## Configuration Options

### Project-Level Configuration

Create `codingbuddy.config.json` in your project root:

```javascript
module.exports = {
  // Language for responses (auto-detected by default)
  language: 'en',  // 'en', 'ko', 'ja', 'zh', 'es'

  // Default workflow mode
  defaultMode: 'PLAN',

  // Enabled specialist agents
  specialists: [
    'security-specialist',
    'accessibility-specialist',
    'performance-specialist'
  ]
};
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODINGBUDDY_LANGUAGE` | Response language | auto-detect |
| `CODINGBUDDY_DEBUG` | Enable debug logging | false |

## Next Steps

After installation, explore:

- [Quick Reference](./plugin-quick-reference.md) - Commands and workflows at a glance
- [Plugin Architecture](./plugin-architecture.md) - How the plugin works
- [Usage Examples](./plugin-examples.md) - Real-world workflow examples
- [FAQ](./plugin-faq.md) - Common questions answered

## Updating the Plugin

### Update via Claude Code

```bash
claude plugin update codingbuddy
```

### Update via npm

```bash
npm update -g codingbuddy codingbuddy-claude-plugin
```

## Uninstalling

### Remove Plugin

```bash
claude plugin remove codingbuddy
```

### Remove MCP Server

```bash
npm uninstall -g codingbuddy
```

### Clean Configuration

Remove the `codingbuddy` entry from:
- `~/.claude/settings.json` (global)
- `.mcp.json` (project-level)
