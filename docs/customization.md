# Codingbuddy Customization Guide

This guide explains how to customize Codingbuddy for your project's specific needs.

## Table of Contents

- [Project Configuration](#project-configuration)
- [Customizing Rules](#customizing-rules)
- [Creating Custom Agents](#creating-custom-agents)
- [Version Upgrade Guide](#version-upgrade-guide)

## Project Configuration

### Quick Start

Generate a configuration file using AI analysis:

```bash
# Requires ANTHROPIC_API_KEY
npx codingbuddy init
```

This creates `codingbuddy.config.js` with settings based on your project.

### Manual Configuration

Create `codingbuddy.config.js` in your project root:

```javascript
module.exports = {
  // Response language (required)
  language: 'ko',  // 'ko', 'en', 'ja', 'zh', etc.

  // Project metadata
  projectName: 'my-awesome-app',
  description: 'A modern web application',

  // Technology stack
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js', 'Tailwind CSS'],
    backend: ['Node.js', 'Prisma'],
    database: ['PostgreSQL'],
    tools: ['ESLint', 'Prettier', 'Vitest'],
  },

  // Architecture pattern
  architecture: {
    pattern: 'feature-sliced-design',
    structure: ['app', 'widgets', 'features', 'entities', 'shared'],
  },

  // Coding conventions
  conventions: {
    style: 'airbnb',
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
      functions: 'camelCase',
    },
  },

  // Testing strategy
  testStrategy: {
    approach: 'tdd',
    frameworks: ['Vitest', 'Playwright'],
    coverage: 80,
  },
};
```

### Configuration Options

#### language

Response language for AI assistants.

| Value | Language |
|-------|----------|
| `ko` | Korean |
| `en` | English |
| `ja` | Japanese |
| `zh` | Chinese |

#### techStack

Define your project's technology stack:

```javascript
techStack: {
  languages: ['TypeScript', 'Python'],
  frontend: ['React', 'Next.js'],
  backend: ['FastAPI', 'PostgreSQL'],
  database: ['PostgreSQL', 'Redis'],
  tools: ['Docker', 'GitHub Actions'],
}
```

#### architecture

Define your architecture pattern:

```javascript
// Feature-Sliced Design
architecture: {
  pattern: 'feature-sliced-design',
  structure: ['app', 'widgets', 'features', 'entities', 'shared'],
}

// Clean Architecture
architecture: {
  pattern: 'clean-architecture',
  structure: ['presentation', 'application', 'domain', 'infrastructure'],
}

// Simple layers
architecture: {
  pattern: 'layered',
  structure: ['controllers', 'services', 'repositories', 'models'],
}
```

#### conventions

Define naming and style conventions:

```javascript
conventions: {
  style: 'airbnb',  // ESLint config preset
  naming: {
    files: 'kebab-case',       // my-component.tsx
    components: 'PascalCase',   // MyComponent
    functions: 'camelCase',     // myFunction
    constants: 'SCREAMING_SNAKE_CASE',  // MAX_RETRIES
  },
}
```

#### testStrategy

Define your testing approach:

```javascript
testStrategy: {
  approach: 'tdd',           // 'tdd' or 'test-after'
  frameworks: ['Vitest', 'Playwright'],
  coverage: 80,              // Target coverage percentage
}
```

### JSON Format

You can also use `codingbuddy.config.json`:

```json
{
  "language": "ko",
  "projectName": "my-app",
  "techStack": {
    "frontend": ["React", "Next.js"]
  }
}
```

---

## Customizing Rules

### Rule File Structure

```
packages/rules/.ai-rules/
├── rules/
│   ├── core.md              # Workflow rules (PLAN/ACT/EVAL)
│   ├── project.md           # Project-specific guidelines
│   └── augmented-coding.md  # TDD and coding practices
├── agents/                  # Agent definitions
└── adapters/                # Tool integrations
```

### Modifying Core Rules

Edit `packages/rules/.ai-rules/rules/core.md` to customize workflow:

```markdown
# Core Workflow Rules

## PLAN Mode
- Always start with understanding requirements
- Create detailed implementation plan
- Consider edge cases and error handling

## ACT Mode
- Follow TDD: Red → Green → Refactor
- Write clean, maintainable code
- Add proper documentation

## EVAL Mode
- Review code quality
- Check test coverage
- Verify performance and security
```

### Project-Specific Rules

Edit `packages/rules/.ai-rules/rules/project.md` for your project:

```markdown
# Project Rules

## Tech Stack
- React 18+ with Server Components
- Next.js 14+ App Router
- TypeScript strict mode

## Architecture
- Feature-Sliced Design pattern
- Server Components by default
- Server Actions for mutations

## Conventions
- Use `twJoin` for static classes
- Use design system components
- Korean comments and documentation
```

### Adding Custom Rules

Create new rule files in `packages/rules/.ai-rules/rules/`:

```markdown
# packages/rules/.ai-rules/rules/api-guidelines.md

# API Design Guidelines

## REST Endpoints
- Use plural nouns for resources
- Use HTTP methods appropriately
- Return consistent response formats

## Error Handling
- Use standard HTTP status codes
- Include error codes in responses
- Provide helpful error messages
```

Reference in your agents:

```json
{
  "context_files": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/api-guidelines.md"
  ]
}
```

---

## Creating Custom Agents

### Agent File Structure

Create JSON files in `packages/rules/.ai-rules/agents/`:

```json
{
  "name": "My Custom Agent",
  "description": "Description of what this agent does",

  "role": {
    "title": "Role Title",
    "expertise": [
      "Skill 1",
      "Skill 2"
    ],
    "responsibilities": [
      "Responsibility 1",
      "Responsibility 2"
    ]
  },

  "context_files": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/project.md"
  ],

  "workflow": {
    "core_logic": "TDD approach for business logic",
    "ui_components": "Test-after for UI"
  },

  "communication": {
    "language": "Korean (한국어)",
    "style": "Professional and helpful"
  }
}
```

### Example: Python Developer Agent

```json
{
  "name": "Python Developer",
  "description": "Python backend specialist with FastAPI, Django, and data science expertise",

  "role": {
    "title": "Senior Python Developer",
    "expertise": [
      "Python 3.10+",
      "FastAPI / Django",
      "SQLAlchemy / Alembic",
      "pytest",
      "Type hints",
      "async/await patterns"
    ],
    "responsibilities": [
      "Develop REST APIs following best practices",
      "Write comprehensive tests with pytest",
      "Maintain type safety with mypy",
      "Follow PEP 8 style guide"
    ]
  },

  "context_files": [
    "packages/rules/.ai-rules/rules/core.md",
    "packages/rules/.ai-rules/rules/project.md"
  ],

  "workflow": {
    "api_development": "Design API → Write tests → Implement → Refactor",
    "data_models": "Define schemas → Create migrations → Add validation"
  },

  "code_quality": {
    "linting": "flake8, black, isort",
    "type_checking": "mypy strict mode",
    "testing": "pytest with 90%+ coverage"
  },

  "communication": {
    "language": "Korean (한국어)"
  }
}
```

### Example: Mobile Developer Agent

```json
{
  "name": "Mobile Developer",
  "description": "React Native specialist with cross-platform expertise",

  "role": {
    "title": "Senior Mobile Developer",
    "expertise": [
      "React Native",
      "Expo",
      "TypeScript",
      "Native Modules",
      "App Store / Play Store deployment"
    ],
    "responsibilities": [
      "Build cross-platform mobile apps",
      "Optimize performance for mobile",
      "Handle platform-specific features",
      "Manage app store releases"
    ]
  },

  "context_files": [
    "packages/rules/.ai-rules/rules/core.md"
  ],

  "workflow": {
    "features": "Design → Test → Implement → Test on devices",
    "performance": "Profile → Identify bottlenecks → Optimize"
  },

  "communication": {
    "language": "Korean (한국어)"
  }
}
```

### Agent with Modes

For specialist agents, use the `modes` structure:

```json
{
  "name": "API Security Specialist",
  "description": "Security expert for API development",

  "role": {
    "title": "API Security Engineer",
    "expertise": ["OAuth 2.0", "JWT", "OWASP Top 10"]
  },

  "modes": {
    "planning": {
      "activation": {
        "trigger": "When planning API security",
        "mandatory_checklist": {
          "authentication": "Plan authentication method",
          "authorization": "Plan authorization rules"
        }
      }
    },
    "implementation": {
      "activation": {
        "trigger": "When implementing security features",
        "mandatory_checklist": {
          "input_validation": "Validate all inputs",
          "output_encoding": "Encode all outputs"
        }
      }
    },
    "evaluation": {
      "activation": {
        "trigger": "When reviewing security",
        "mandatory_checklist": {
          "vulnerability_scan": "Run security scan",
          "penetration_test": "Test for common attacks"
        }
      }
    }
  }
}
```

---

## Version Upgrade Guide

### Before Upgrading

1. **Backup your customizations**:
   ```bash
   cp -r .ai-rules .ai-rules.backup
   cp codingbuddy.config.js codingbuddy.config.js.backup
   ```

2. **Check release notes** for breaking changes

### Upgrade Steps

1. **Update package**:
   ```bash
   npm update codingbuddy
   # or
   yarn upgrade codingbuddy
   ```

2. **Compare default rules**:
   ```bash
   # Download new defaults
   npx codingbuddy init --force --output .ai-rules.new

   # Compare with your customizations
   diff -r .ai-rules .ai-rules.new
   ```

3. **Merge changes**:
   - Review new features in default rules
   - Add relevant updates to your custom rules
   - Keep your customizations

4. **Test**:
   ```bash
   # Verify MCP server works
   npx @modelcontextprotocol/inspector npx codingbuddy-mcp
   ```

### Upgrade Checklist

- [ ] Backup existing configuration
- [ ] Read release notes
- [ ] Update package
- [ ] Compare new defaults with customizations
- [ ] Merge useful changes
- [ ] Test with MCP Inspector
- [ ] Verify AI assistant integration

### Handling Breaking Changes

If a new version has breaking changes:

1. Check the migration guide in release notes
2. Update configuration schema if needed
3. Rename/move files as specified
4. Update agent references

---

## Best Practices

### Rule Customization

1. **Don't modify core principles** - Extend, don't replace
2. **Keep rules focused** - One concern per rule file
3. **Use consistent formatting** - Markdown with clear headings
4. **Reference project context** - Link to `project.md`

### Agent Customization

1. **Start from templates** - Copy existing agents
2. **Keep agents focused** - One role per agent
3. **Use context files** - Reference rules, don't duplicate
4. **Define clear workflows** - Step-by-step processes

### Configuration Management

1. **Version control** - Track `packages/rules/.ai-rules/` in git
2. **Document changes** - Add comments explaining customizations
3. **Team alignment** - Share configuration with team
4. **Regular updates** - Keep up with new features

---

## See Also

- [API Reference](./api.md)
- [Development Guide](./development.md)
- [Error Reference](./errors.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
