<p align="center">
  <a href="plugin-troubleshooting.md">English</a> |
  <a href="ko/plugin-troubleshooting.md">한국어</a> |
  <a href="zh-CN/plugin-troubleshooting.md">中文</a> |
  <a href="ja/plugin-troubleshooting.md">日本語</a> |
  <a href="es/plugin-troubleshooting.md">Español</a> |
  <a href="pt-BR/plugin-troubleshooting.md">Português</a>
</p>

# CodingBuddy Troubleshooting Guide

Solutions to common issues when using the CodingBuddy Claude Code Plugin.

## Installation Issues

### Plugin Not Appearing in Claude Code

**Symptom**: After installation, `claude plugin list` doesn't show codingbuddy.

**Solutions**:

1. **Verify installation completed**
   ```bash
   # Check if plugin files exist
   ls ~/.claude/plugins/codingbuddy/
   ```

2. **Reinstall the plugin**
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

3. **Check Claude Code version**
   ```bash
   claude --version
   # Plugin system requires Claude Code 1.0+
   ```

4. **Restart Claude Code**
   ```bash
   # Exit Claude Code completely and restart
   claude
   ```

### npm Installation Fails

**Symptom**: `npm install -g codingbuddy-claude-plugin` fails with errors.

**Solutions**:

1. **Permission errors (EACCES)**
   ```bash
   # Option A: Use a Node version manager
   # Install nvm, then:
   nvm install --lts
   npm install -g codingbuddy-claude-plugin

   # Option B: Fix npm prefix
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g codingbuddy-claude-plugin
   ```

2. **Network errors**
   ```bash
   # Check npm registry
   npm config get registry
   # Should be https://registry.npmjs.org/

   # Try with verbose logging
   npm install -g codingbuddy-claude-plugin --verbose
   ```

3. **Node version too old**
   ```bash
   node --version
   # Requires Node.js 18+
   # Update Node.js if needed
   ```

---

## Marketplace Issues

### "Invalid marketplace schema" Error

**Symptom**: `claude marketplace add` fails with:
```
✘ Failed to add marketplace: Invalid marketplace schema from URL: : Invalid input: expected object, received string
```

**Cause**: Using URL format instead of GitHub repository format.

**Solution**:
```bash
# Wrong (URL format - deprecated)
claude marketplace add https://jeremydev87.github.io/codingbuddy

# Correct (GitHub repository format)
claude marketplace add JeremyDev87/codingbuddy
```

### Migrating from URL Format

If you previously added the marketplace using the URL format:

```bash
# 1. Remove old marketplace
claude marketplace remove https://jeremydev87.github.io/codingbuddy

# 2. Add with correct format
claude marketplace add JeremyDev87/codingbuddy

# 3. Reinstall the plugin
claude plugin install codingbuddy@jeremydev87
```

### Marketplace Not Found

**Symptom**: `claude marketplace add JeremyDev87/codingbuddy` fails with "not found"

**Solutions**:

1. **Check spelling and case**
   - GitHub username: `JeremyDev87` (case-sensitive)
   - Repository: `codingbuddy`

2. **Verify network connectivity**
   ```bash
   curl -I https://github.com/JeremyDev87/codingbuddy
   ```

3. **Update Claude Code**
   ```bash
   npm update -g @anthropic-ai/claude-code
   ```

---

## MCP Connection Issues

### MCP Server Not Connecting

**Symptom**: Workflow commands (PLAN, ACT, EVAL) don't activate properly, no agent shown.

**Diagnosis**:
```bash
# Check if codingbuddy CLI is installed
which codingbuddy
codingbuddy --version

# Check MCP configuration
cat ~/.claude/settings.json | grep -A5 codingbuddy
```

**Solutions**:

1. **Install the MCP server**
   ```bash
   npm install -g codingbuddy
   ```

2. **Add MCP configuration**

   Edit `~/.claude/settings.json`:
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

3. **Restart Claude Code**
   ```bash
   # Exit and restart
   claude
   ```

### MCP Tools Not Available

**Symptom**: `/mcp` command doesn't show CodingBuddy tools.

**Solutions**:

1. **Check MCP server is running**
   ```bash
   # In a separate terminal, run:
   codingbuddy
   # Should start without errors
   ```

2. **Verify PATH includes codingbuddy**
   ```bash
   echo $PATH
   which codingbuddy
   # If not found, add to PATH
   ```

3. **Check for conflicting MCP servers**
   ```bash
   cat ~/.claude/settings.json
   # Ensure no duplicate entries for codingbuddy
   ```

### "Command not found: codingbuddy"

**Symptom**: MCP tries to run `codingbuddy` but it's not found.

**Solutions**:

1. **Add global npm bin to PATH**
   ```bash
   # For npm
   export PATH="$(npm config get prefix)/bin:$PATH"

   # For yarn
   export PATH="$(yarn global bin):$PATH"
   ```

2. **Use absolute path in MCP config**
   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "/usr/local/bin/codingbuddy",
         "args": ["mcp"]
       }
     }
   }
   ```

---

## Workflow Issues

### PLAN/ACT/EVAL Keywords Not Recognized

**Symptom**: Typing "PLAN implement X" doesn't trigger workflow mode.

**Solutions**:

1. **Check keyword is at start of message**
   ```
   # Correct
   PLAN implement user login

   # Wrong - keyword not at start
   Can you PLAN implement user login
   ```

2. **Use uppercase or localized keywords**
   ```
   PLAN ...
   계획 ...  (Korean)
   計画 ...  (Japanese)
   ```

3. **Verify MCP is connected**
   - Type `/mcp` to see available tools
   - Should show `parse_mode` tool

### Context Not Persisting

**Symptom**: ACT mode doesn't remember PLAN decisions.

**Solutions**:

1. **Check context file exists**
   ```bash
   cat docs/codingbuddy/context.md
   ```

2. **Ensure PLAN completed properly**
   - PLAN mode creates the context file
   - If interrupted, restart with PLAN

3. **Check file permissions**
   ```bash
   ls -la docs/codingbuddy/
   # Ensure write permissions
   ```

### AUTO Mode Doesn't Stop

**Symptom**: AUTO mode keeps iterating even when issues are fixed.

**Solutions**:

1. **Check iteration limit**
   - Default is 5 iterations
   - AUTO stops when Critical=0 AND High=0

2. **Review EVAL findings**
   - Some issues may be recurring
   - Address root cause, not symptoms

3. **Manual intervention**
   - Type any message to interrupt AUTO
   - Review findings, then restart if needed

---

## Performance Issues

### Slow Response Times

**Symptom**: Claude takes a long time to respond in workflow modes.

**Solutions**:

1. **Simplify the task**
   - Break complex tasks into smaller chunks
   - Use PLAN for one feature at a time

2. **Reduce specialist agents**
   - Configure fewer specialists in `codingbuddy.config.json`
   ```javascript
   module.exports = {
     specialists: ['security-specialist']  // Only essential ones
   };
   ```

3. **Check context size**
   - Large context files slow down processing
   - Start fresh PLAN for new features

### High Token Usage

**Symptom**: Hitting context limits quickly.

**Solutions**:

1. **Use focused prompts**
   ```
   # Better
   PLAN add email validation to registration

   # Less efficient
   PLAN review the entire auth module and add validation
   ```

2. **Let context compact naturally**
   - Claude Code automatically summarizes old context
   - Don't manually repeat previous context

---

## Configuration Issues

### Project Config Not Loading

**Symptom**: `codingbuddy.config.json` settings not applied.

**Solutions**:

1. **Check file location**
   - Must be in project root
   - Named exactly `codingbuddy.config.json`

2. **Verify syntax**
   ```bash
   node -e "console.log(require('./codingbuddy.config.json'))"
   ```

3. **Check export format**
   ```javascript
   // Correct
   module.exports = { language: 'en' };

   // Wrong
   export default { language: 'en' };
   ```

### Wrong Language Responses

**Symptom**: Claude responds in wrong language.

**Solutions**:

1. **Set language in config**
   ```javascript
   // codingbuddy.config.json
   module.exports = {
     language: 'ko'  // 'en', 'ko', 'ja', 'zh', 'es'
   };
   ```

2. **Use environment variable**
   ```bash
   export CODINGBUDDY_LANGUAGE=ko
   ```

3. **Use localized keywords**
   - Start with Korean: `계획 사용자 로그인 구현`
   - Claude will respond in Korean

---

## Debug Mode

### Enable Verbose Logging

For detailed debugging:

```bash
# Run MCP server with debug output
CODINGBUDDY_DEBUG=true codingbuddy
```

### Check MCP Communication

```bash
# In Claude Code, check MCP status
/mcp

# Should show:
# - codingbuddy server status
# - Available tools
# - Last error if any
```

### Review Context Document

```bash
# Check what context is persisted
cat docs/codingbuddy/context.md

# Look for:
# - Previous PLAN decisions
# - ACT progress
# - EVAL findings
```

---

## Getting Help

### Report Issues

1. **GitHub Issues**: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

2. **Include in report**:
   - Claude Code version (`claude --version`)
   - Plugin version (from plugin.json)
   - MCP server version (`codingbuddy --version`)
   - Steps to reproduce
   - Error messages

### Check Documentation

- [Installation Guide](./plugin-guide.md)
- [Architecture](./plugin-architecture.md)
- [FAQ](./plugin-faq.md)

---

## Quick Diagnostic Checklist

```
[ ] Node.js 18+ installed
[ ] Claude Code 1.0+ installed
[ ] Plugin visible in `claude plugin list`
[ ] MCP server installed (`which codingbuddy`)
[ ] MCP config in settings.json
[ ] Can see tools with `/mcp`
[ ] PLAN keyword triggers mode
[ ] Context file created after PLAN
```
