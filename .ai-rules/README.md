# Common AI Coding Rules System

This directory contains shared coding rules and guidelines used across multiple AI coding assistants (Cursor, Claude Code, Codex, Antigravity, Amazon Q, Kiro, etc.) for consistent development practices.

## Directory Structure

```
.ai-rules/
├── README.md              # This file - overview and usage guide
├── rules/                 # Common coding rules (AI-agnostic)
│   ├── core.md           # Workflow modes (PLAN/ACT/EVAL), communication
│   ├── clarification-guide.md  # Clarification Phase guidelines for PLAN mode
│   ├── project.md        # Tech stack, architecture, project context
│   └── augmented-coding.md  # TDD principles, code quality standards
├── agents/                # Specialist agent definitions (JSON)
│   └── *.json            # Domain specialist agents
└── adapters/              # AI tool-specific integration guides
    └── *.md              # Integration guides per tool
```

## Purpose

### Single Source of Truth

All AI coding assistants share the same:
- **Workflow modes** (PLAN/ACT/EVAL)
- **Code quality standards** (TDD, SOLID, 90%+ test coverage)
- **Project context** (tech stack, architecture, conventions)
- **Specialist knowledge** (security, performance, accessibility, etc.)

### Benefits

- **Consistency**: All AI tools follow identical coding standards
- **Maintainability**: Update rules once, all tools benefit
- **Extensibility**: Easy to add new AI tools
- **Flexibility**: Tool-specific customizations via adapters
- **Team Alignment**: Everyone uses the same guidelines regardless of AI tool preference

## Core Rules Overview

### 1. `rules/core.md` - Workflow & Communication

**Workflow Modes:**
- **PLAN**: Define implementation plan (includes optional Clarification Phase)
- **ACT**: Execute the plan and make code changes
- **EVAL**: Analyze results and propose improvements

**Clarification Phase (Optional in PLAN):**
- Triggers when AI detects ambiguous requirements (2+ unclear items)
- Sequential Q&A with progress indicator (Question N/M)
- Multiple-choice questions preferred for easy response
- See `rules/clarification-guide.md` for detailed guidelines

**Key Principles:**
- Start in PLAN mode by default
- Move to ACT when user types `ACT`
- Return to PLAN after ACT completes (automatic)
- Enter EVAL only when explicitly requested

### 2. `rules/project.md` - Project Setup

**Purpose:** Define project-specific context that AI assistants need.

**Contents (customize per project):**
- Tech stack and dependencies
- Project structure and architecture
- Development rules and conventions
- Code review checklist

> **Note**: This file is a template. Each project should customize it based on their tech stack and architecture.

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

## Specialist Agents

Specialist agents provide domain-specific expertise:

| Agent | Expertise | Use Cases |
|-------|-----------|-----------|
| **Code Reviewer** | Quality evaluation, architecture | Code review, production readiness |
| **Architecture Specialist** | Layer boundaries, dependencies | System design, refactoring |
| **Test Strategy Specialist** | Test coverage, TDD workflow | Testing strategy, quality assurance |
| **Performance Specialist** | Optimization, profiling | Performance tuning, bottleneck analysis |
| **Security Specialist** | Authentication, vulnerabilities | Security audit, secure coding |
| **Accessibility Specialist** | WCAG 2.1 AA, ARIA | A11y compliance, screen readers |
| **Documentation Specialist** | Technical writing, clarity | Documentation quality |
| **Code Quality Specialist** | SOLID, DRY, complexity | Code quality planning/review |
| **DevOps Engineer** | CI/CD, containerization, monitoring | Infrastructure, deployment |

See `agents/README.md` for detailed agent documentation.

## AI Tool Integration

Each AI tool has its own integration guide in `adapters/`:

- **Cursor**: `adapters/cursor.md`
- **Claude Code**: `adapters/claude-code.md`
- **GitHub Copilot / Codex**: `adapters/codex.md`
- **Antigravity**: `adapters/antigravity.md`
- **Amazon Q**: `adapters/q.md`
- **Kiro**: `adapters/kiro.md`

## Getting Started

### For New AI Tool

1. **Read the adapter guide**: Check if your tool has a guide in `adapters/`
2. **Create tool directory**: e.g., `.{tool}/rules/`
3. **Reference common rules**: Link to `.ai-rules/` in your tool's config
4. **Add tool-specific customizations**: Only what's unique to that tool

### For Existing Tools

1. **Update existing configs**: Add references to `.ai-rules/`
2. **Remove duplicates**: Rely on common rules first
3. **Keep tool-specific features**: Maintain what's unique to each tool

## Usage Examples

### Workflow Example

```
User: Create a new feature for user registration

AI: # Mode: PLAN
    [References .ai-rules/rules/core.md workflow]
    [Uses .ai-rules/rules/project.md context]
    [Applies .ai-rules/rules/augmented-coding.md TDD]

User: ACT

AI: # Mode: ACT
    [Executes implementation]

User: EVAL

AI: # Mode: EVAL
    [Evaluates with code-reviewer.json framework]
```

### Referencing Rules

In any AI tool:
- `@.ai-rules/rules/core.md` - Workflow guidance
- `@.ai-rules/rules/project.md` - Project context
- `@.ai-rules/agents/*.json` - Specialist expertise

## Maintenance

### Updating Rules

**For changes affecting all AI tools:**
1. Edit files in `.ai-rules/rules/` or `.ai-rules/agents/`
2. Commit changes
3. All AI tools automatically use updated rules

**For tool-specific changes:**
1. Edit only that tool's config (e.g., `.cursor/rules/`)
2. Common rules remain unchanged

### Update Checklist

After modifying `.ai-rules/`:
- [ ] Rules are AI-agnostic (no tool-specific syntax)
- [ ] Rules are technology-agnostic (no framework-specific content)
- [ ] All markdown files are valid
- [ ] Agent JSON files are valid
- [ ] Documentation updated if needed

## Architecture Principles

### Design Decisions

1. **AI-Agnostic Format**: Use standard markdown and JSON
2. **Technology-Agnostic**: No framework-specific examples in common rules
3. **Modular Structure**: Separate concerns (workflow, project, quality)
4. **Tool Adapters**: Each tool translates common rules to its format
5. **Single Source of Truth**: `.ai-rules/` is authoritative

### Override Hierarchy

When rules conflict between common rules and tool-specific configurations:

**Priority Order** (highest to lowest):
1. **Tool-specific rules** (e.g., `.cursor/rules/`)
2. **Common rules** (`.ai-rules/rules/*.md`)
3. **Default AI behavior** (tool's built-in defaults)

### File Format Choices

- **Markdown (.md)**: Universal, readable, supported by all tools
- **JSON (.json)**: Structured data for agent definitions
- **Tool-specific**: Each tool keeps its native format

## Contributing

### Adding New Rules

1. Determine scope: All tools or tool-specific?
2. If all tools: Add to `.ai-rules/rules/`
3. If tool-specific: Add to `.{tool}/rules/`
4. Ensure content is technology-agnostic
5. Update relevant documentation

### Adding New AI Tools

1. Create directory: `.{new-tool}/`
2. Create adapter guide: `.ai-rules/adapters/{new-tool}.md`
3. Create tool config: `.{new-tool}/rules/`
4. Reference common rules from `.ai-rules/`
5. Document tool-specific features

## Further Reading

- **Workflow Details**: `rules/core.md`
- **Clarification Phase**: `rules/clarification-guide.md`
- **Project Setup**: `rules/project.md`
- **TDD & Quality**: `rules/augmented-coding.md`
- **Agent System**: `agents/README.md`
- **Tool Integration**: `adapters/*.md`
