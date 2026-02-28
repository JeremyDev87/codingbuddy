# Kiro Guidelines

## Common AI Rules

This project uses shared coding rules from `packages/rules/.ai-rules/` for consistency across all AI coding assistants.

### Workflow Reference

See `packages/rules/.ai-rules/rules/core.md`:
- **PLAN mode**: Create implementation plans with TDD approach
- **ACT mode**: Execute changes following quality standards
- **EVAL mode**: Evaluate code quality and suggest improvements
- **AUTO mode**: Autonomous PLAN → ACT → EVAL cycle until quality achieved

### Project Context

See `packages/rules/.ai-rules/rules/project.md`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Conventions**: File naming, import/export rules, pure/impure function separation

### Coding Principles

See `packages/rules/.ai-rules/rules/augmented-coding.md`:
- **TDD Cycle**: Red (failing test) → Green (minimal code) → Refactor
- **Quality Standards**: SOLID principles, DRY, code complexity management
- **Testing**: 90%+ coverage goal, no mocking, real behavior testing
- **Commit Discipline**: Separate structural and behavioral changes

### Specialist Knowledge

See `packages/rules/.ai-rules/agents/`:
- Frontend Development (React/Next.js, TDD, design system)
- Code Review (quality evaluation, architecture analysis)
- Security (OAuth 2.0, JWT, XSS/CSRF protection)
- Performance (bundle optimization, rendering)
- Accessibility (WCAG 2.1 AA compliance)
- SEO, Architecture, Test Strategy, Design System, Documentation, Code Quality, DevOps

### MCP Server Integration

When the codingbuddy MCP server is configured (`.kiro/settings/mcp.json`), use MCP tools for enhanced workflow:

**Core Workflow Tools:**
- `parse_mode` — Parse PLAN/ACT/EVAL/AUTO keywords and load appropriate Agent/rules
- `update_context` — Persist decisions and notes to `docs/codingbuddy/context.md` (mandatory at mode completion)
- `read_context` — Read current context document

**Analysis Tools:**
- `search_rules` — Search rules and guidelines by query
- `analyze_task` — Pre-planning task analysis with risk assessment
- `generate_checklist` — Contextual checklists (security, a11y, performance)

**Agent & Skills Tools:**
- `get_agent_details` — Get specialist agent profile
- `recommend_skills` → `get_skill` — Discover and load relevant skills
- `prepare_parallel_agents` — Get specialist prompts for sequential execution

**Configuration Tools:**
- `get_project_config` — Get project configuration (language, tech stack)
- `get_code_conventions` — Get project code conventions

> **Note:** MCP 서버가 설정되어 있지 않은 경우, `.ai-rules/` 디렉토리의 파일을 직접 참조하여 동일한 규칙을 적용할 수 있습니다.

## 🔴 MANDATORY: Keyword Mode Detection

<CODINGBUDDY_CRITICAL_RULE>

**When user message starts with PLAN, ACT, EVAL, or AUTO keyword (or localized: Korean 계획/실행/평가/자동, Japanese 計画/実行/評価/自動, Chinese 计划/执行/评估/自动, Spanish PLANIFICAR/ACTUAR/EVALUAR/AUTOMÁTICO):**

1. **IMMEDIATELY** call `parse_mode` MCP tool (if available) or follow the mode-specific rules from `packages/rules/.ai-rules/rules/core.md`
2. Apply the mode's workflow **EXACTLY**
3. Do NOT proceed with your own interpretation

**This is MANDATORY, not optional.**

Failure to follow mode rules when these keywords are present will result in:
- Missed critical checklists (Devil's Advocate Analysis, Impact Radius Analysis)
- Incomplete evaluations
- Quality issues not caught before deployment

**Red Flags** (STOP if you think these):
| Thought | Reality |
|---------|---------|
| "I can handle EVAL myself" | NO. Follow mode rules FIRST. |
| "The rules are similar anyway" | NO. Each mode has specific checklists. |
| "I already know what to do" | NO. Rules may have been updated. |

</CODINGBUDDY_CRITICAL_RULE>

Example: `EVAL` → **즉시** EVAL 모드 규칙 적용 → Devil's Advocate Analysis 수행

---

## Kiro-Specific Features

### Communication
- Follow the `languageInstruction` from `parse_mode` response (or the project's `codingbuddy.config.json` language setting)
- Use clear, structured markdown formatting
- Provide actionable, specific feedback

### Workflow
Apply PLAN → ACT → EVAL (or AUTO for autonomous cycle) workflow as defined in `packages/rules/.ai-rules/rules/core.md`

## Full Documentation

For comprehensive guides:
- **Core Rules**: `packages/rules/.ai-rules/rules/core.md`
- **Project Setup**: `packages/rules/.ai-rules/rules/project.md`
- **Augmented Coding**: `packages/rules/.ai-rules/rules/augmented-coding.md`
- **Agents System**: `packages/rules/.ai-rules/agents/README.md`
- **Integration Guide**: `packages/rules/.ai-rules/adapters/kiro.md`

---

**Note**: These guidelines reference common AI rules from `packages/rules/.ai-rules/` directory shared across all AI assistants for consistency.
