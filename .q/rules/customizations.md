# Amazon Q Customizations

## Common AI Rules

This project follows shared coding rules from `packages/rules/.ai-rules/` for consistency across all AI assistants.

### Workflow Modes (PLAN/ACT/EVAL)

Refer to `packages/rules/.ai-rules/rules/core.md`:
- **PLAN**: Create implementation plans
- **ACT**: Execute code changes
- **EVAL**: Quality assessment and improvements

### Project Setup

Refer to `packages/rules/.ai-rules/rules/project.md`:
- **Tech Stack**: 프로젝트의 package.json 참조
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Development Rules**: File naming, import/export conventions

### Coding Standards

Refer to `packages/rules/.ai-rules/rules/augmented-coding.md`:
- **TDD Workflow**: Red → Green → Refactor
- **Code Quality**: SOLID principles, DRY, 90%+ coverage
- **Testing**: No mocking, test real behavior

### Specialist Expertise

Refer to `packages/rules/.ai-rules/agents/*.json`:
- Frontend development patterns
- Security best practices
- Performance optimization
- Accessibility guidelines

## Amazon Q Specific Features

### AWS Integration
- Leverage Q's AWS knowledge for deployment
- Use Q's security scanning with our security rules
- Apply Q's cost optimization suggestions

### Language Support
- Respond in Korean (한국어) as per project standard
- Use technical Korean terminology

## Full Documentation

- Core Workflow: `packages/rules/.ai-rules/rules/core.md`
- Project Setup: `packages/rules/.ai-rules/rules/project.md`
- Coding Principles: `packages/rules/.ai-rules/rules/augmented-coding.md`
- Specialist Agents: `packages/rules/.ai-rules/agents/README.md`
- Integration Guide: `packages/rules/.ai-rules/adapters/q.md`
