<p align="center">
  <a href="plugin-faq.md">English</a> |
  <a href="ko/plugin-faq.md">한국어</a> |
  <a href="zh-CN/plugin-faq.md">中文</a> |
  <a href="ja/plugin-faq.md">日本語</a> |
  <a href="es/plugin-faq.md">Español</a> |
  <a href="pt-BR/plugin-faq.md">Português</a>
</p>

# CodingBuddy FAQ

Frequently asked questions about the CodingBuddy Claude Code Plugin.

## General Questions

### What is CodingBuddy?

CodingBuddy is a Multi-AI Rules system that provides consistent coding practices across AI assistants. It includes:

- **Workflow Modes**: PLAN/ACT/EVAL/AUTO for structured development
- **Specialist Agents**: 35 AI agents (security, performance, accessibility, etc.)
- **Skills**: Reusable workflows (TDD, debugging, API design, etc.)
- **Checklists**: Domain-specific quality checks

### Is the plugin required?

**No**, but recommended. You can use CodingBuddy in two ways:

1. **Plugin + MCP Server** (recommended): Full integration with Claude Code
2. **MCP Server only**: Manual configuration, same functionality

The plugin provides:
- Automatic command documentation
- Easier setup
- Better integration with Claude Code

### What's the difference between Plugin and MCP Server?

| Component | Purpose |
|-----------|---------|
| **Plugin** | Entry point for Claude Code (manifest + config) |
| **MCP Server** | Actual functionality (tools, agents, skills) |

The plugin is a thin wrapper that tells Claude Code how to connect to the MCP server.

### Does it work with other AI tools?

Yes! CodingBuddy supports multiple AI assistants:

- **Claude Code**: Full plugin support
- **Cursor**: Via `.cursor/rules/` configuration
- **GitHub Copilot**: Via `.codex/` configuration
- **Amazon Q**: Via `.q/` configuration
- **Kiro**: Via `.kiro/` configuration

All tools share the same rules from `packages/rules/.ai-rules/`.

---

## Installation Questions

### How do I install the plugin?

```bash
# 1. Add the marketplace
claude marketplace add JeremyDev87/codingbuddy

# 2. Install the plugin
claude plugin install codingbuddy@jeremydev87

# 3. Install MCP server for full functionality
npm install -g codingbuddy
```

See [Installation Guide](./plugin-guide.md) for detailed instructions.

### Do I need to install both the plugin and MCP server?

**Yes**, for full functionality:

- **Plugin**: Required for Claude Code integration
- **MCP Server**: Required for tools and agents

The plugin without the MCP server will have limited functionality.

### How do I update the plugin?

```bash
# Update plugin
claude plugin update codingbuddy

# Update MCP server
npm update -g codingbuddy
```

### Can I use it without global npm install?

Yes, use npx:

```json
// .mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy"]
    }
  }
}
```

---

## Workflow Questions

### What's the difference between PLAN and AUTO?

| Mode | Control | Iterations | When to Use |
|------|---------|------------|-------------|
| **PLAN** | Manual | 1 | When you want to review before acting |
| **AUTO** | Autonomous | Until quality met | For complete features with quality gates |

**PLAN** → You review → **ACT** → You review → **EVAL** (optional)

**AUTO** → Loops PLAN→ACT→EVAL until Critical=0, High=0

### When should I use EVAL?

Use EVAL when you want:
- Security audit before merging
- Accessibility review
- Performance analysis
- Code quality assessment

EVAL is **optional** - only use when you need quality assessment.

### Can I switch modes mid-workflow?

Yes, any mode can be triggered at any time:

```
PLAN implement feature   → Creates plan
ACT                      → Executes plan
PLAN refine approach     → Creates new plan (resets context)
ACT                      → Executes new plan
EVAL                     → Reviews implementation
```

### How does context persistence work?

Context is saved to `docs/codingbuddy/context.md`:

- **PLAN**: Resets context, creates new file
- **ACT**: Reads PLAN context, appends progress
- **EVAL**: Reads all context, appends findings

This survives conversation compaction, so ACT can access PLAN decisions even if early messages are summarized.

### What are the localized keywords?

| English | Korean | Japanese | Chinese | Spanish |
|---------|--------|----------|---------|---------|
| PLAN | 계획 | 計画 | 计划 | PLANIFICAR |
| ACT | 실행 | 実行 | 执行 | ACTUAR |
| EVAL | 평가 | 評価 | 评估 | EVALUAR |
| AUTO | 자동 | 自動 | 自动 | AUTOMÁTICO |

---

## Specialist Agent Questions

### What specialist agents are available?

**Planning Specialists**:
- 🏛️ architecture-specialist
- 🧪 test-strategy-specialist
- 📨 event-architecture-specialist
- 🔗 integration-specialist
- 📊 observability-specialist
- 🔄 migration-specialist

**Implementation Specialists**:
- 📏 code-quality-specialist
- ⚡ performance-specialist
- 🔒 security-specialist
- ♿ accessibility-specialist
- 🔍 seo-specialist
- 🎨 ui-ux-designer

**Developer Agents**:
- 🖥️ frontend-developer
- ⚙️ backend-developer
- 🔧 devops-engineer
- 📱 mobile-developer

### How are agents selected?

Agents are selected based on:

1. **Task context**: Keywords in your prompt
2. **Mode**: Different agents for PLAN vs ACT vs EVAL
3. **Configuration**: Custom agents in `codingbuddy.config.json`

### Can I use multiple agents?

Yes, specialists run in parallel during EVAL mode:

```
EVAL with security and accessibility focus
```

This activates both security-specialist and accessibility-specialist.

### How do I see agent details?

Use the MCP tool:

```
/mcp call get_agent_details --agentName security-specialist
```

---

## Configuration Questions

### How do I configure the plugin?

Create `codingbuddy.config.json` in your project root:

```javascript
module.exports = {
  language: 'en',
  defaultMode: 'PLAN',
  specialists: [
    'security-specialist',
    'accessibility-specialist'
  ]
};
```

### What configuration options are available?

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `language` | string | auto-detect | Response language (en, ko, ja, zh, es) |
| `defaultMode` | string | PLAN | Starting workflow mode |
| `specialists` | array | all | Enabled specialist agents |

### How do I change the response language?

Three ways:

1. **Config file**:
   ```javascript
   module.exports = { language: 'ko' };
   ```

2. **Environment variable**:
   ```bash
   export CODINGBUDDY_LANGUAGE=ko
   ```

3. **Use localized keyword**:
   ```
   계획 사용자 로그인 구현
   ```

---

## Troubleshooting Questions

### Why aren't workflow modes working?

Common causes:

1. MCP server not installed → `npm install -g codingbuddy`
2. MCP not configured → Add to `~/.claude/settings.json`
3. Keyword not at start → Put PLAN/ACT/EVAL first

See [Troubleshooting Guide](./plugin-troubleshooting.md) for detailed solutions.

### Why is context not persisting?

1. Check `docs/codingbuddy/context.md` exists
2. PLAN mode creates the file - always start with PLAN
3. Verify write permissions in docs folder

### How do I reset the context?

Start a new PLAN:

```
PLAN start fresh implementation
```

PLAN mode automatically resets the context document.

### Where can I report bugs?

GitHub Issues: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

Include:
- Version numbers (plugin, MCP server, Claude Code)
- Steps to reproduce
- Error messages

---

## Best Practices

### What's the recommended workflow?

1. **Start with PLAN** - Always plan before implementing
2. **Use specific prompts** - "implement X" not "help with X"
3. **Review before ACT** - Check the plan makes sense
4. **EVAL before merging** - Get quality assessment
5. **Use AUTO for complex features** - Let the cycle run

### How do I get the best results?

1. **Be specific**: "Add JWT auth with refresh tokens" not "add auth"
2. **Mention concerns**: "with focus on security" activates specialists
3. **Break down large tasks**: One feature per PLAN
4. **Review EVAL findings**: Address issues before merging

### When should I use TDD?

Use TDD (test-first) for:
- Business logic
- Utilities and helpers
- API handlers
- Data transformations

Use test-after for:
- UI components
- Visual elements
- Layouts

---

## See Also

- [Installation Guide](./plugin-guide.md)
- [Quick Reference](./plugin-quick-reference.md)
- [Architecture](./plugin-architecture.md)
- [Examples](./plugin-examples.md)
- [Troubleshooting](./plugin-troubleshooting.md)
