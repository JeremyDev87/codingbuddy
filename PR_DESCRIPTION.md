# feat: add OpenCode/Crush adapter support and mode-specific agents

## 📋 Summary

This PR adds comprehensive support for OpenCode and Crush AI editors, including configuration files, custom commands, adapter documentation, and introduces mode-specific agents (PLAN/ACT/EVAL) that delegate to appropriate implementation agents.

## 🎯 Reason for Change

### OpenCode/Crush Adapter Support
- **Problem**: No official support for OpenCode/Crush users despite growing user base (Crush has 16.7k+ stars)
- **Solution**: Provide complete integration guide, configuration templates, and custom commands for seamless `.ai-rules/` system integration

### Mode-Specific Agents
- **Problem**: Mode agents (PLAN/ACT/EVAL) were not clearly separated from implementation agents, causing confusion
- **Solution**: Create dedicated mode agents that orchestrate workflows and delegate to appropriate implementation agents (frontend-developer, code-reviewer)

### Security Improvement
- **Problem**: Hardcoded API keys in configuration files pose security risk
- **Solution**: Use environment variables for sensitive credentials (FIGMA_API_KEY, GITHUB_TOKEN)

## 🔧 Key Changes

### 1. OpenCode/Crush Configuration Files

#### OpenCode Configuration (`opencode.json`)
- Complete agent setup with PLAN/ACT/EVAL modes
- MCP server integration (codingbuddy, context7, sequential-thinking, playwright, figma, github, serena, filesystem)
- Environment variable-based secret management
- Specialist agents configuration (architect, tester, performance, security, a11y, seo, ux, docs, quality, devops)

#### Crush Configuration (`crush.json`)
- Crush-compatible format with `contextPaths` instead of `instructions`
- Simplified agent structure matching Crush's schema
- Skills system integration (`skills_paths`, `auto_suggest_skills`)
- Shortcuts configuration for quick agent switching

### 2. Custom Commands (`.opencode/commands/`)

#### plan-feature.md
- PLAN mode workflow command
- Guides users through planning phase
- Includes TDD perspective and architecture review

#### implement-tdd.md
- ACT mode TDD implementation command
- Red-Green-Refactor cycle guidance
- Step-by-step implementation workflow

#### code-review.md
- EVAL mode code review command
- Evidence-based evaluation checklist
- Quality assessment guidelines

### 3. Adapter Documentation

#### opencode.md (457 lines)
- Comprehensive integration guide
- Configuration examples for both OpenCode and Crush
- Agent system mapping (Mode Agents vs Specialist Agents vs Delegate Agents)
- MCP server setup instructions
- Usage patterns and examples
- Troubleshooting guide
- Migration notes from OpenCode to Crush

#### opencode-skills.md (263 lines)
- Skills system integration guide
- Skills mapping table (`.ai-rules/skills/` → OpenCode usage)
- Configuration examples for both OpenCode and Crush
- Usage patterns (direct invocation, agent integration, workflow integration)
- Skills discovery and auto-suggestion setup

#### .opencode/README.md
- Quick start guide
- File structure overview
- Usage examples
- Agent overview table
- MCP integration summary
- Troubleshooting tips

### 4. Mode-Specific Agents

#### plan-mode.json
- PLAN mode orchestrator agent
- Delegates to `frontend-developer` for implementation
- Mandatory checklist enforcement (language, todo creation, mode indicator)
- TDD perspective design focus
- Architecture review responsibilities

#### act-mode.json
- ACT mode orchestrator agent
- Delegates to `frontend-developer` for implementation
- Red-Green-Refactor cycle enforcement
- TDD workflow compliance
- Code quality standards verification

#### eval-mode.json
- EVAL mode orchestrator agent
- Delegates to `code-reviewer` for evaluation
- Evidence-based evaluation requirements
- Anti-sycophancy rules enforcement
- Multi-dimensional quality assessment

### 5. Keyword Service Enhancements

#### Agent Information Return
- Added `MODE_AGENTS` constant mapping modes to agent files
- `parseMode()` now returns `agent` field with agent file path
- Added `delegates_to` field indicating delegate agent name
- Added `delegate_agent_info` field with full delegate agent details
- New `getAgentInfo()` method for loading agent information

#### Type System Updates
- Added `AgentInfo` type for agent information
- Extended `ParseModeResult` with optional agent fields
- Updated `KeywordModesConfig` to include agent and delegate information

### 6. Rules Service Enhancements

#### Test Coverage Improvements
- Enhanced test coverage for rules service
- Added tests for custom rules integration
- Improved search result validation tests

### 7. Documentation Updates

#### agents/README.md
- Updated to include mode-specific agents
- Added mode agent vs specialist agent vs delegate agent explanation
- Updated quick reference table
- Added workflow mode documentation

#### keyword-modes.json
- Updated to include agent and delegate information for each mode
- Added `agent` field pointing to mode agent JSON file
- Added `delegates_to` field indicating delegate agent

## ⚠️ Breaking Changes

None

## ✅ Testing

### Configuration Files

#### 1. Validate JSON Schema
```bash
# OpenCode schema validation
npx ajv-cli validate -s https://opencode.ai/config.json -d opencode.json

# Crush schema validation  
npx ajv-cli validate -s https://charm.land/crush.json -d crush.json
```

#### 2. Test Environment Variable Substitution
```bash
export FIGMA_API_KEY="test-key"
export GITHUB_TOKEN="test-token"

# Verify environment variables are used correctly
grep -E "\$\{FIGMA_API_KEY\}|\$\{GITHUB_TOKEN\}" opencode.json
```

### Mode Agents

#### 1. Verify Agent Structure
```bash
# Check all mode agents exist
ls packages/rules/.ai-rules/agents/{plan,act,eval}-mode.json

# Validate JSON structure
for file in packages/rules/.ai-rules/agents/*-mode.json; do
  jq . "$file" > /dev/null && echo "✓ $file is valid JSON"
done
```

#### 2. Test Keyword Service Agent Return
```typescript
const result = await keywordService.parseMode('PLAN 새로운 기능 설계');
// Should include:
// - result.agent: 'agents/plan-mode.json'
// - result.delegates_to: 'frontend-developer'
// - result.delegate_agent_info: { ... }
```

### Custom Commands

#### 1. Verify Command Files Exist
```bash
ls .opencode/commands/*.md
# Should show: code-review.md, implement-tdd.md, plan-feature.md
```

#### 2. Test Command Content
- Each command file should have clear workflow steps
- Commands should reference appropriate agents
- Commands should follow `.ai-rules/` standards

## 📦 Changed Files

**Configuration Files (2 files):**
- `opencode.json` (+199 lines) - OpenCode configuration with environment variables
- `crush.json` (+148 lines) - Crush-compatible configuration

**Custom Commands (4 files):**
- `.opencode/README.md` (+108 lines) - Quick start guide
- `.opencode/commands/plan-feature.md` (+41 lines) - PLAN mode workflow
- `.opencode/commands/implement-tdd.md` (+42 lines) - ACT mode TDD implementation
- `.opencode/commands/code-review.md` (+54 lines) - EVAL mode code review

**Adapter Documentation (2 files):**
- `packages/rules/.ai-rules/adapters/opencode.md` (+457 lines) - Comprehensive integration guide
- `packages/rules/.ai-rules/adapters/opencode-skills.md` (+263 lines) - Skills integration guide

**Mode-Specific Agents (3 files):**
- `packages/rules/.ai-rules/agents/plan-mode.json` (+103 lines) - PLAN mode orchestrator
- `packages/rules/.ai-rules/agents/act-mode.json` (+158 lines) - ACT mode orchestrator
- `packages/rules/.ai-rules/agents/eval-mode.json` (+175 lines) - EVAL mode orchestrator

**Keyword Service (4 files):**
- `apps/mcp-server/src/keyword/keyword.types.ts` (+16 lines) - Agent info types
- `apps/mcp-server/src/keyword/keyword.service.ts` (+48 lines, -1 line) - Agent info return logic
- `apps/mcp-server/src/keyword/keyword.service.spec.ts` (+232 lines) - Enhanced tests
- `apps/mcp-server/src/keyword/keyword.module.ts` (+6 lines, -1 line) - Module updates

**Rules Service (2 files):**
- `apps/mcp-server/src/rules/rules.service.ts` (+22 lines, -1 line) - Service enhancements
- `apps/mcp-server/src/rules/rules.service.spec.ts` (+117 lines) - Test improvements

**MCP Service (1 file):**
- `apps/mcp-server/src/mcp/mcp.service.spec.ts` (+101 lines) - Test enhancements

**Documentation (2 files):**
- `packages/rules/.ai-rules/agents/README.md` (+117 lines, -1 line) - Updated agent documentation
- `packages/rules/.ai-rules/keyword-modes.json` (+12 lines, -1 line) - Added agent/delegate info

**Total**: 20 files changed, 2399 insertions(+), 20 deletions(-)

## 🔍 Review Checklist

### Configuration Files
- [ ] Verify `opencode.json` uses environment variables for secrets
- [ ] Verify `crush.json` follows Crush schema format
- [ ] Verify all MCP server configurations are correct
- [ ] Verify agent configurations reference correct agent files
- [ ] Verify environment variable names match documentation

### Custom Commands
- [ ] Verify all three command files exist and are complete
- [ ] Verify commands reference correct agents and workflows
- [ ] Verify commands follow `.ai-rules/` standards
- [ ] Verify README.md provides clear quick start guide

### Adapter Documentation
- [ ] Verify `opencode.md` covers all integration scenarios
- [ ] Verify `opencode-skills.md` maps all available skills
- [ ] Verify documentation includes troubleshooting section
- [ ] Verify migration guide from OpenCode to Crush is accurate

### Mode-Specific Agents
- [ ] Verify all three mode agents exist and are valid JSON
- [ ] Verify each mode agent has correct `delegates_to` field
- [ ] Verify mode agents include mandatory checklists
- [ ] Verify mode agents follow agent schema structure

### Keyword Service
- [ ] Verify `parseMode()` returns agent information
- [ ] Verify `delegates_to` field is correctly populated
- [ ] Verify `delegate_agent_info` is loaded correctly
- [ ] Verify tests cover new agent information functionality

### Security
- [ ] Verify no hardcoded secrets in configuration files
- [ ] Verify environment variable usage is documented
- [ ] Verify `.gitignore` excludes sensitive configuration files if needed

## 💡 Usage Examples

### OpenCode Setup

#### 1. Basic Configuration
```bash
# Copy configuration template
cp opencode.json .opencode.json

# Set environment variables
export FIGMA_API_KEY="your-figma-token"
export GITHUB_TOKEN="your-github-token"

# Start OpenCode
opencode
```

#### 2. Using Mode Agents
```bash
# PLAN mode
/agent plan-mode
새로운 기능을 계획해줘

# ACT mode
/agent act-mode
ACT
기능을 구현해줘

# EVAL mode
/agent eval-mode
EVAL
코드를 리뷰해줘
```

#### 3. Using Custom Commands
```bash
/plan-feature "사용자 인증"
/implement-tdd
/code-review
```

### Crush Setup

#### 1. Basic Configuration
```bash
# Copy configuration template
cp crush.json ~/.config/crush/crush.json

# Set environment variables
export GITHUB_TOKEN="your-github-token"

# Start Crush
crush
```

#### 2. Using Shortcuts
```bash
# Use predefined shortcuts
:plan    # Switch to plan agent
:act     # Switch to build agent
:eval    # Switch to reviewer agent
:arch    # Switch to architect agent
:sec     # Switch to security agent
```

### Skills Integration

#### 1. Direct Skill Invocation
```bash
/skill brainstorming "대시보드 UI"
/skill test-driven-development "API 구현"
/skill systematic-debugging "성능 이슈"
```

#### 2. Agent Integration
```bash
# Skills are automatically available in agents
/agent build
/skill tdd "새로운 기능"
```

## 🎯 Expected Impact

### User Experience
1. **Easier Onboarding**: Clear configuration templates reduce setup time
2. **Better Workflow**: Mode-specific agents provide clearer separation of concerns
3. **Security**: Environment variable-based secrets prevent accidental exposure
4. **Consistency**: Unified `.ai-rules/` system across different AI editors

### Developer Productivity
1. **Faster Setup**: Copy-paste configuration templates
2. **Clear Guidance**: Comprehensive documentation reduces confusion
3. **Workflow Clarity**: Mode agents make PLAN/ACT/EVAL workflow explicit
4. **Skills Access**: Easy access to specialized skills via commands

### Code Quality
1. **Better Architecture**: Mode agents enforce proper workflow separation
2. **TDD Compliance**: ACT mode agent enforces Red-Green-Refactor cycle
3. **Quality Reviews**: EVAL mode agent ensures evidence-based evaluation
4. **Consistent Standards**: All agents follow `.ai-rules/` standards

## 📝 Migration Guide

### For Existing OpenCode Users
- **No changes required**: Existing configurations continue to work
- **Optional**: Update to new mode-specific agents for clearer workflow
- **Recommended**: Migrate to Crush for better long-term support

### For New Users
- **Start with templates**: Use `opencode.json` or `crush.json` as starting point
- **Set environment variables**: Configure `FIGMA_API_KEY` and `GITHUB_TOKEN`
- **Follow quick start**: Use `.opencode/README.md` for initial setup
- **Read full guide**: Refer to `opencode.md` for comprehensive integration

### From OpenCode to Crush
1. Copy settings from `opencode.json` to `crush.json`
2. Update schema reference to Crush schema
3. Install Crush: `brew install charmbracelet/tap/crush`
4. Update configuration paths if needed
5. Test agent functionality

## 🔗 Related Issues

- Closes #127

## 📚 References

- [OpenCode GitHub](https://github.com/opencodeai/opencode) (archived)
- [Crush GitHub](https://github.com/charmbracelet/crush) (16.7k+ stars)
- [OpenCode Documentation](https://opencode.ai/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Codingbuddy MCP Server](../api.md#mcp-server)

