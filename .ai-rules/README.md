# Common AI Coding Rules System

This directory contains shared coding rules and guidelines used across multiple AI coding assistants (Cursor, Claude Code, Codex, Antigravity, Amazon Q, Kiro, etc.) for consistent development practices.

## 📁 Directory Structure

```
.ai-rules/
├── README.md              # This file - overview and usage guide
├── rules/                 # Common coding rules (AI-agnostic)
│   ├── core.md           # Workflow modes (PLAN/ACT/EVAL), communication
│   ├── project.md        # Tech stack, architecture, project context
│   └── augmented-coding.md  # TDD principles, code quality standards
├── agents/                # Specialist agent definitions (JSON)
│   ├── README.md         # Agent system guide
│   ├── frontend-developer.json
│   ├── code-reviewer.json
│   ├── accessibility-specialist.json
│   ├── architecture-specialist.json
│   ├── code-quality-specialist.json
│   ├── design-system-specialist.json
│   ├── documentation-specialist.json
│   ├── devops-engineer.json
│   ├── performance-specialist.json
│   ├── security-specialist.json
│   ├── seo-specialist.json
│   └── test-strategy-specialist.json
└── adapters/              # AI tool-specific integration guides
    ├── cursor.md         # Cursor integration
    ├── claude-code.md    # Claude Code/Projects integration
    ├── codex.md          # GitHub Copilot / Codex integration
    ├── antigravity.md    # Antigravity (Gemini) integration
    ├── q.md              # Amazon Q integration
    └── kiro.md           # Kiro integration
```

## 🎯 Purpose

### Single Source of Truth

All AI coded assistants share the same:
- **Workflow modes** (PLAN/ACT/EVAL)
- **Code quality standards** (TDD, SOLID, 90%+ test coverage)
- **Project context** (tech stack, architecture, conventions)
- **Specialist knowledge** (security, performance, accessibility, etc.)

### Benefits

✅ **Consistency**: All AI tools follow identical coding standards  
✅ **Maintainability**: Update rules once, all tools benefit  
✅ **Extensibility**: Easy to add new AI tools  
✅ **Flexibility**: Tool-specific customizations via adapters  
✅ **Team Alignment**: Everyone uses the same guidelines regardless of AI tool preference

## 📚 Core Rules Overview

### 1. `rules/core.md` - Workflow & Communication

**Workflow Modes:**
- **PLAN**: Define implementation plan without making changes
- **ACT**: Execute the plan and make code changes
- **EVAL**: Analyze results and propose improvements

**Key Principles:**
- Start in PLAN mode by default
- Move to ACT when user types `ACT`
- Return to PLAN after ACT completes (automatic)
- Enter EVAL only when explicitly requested

**Agent System:**
- Frontend Developer (auto-activated in PLAN/ACT)
- Code Reviewer (auto-activated in EVAL)
- 10+ specialist agents for domain expertise

### 2. `rules/project.md` - Project Setup

**Tech Stack:**

프로젝트의 `package.json`을 참조하세요. AI 규칙에서는 특정 패키지 버전을 고정하지 않습니다.

**Architecture:**
```
src/
├── app/       # Next.js App Router
├── entities/  # Domain entities (business logic)
├── features/  # Feature-specific UI components
├── widgets/   # Composite widgets
└── shared/    # Common modules
```

**Development Rules:**
- Layer dependency: app → widgets → features → entities → shared
- Pure/impure function separation
- Server Components as default
- 90%+ test coverage goal

### 3. `rules/augmented-coding.md` - TDD & Quality

**TDD Cycle:**
1. **Red**: Write failing test
2. **Green**: Implement minimal code
3. **Refactor**: Improve after tests pass

**Code Quality:**
- SOLID principles
- DRY (Don't Repeat Yourself)
- No mocking - test real behavior
- TypeScript strict mode (no `any`)
- Tidy First approach (separate structural vs behavioral changes)

## 🤖 Specialist Agents

12 specialist agents provide domain-specific expertise:

| Agent                        | Expertise                           | Use Cases                                |
| ---------------------------- | ----------------------------------- | ---------------------------------------- |
| **Frontend Developer**       | React/Next.js, TDD, design system   | Component implementation, Server Actions |
| **Code Reviewer**            | Quality evaluation, architecture    | Code review, production readiness        |
| **Architecture Specialist**  | Layer boundaries, dependencies      | System design, refactoring               |
| **Test Strategy Specialist** | Test coverage, TDD workflow         | Testing strategy, quality assurance      |
| **Performance Specialist**   | Bundle size, rendering optimization | Performance tuning, Core Web Vitals      |
| **Security Specialist**      | OAuth 2.0, JWT, XSS/CSRF            | Authentication, security audit           |
| **Accessibility Specialist** | WCAG 2.1 AA, ARIA                   | A11y compliance, screen readers          |
| **SEO Specialist**           | Metadata API, structured data       | Search optimization, social sharing      |
| **Design System Specialist** | Design system, Tailwind CSS         | Component usage, design tokens           |
| **Documentation Specialist** | Technical writing, AI prompts       | Documentation quality, clarity           |
| **Code Quality Specialist**  | SOLID, DRY, complexity              | Code quality planning/review             |
| **DevOps Engineer**          | Docker, Datadog, deployment         | Infrastructure, monitoring               |

See `agents/README.md` for detailed agent documentation.

## 🔌 AI Tool Integration

Each AI tool has its own integration guide in `adapters/`:

### Cursor
- Uses `.cursor/rules/imports.mdc` to reference common rules
- Maintains Cursor-specific features (globs, alwaysApply)
- See `adapters/cursor.md`

### Claude Code
- Uses `.claude/rules/custom-instructions.md`
- Integrates with Claude Projects
- See `adapters/claude-code.md`

### GitHub Copilot / Codex
- Uses `.github/copilot-instructions.md` or `.codex/rules/`
- Provides context for code completions
- See `adapters/codex.md`

### Antigravity
- Uses `.antigravity/rules/instructions.md`
- Leverages task boundaries and artifacts
- See `adapters/antigravity.md`

### Amazon Q
- Uses `.q/rules/customizations.md`
- Combines AWS expertise with project standards
- See `adapters/q.md`

### Kiro
- Uses `.kiro/rules/guidelines.md`
- See `adapters/kiro.md`

## 🚀 Getting Started

### For New AI Tool

1. **Read the adapter guide**: Check if your tool has a guide in `adapters/`
2. **Create tool directory**: e.g., `.{tool}/rules/`
3. **Reference common rules**: Link to `.ai-rules/` in your tool's config
4. **Add tool-specific customizations**: Only what's unique to that tool

### For Existing Tools

1. **Update existing configs**: Add references to `.ai-rules/`
2. **Remove duplicates**: Rely on common rules first
3. **Keep tool-specific features**: Maintain what's unique to each tool

## 📝 Usage Examples

### Workflow Example

```
User: 새로운 뉴스레터 구독 기능 만들어줘

AI: # Mode: PLAN
    [References .ai-rules/rules/core.md workflow]
    [Uses .ai-rules/rules/project.md tech stack]
    [Applies .ai-rules/rules/augmented-coding.md TDD]

User: ACT

AI: # Mode: ACT
    [Executes with .ai-rules/agents/frontend-developer.json]

User: EVAL

AI: # Mode: EVAL
    [Evaluates with .ai-rules/agents/code-reviewer.json]
```

### Referencing Rules

In any AI tool:
- `@.ai-rules/rules/core.md` - Workflow guidance
- `@.ai-rules/rules/project.md` - Project context
- `@.ai-rules/agents/frontend-developer.json` - Development expertise

## 🔧 Maintenance

### Updating Rules

**For changes affecting all AI tools:**
1. Edit files in `.ai-rules/rules/` or `.ai-rules/agents/`
2. Commit changes: `git commit -m "docs: update common AI rules - [reason]"`
3. All AI tools automatically use updated rules

**For tool-specific changes:**
1. Edit only that tool's config (e.g., `.cursor/rules/`)
2. Common rules remain unchanged
3. Tool-specific overrides apply

### Update Checklist

After modifying `.ai-rules/`:
- [ ] Rules are AI-agnostic (no tool-specific syntax)
- [ ] All markdown files are valid
- [ ] Agent JSON files are valid
- [ ] Tested in at least 2 AI tools
- [ ] Documentation updated if needed

### Validation

Run the validation script (coming soon):
```bash
./scripts/validate-rules.sh
```

This checks:
- Common rule files exist
- Markdown syntax is valid
- JSON files are valid
- AI tool configs reference common rules correctly

## 🏗️ Architecture Principles

### Design Decisions

1. **AI-Agnostic Format**: Use standard markdown and JSON
2. **Modular Structure**: Separate concerns (workflow, project, quality)
3. **Tool Adapters**: Each tool translates common rules to its format
4. **Single Source of Truth**: `.ai-rules/` is authoritative
5. **Override Hierarchy**: Tool-specific > Common rules (see below)

### Override Hierarchy

When rules conflict between common rules and tool-specific configurations, the priority is:

**Priority Order** (highest to lowest):
1. **Tool-specific rules** (e.g., `.cursor/rules/cursor-specific.mdc`)
2. **Common rules** (`.ai-rules/rules/*.md`)
3. **Default AI behavior** (tool's built-in defaults)

**Example**:
```
Scenario: Code formatting preference conflict
- .ai-rules/rules/project.md: "Use 2 spaces for indentation"
- .cursor/rules/cursor-specific.mdc: "Use tabs for indentation"

Result for Cursor: Tabs (tool-specific wins)
Result for Claude: 2 spaces (uses common rules)
```

**Best Practice**:
- Keep tool-specific rules minimal
- Only override when truly necessary for that tool
- Document why override is needed

### File Format Choices

- **Markdown (.md)**: Universal, readable, supported by all tools
- **JSON (.json)**: Structured data for agent definitions
- **Tool-specific**: Each tool keeps its native format (e.g., Cursor's .mdc)

## 📊 Impact

### Before (Tool-Specific Rules)
```
.cursor/         6 rule files
.claude/         6 rule files
.antigravity/    6 rule files
.q/              6 rule files
.kiro/           6 rule files
.codex/          6 rule files
-----------------------------------
Total:          36 files to maintain
Update time:    6x per change
Consistency:    ❌ Often diverges
```

### After (Common Rules)
```
.ai-rules/       3 rule files + 12 agent files
.cursor/         1 reference file
.claude/         1 reference file
.antigravity/    1 reference file
.q/              1 reference file
.kiro/           1 reference file
.codex/          1 reference file
-----------------------------------
Total:          21 files (15 common, 6 refs)
Update time:    1x per change
Consistency:    ✅ Always in sync
```

**Time Savings**: 90% reduction in rule update time  
**Consistency**: 100% alignment across all tools

## 🤝 Contributing

### Adding New Rules

1. Determine scope: All tools or tool-specific?
2. If all tools: Add to `.ai-rules/rules/`
3. If tool-specific: Add to `.{tool}/rules/`
4. Test with multiple AI tools
5. Update relevant documentation

### Adding New AI Tools

1. Create directory: `.{new-tool}/`
2. Create adapter guide: `.ai-rules/adapters/{new-tool}.md`
3. Create tool config: `.{new-tool}/rules/`
4. Reference common rules from `.ai-rules/`
5. Document tool-specific features

## 📖 Further Reading

- **Workflow Details**: `rules/core.md`
- **Project Setup**: `rules/project.md`
- **TDD & Quality**: `rules/augmented-coding.md`
- **Agent System**: `agents/README.md`
- **Tool Integration**: `adapters/*.md`

## 📧 Support

For questions or issues with common AI rules:
1. Check the relevant adapter guide in `adapters/`
2. Review the specific rule file in `rules/`
3. Consult the agent documentation in `agents/README.md`

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-20  
**Maintained  by**: Development Team
