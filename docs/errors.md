# Codingbuddy Error Reference

This document lists all error codes, their causes, and how to resolve them.

## Table of Contents

- [MCP Protocol Errors](#mcp-protocol-errors)
- [Resource Errors](#resource-errors)
- [Tool Errors](#tool-errors)
- [Configuration Errors](#configuration-errors)
- [Troubleshooting FAQ](#troubleshooting-faq)

## MCP Protocol Errors

### InvalidRequest (-32600)

**Description**: The request is invalid or malformed.

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Invalid URI scheme` | URI doesn't use `rules://` or `config://` | Use correct URI scheme for resources |

**Example**:

```
Error: Invalid URI scheme
```

**Resolution**:

```
# Wrong
file://rules/core.md

# Correct
rules://rules/core.md
config://project
```

---

### MethodNotFound (-32601)

**Description**: The requested method, tool, or prompt doesn't exist.

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Tool not found: {name}` | Invalid tool name | Use valid tool name |
| `Prompt not found` | Invalid prompt name | Use `activate_agent` |

**Valid Tools**:
- `search_rules`
- `get_agent_details`
- `parse_mode`
- `get_project_config`

**Valid Prompts**:
- `activate_agent`

---

### InternalError (-32603)

**Description**: Server-side error during processing.

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| `Failed to load project configuration` | Missing or invalid config file | Run `npx codingbuddy init` |

---

## Resource Errors

### Resource not found

**Error**:
```
Resource not found: rules://rules/custom.md
```

**Cause**: The requested rule file doesn't exist in `packages/rules/.ai-rules/` directory.

**Resolution**:
1. Check if the file exists: `ls packages/rules/.ai-rules/rules/`
2. Verify the path is correct
3. Create the file if it should exist

---

### Agent not found

**Error**:
```
Agent 'unknown-agent' not found.
```

**Cause**: The specified agent name doesn't match any agent file.

**Resolution**:
1. List available agents: `ls packages/rules/.ai-rules/agents/`
2. Use the filename without extension (e.g., `frontend-developer`)

**Valid Agent Names**:
- `frontend-developer`
- `backend-developer`
- `code-reviewer`
- `architecture-specialist`
- `test-strategy-specialist`
- `performance-specialist`
- `security-specialist`
- `accessibility-specialist`
- `seo-specialist`
- `ui-ux-designer`
- `documentation-specialist`
- `code-quality-specialist`
- `devops-engineer`

---

## Tool Errors

### search_rules

| Error | Cause | Resolution |
|-------|-------|------------|
| Empty results | No matches found | Try broader search terms |

---

### get_agent_details

| Error | Cause | Resolution |
|-------|-------|------------|
| `Agent '{name}' not found` | Invalid agent name | Use valid agent name |

---

### parse_mode

| Error | Cause | Resolution |
|-------|-------|------------|
| `Failed to parse mode` | Internal parsing error | Check prompt format |

**Valid Mode Keywords**:
- `PLAN` or `PLAN:`
- `ACT` or `ACT:`
- `EVAL` or `EVALUATE`

---

### get_project_config

| Error | Cause | Resolution |
|-------|-------|------------|
| `Failed to get project config` | Config file missing/invalid | Run `npx codingbuddy init` |

---

## Configuration Errors

### Missing Configuration File

**Error**:
```
Failed to load project configuration
```

**Cause**: `codingbuddy.config.js` not found in project root.

**Resolution**:

```bash
# Generate configuration
npx codingbuddy init

# Or create manually
touch codingbuddy.config.js
```

---

### Invalid Configuration Schema

**Error**:
```
Configuration validation failed
```

**Cause**: Configuration file has invalid structure.

**Resolution**:

Check your `codingbuddy.config.js` matches the expected schema:

```javascript
module.exports = {
  language: 'ko',                    // Required: 'ko', 'en', 'ja', etc.
  projectName: 'my-project',         // Optional
  description: 'Project description', // Optional
  techStack: {                       // Optional
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
    database: ['PostgreSQL'],
  },
  architecture: {                    // Optional
    pattern: 'feature-sliced-design',
    structure: ['app', 'features', 'shared'],
  },
  conventions: {                     // Optional
    style: 'airbnb',
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },
  testStrategy: {                    // Optional
    approach: 'tdd',
    frameworks: ['Vitest'],
    coverage: 80,
  },
};
```

---

### Missing ANTHROPIC_API_KEY

**Error**:
```
ANTHROPIC_API_KEY is required for codingbuddy init
```

**Cause**: API key not provided for AI-powered initialization.

**Resolution**:

```bash
# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Or pass directly
npx codingbuddy init --api-key sk-ant-...
```

---

## Troubleshooting FAQ

### Q: Server doesn't start

**A**: Check these common issues:

1. **Node.js version**: Requires v18+
   ```bash
   node --version
   ```

2. **Dependencies installed**:
   ```bash
   yarn install
   ```

3. **Build successful**:
   ```bash
   yarn workspace codingbuddy build
   ```

---

### Q: MCP Inspector shows no resources

**A**: Check `packages/rules/.ai-rules/` directory exists and contains files:

```bash
ls -la packages/rules/.ai-rules/
ls -la packages/rules/.ai-rules/rules/
ls -la packages/rules/.ai-rules/agents/
```

---

### Q: Claude Desktop doesn't connect

**A**: Verify your configuration:

1. Check config file location:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Verify JSON syntax:
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

3. Restart Claude Desktop after config changes

---

### Q: Tests fail with "module not found"

**A**: Rebuild the project:

```bash
rm -rf node_modules
yarn install
yarn workspace codingbuddy build
yarn workspace codingbuddy test
```

---

### Q: Coverage below threshold

**A**: Current thresholds:

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

Run coverage report to identify gaps:

```bash
yarn workspace codingbuddy test:coverage
```

---

### Q: "Cannot find module" in production

**A**: Ensure dependencies are installed:

```bash
yarn install
yarn workspace codingbuddy build
```

---

## Getting Help

If you encounter an error not listed here:

1. Check [GitHub Issues](https://github.com/Codingbuddydev/codingbuddy/issues)
2. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (Node version, OS)
   - Relevant configuration

---

## See Also

- [API Reference](./api.md)
- [Development Guide](./development.md)
- [Customization Guide](./customization.md)
