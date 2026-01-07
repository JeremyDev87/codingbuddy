# Amazon Q Integration Guide

This guide explains how to use the common AI rules (`.ai-rules/`) with Amazon Q Developer.

## Overview

Amazon Q uses the `.q/` directory or AWS-specific configuration for custom instructions.

## Integration Method

### Create Amazon Q Configuration

Create `.q/rules/customizations.md`:

```markdown
# Amazon Q Customizations

## Common AI Rules

This project follows shared coding rules from `.ai-rules/` for consistency across all AI assistants.

### Workflow Modes (PLAN/ACT/EVAL)

Refer to `.ai-rules/rules/core.md` for:
- PLAN: Create implementation plans
- ACT: Execute code changes
- EVAL: Quality assessment and improvements

### Project Setup

Refer to `.ai-rules/rules/project.md` for:
- **Tech Stack**: See project package.json
- **Architecture**: Layered structure (app → widgets → features → entities → shared)
- **Development Rules**: File naming, import/export conventions

### Coding Standards

Refer to `.ai-rules/rules/augmented-coding.md` for:
- **TDD Workflow**: Red → Green → Refactor
- **Code Quality**: SOLID principles, DRY, 90%+ coverage
- **Testing**: No mocking, test real behavior

### Specialist Expertise

Refer to `.ai-rules/agents/*.json` for domain-specific knowledge:
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
- Follow project's configured language setting
- Use appropriate technical terminology
```

## Directory Structure

```
.q/
├── rules/
│   └── customizations.md  # References .ai-rules
└── config.json            # Q configuration (optional)

.ai-rules/
├── rules/
│   ├── core.md
│   ├── project.md
│   └── augmented-coding.md
├── agents/
│   └── *.json
└── adapters/
    └── q.md  # This guide
```

## Usage

### In Amazon Q Chat

```
You: Build a new API endpoint

Q: [Follows .ai-rules/rules/core.md workflow]
   [Applies .ai-rules/rules/augmented-coding.md TDD]
   [Uses .ai-rules/rules/project.md structure]
```

### Code Suggestions

Amazon Q will provide suggestions based on:
- Your project structure from `.ai-rules/rules/project.md`
- Code quality patterns from `.ai-rules/rules/augmented-coding.md`
- Language/framework idioms from specialist agents

## Benefits

- ✅ Consistent rules across all AI tools
- ✅ AWS-specific guidance when needed
- ✅ Security and cost optimization aligned with project standards
- ✅ Easy updates via `.ai-rules/`

## AWS-Specific Considerations

### When Using Q for AWS Services

Amazon Q excels at:
- AWS service integration (S3, Lambda, DynamoDB, etc.)
- Infrastructure as Code (CDK, CloudFormation)
- Security best practices for AWS

Combine Q's AWS expertise with project rules:
- Use `.ai-rules/agents/security-specialist.json` for general security
- Let Q provide AWS-specific security guidance
- Apply `.ai-rules/agents/devops-engineer.json` for deployment patterns

## AUTO Mode

AUTO mode enables autonomous PLAN -> ACT -> EVAL cycling until quality criteria are met.

### Triggering AUTO Mode

Use the `AUTO` keyword (or localized versions) at the start of your message:

| Language | Keyword |
|----------|---------|
| English | `AUTO` |
| Korean | `자동` |
| Japanese | `自動` |
| Chinese | `自动` |
| Spanish | `AUTOMATICO` |

### Example Usage

```
AUTO 새로운 Lambda 함수 만들어줘
```

### Workflow

1. **PLAN Phase**: Creates implementation plan with quality criteria
2. **ACT Phase**: Executes implementation following TDD workflow
3. **EVAL Phase**: Evaluates quality against exit criteria
4. **Loop/Exit**: Continues cycling until:
   - Success: `Critical = 0 AND High = 0`
   - Failure: Max iterations reached (default: 3)

### AWS Integration with AUTO Mode

Amazon Q's AWS expertise complements AUTO mode:
- Leverages Q's security scanning during EVAL phase
- Applies AWS best practices during ACT phase
- Uses Q's cost optimization suggestions in planning

### Configuration

Configure in `codingbuddy.config.js`:

```javascript
module.exports = {
  auto: {
    maxIterations: 3
  }
};
```

### When to Use

- Large feature implementations requiring multiple refinement cycles
- Complex refactoring with quality verification
- AWS service integrations needing thorough testing
- Infrastructure as Code development with validation cycles

## Maintenance

1. Update `.ai-rules/rules/*.md` for universal changes
2. Update `.q/rules/customizations.md` for Q-specific enhancements
3. Leverage Q's AWS knowledge alongside project standards
