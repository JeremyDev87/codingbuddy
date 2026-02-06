# CodingBuddy Configuration Schema

This document describes the configuration schema for CodingBuddy. The configuration file provides project context to AI assistants without overriding `.ai-rules`.

## Quick Start

Create a `codingbuddy.config.json` file in your project root:

```json
{
  "language": "ko",
  "projectName": "my-awesome-app",
  "techStack": {
    "frontend": ["React", "TypeScript"],
    "backend": ["NestJS"]
  }
}
```

## Configuration File Formats

CodingBuddy supports only JSON configuration format:

1. `codingbuddy.config.json` - JSON (only supported format)

## Schema Reference

### Basic Settings

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `language` | `string` | Response language for AI | `'ko'`, `'en'`, `'ja'` |
| `projectName` | `string` | Project name | `'my-app'` |
| `description` | `string` | Project description | `'E-commerce platform'` |
| `repository` | `string` | Repository URL | `'https://github.com/...'` |

### Tech Stack (`techStack`)

Configure your project's technology stack:

```json
{
  "techStack": {
    "languages": ["TypeScript", "Python"],
    "frontend": ["React", "Next.js", "Tailwind CSS"],
    "backend": ["NestJS", "Express"],
    "database": ["PostgreSQL", "Redis"],
    "infrastructure": ["Docker", "AWS", "Kubernetes"],
    "tools": ["ESLint", "Prettier", "Husky"],
    "details": {
      "TypeScript": {
        "version": "5.x",
        "notes": "Strict mode enabled"
      }
    }
  }
}
```

> `details` is optional and provides deeper information about specific technologies.

| Field | Type | Description |
|-------|------|-------------|
| `languages` | `string[]` | Programming languages |
| `frontend` | `string[]` | Frontend frameworks/libraries |
| `backend` | `string[]` | Backend frameworks/libraries |
| `database` | `string[]` | Databases and data stores |
| `infrastructure` | `string[]` | Infrastructure/DevOps tools |
| `tools` | `string[]` | Development tools |
| `details` | `Record<string, TechDetail>` | (Deep) Detailed tech info |

### Architecture (`architecture`)

Define your project's architecture:

```json
{
  "architecture": {
    "pattern": "feature-sliced",
    "structure": ["src/", "app/", "features/", "entities/", "shared/"],
    "componentStyle": "feature-based",
    "layers": [
      { "name": "app", "path": "src/app", "description": "Application layer" },
      { "name": "features", "path": "src/features", "dependencies": ["entities", "shared"] }
    ]
  }
}
```

> `layers` is optional and provides detailed layer definitions with dependency information.

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | `string` | Architecture pattern (`'layered'`, `'hexagonal'`, `'clean'`, `'feature-sliced'`, etc.) |
| `structure` | `string[]` | Key directory paths |
| `componentStyle` | `string` | Component organization (`'flat'`, `'grouped'`, `'feature-based'`) |
| `layers` | `ArchitectureLayer[]` | (Deep) Layer definitions |

### Conventions (`conventions`)

Specify coding conventions:

```json
{
  "conventions": {
    "style": "airbnb",
    "naming": {
      "files": "kebab-case",
      "components": "PascalCase",
      "functions": "camelCase",
      "variables": "camelCase",
      "constants": "UPPER_SNAKE_CASE"
    },
    "importOrder": ["react", "@/", "~/", "."],
    "maxLineLength": 100,
    "semicolons": true,
    "quotes": "single",
    "rules": {
      "no-console": "warn"
    }
  }
}
```

> `rules` is optional and allows custom linting rule overrides.

| Field | Type | Description |
|-------|------|-------------|
| `style` | `string` | Style guide (`'airbnb'`, `'google'`, `'standard'`, `'prettier'`) |
| `naming` | `NamingConvention` | Naming convention rules |
| `importOrder` | `string[]` | Import ordering preference |
| `maxLineLength` | `number` | Maximum line length |
| `semicolons` | `boolean` | Use semicolons |
| `quotes` | `string` | Quote style (`'single'`, `'double'`) |
| `rules` | `Record<string, unknown>` | (Deep) Custom linting rules |

### Test Strategy (`testStrategy`)

Configure testing approach:

```json
{
  "testStrategy": {
    "approach": "tdd",
    "frameworks": ["vitest", "playwright"],
    "coverage": 80,
    "unitTestPattern": "colocated",
    "e2eDirectory": "e2e/",
    "mockingStrategy": "minimal"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `approach` | `string` | Testing approach (`'tdd'`, `'bdd'`, `'test-after'`, `'mixed'`) |
| `frameworks` | `string[]` | Test frameworks |
| `coverage` | `number` | Target coverage percentage (0-100) |
| `unitTestPattern` | `string` | Unit test location (`'colocated'`, `'separate'`) |
| `e2eDirectory` | `string` | E2E test directory |
| `mockingStrategy` | `string` | Mocking approach (`'minimal'`, `'extensive'`, `'no-mocks'`) |

### AI Configuration (`ai`)

Configure AI model settings:

```json
{
  "ai": {
    "defaultModel": "claude-sonnet-4-20250514"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `defaultModel` | `string` | Default Claude model for AI operations. Available options: `claude-sonnet-4-20250514` (recommended, balanced), `claude-opus-4-20250514` (most capable), `claude-haiku-3-5-20241022` (fastest, not recommended) |

**Model Selection During Init:**

When running `npx codingbuddy init`, you'll be prompted to select a default model:

- **Claude Sonnet 4** (Recommended) - Balanced performance and cost
- **Claude Opus 4** - Most capable, best for complex tasks
- **Claude Haiku 3.5** - Fastest, most cost-effective (not recommended for coding tasks)

### Additional Context

```json
{
  "keyFiles": [
    "src/core/types.ts",
    "docs/architecture.md",
    "CONTRIBUTING.md"
  ],
  "avoid": [
    "legacy-api",
    "deprecated-module"
  ],
  "custom": {
    "team": "Platform Team",
    "domain": "E-commerce"
  }
}
```

- `keyFiles`: Key files AI should be aware of
- `avoid`: Topics or areas to avoid
- `custom`: Custom freeform context

## Complete Example

```json
{
  "language": "ko",
  "projectName": "wishket-platform",
  "description": "Freelancer marketplace platform",
  "repository": "https://github.com/example/wishket-platform",
  "techStack": {
    "languages": ["TypeScript"],
    "frontend": ["React", "Next.js", "Tailwind CSS", "React Query"],
    "backend": ["NestJS", "TypeORM"],
    "database": ["PostgreSQL", "Redis"],
    "infrastructure": ["Docker", "AWS ECS", "GitHub Actions"]
  },
  "architecture": {
    "pattern": "feature-sliced",
    "structure": ["src/app", "src/features", "src/entities", "src/shared"],
    "componentStyle": "feature-based"
  },
  "conventions": {
    "style": "airbnb",
    "naming": {
      "files": "kebab-case",
      "components": "PascalCase",
      "functions": "camelCase"
    },
    "quotes": "single",
    "semicolons": true
  },
  "testStrategy": {
    "approach": "tdd",
    "frameworks": ["vitest", "playwright"],
    "coverage": 80,
    "unitTestPattern": "colocated",
    "mockingStrategy": "minimal"
  },
  "ai": {
    "defaultModel": "claude-sonnet-4-20250514"
  },
  "keyFiles": ["src/shared/types/index.ts", "docs/api.md"],
  "avoid": ["legacy-v1-api"]
}
```

## TypeScript Types

You can use TypeScript types for IDE autocomplete when authoring your JSON config:

```typescript
import type { CodingBuddyConfig } from 'codingbuddy/config';

// Use this type to validate your codingbuddy.config.json structure
type Config = CodingBuddyConfig;
```

## Validation

The configuration is validated at runtime using Zod schemas. Invalid configurations will produce clear error messages:

```
Error: Invalid configuration
  - techStack.coverage: Expected number, received string
  - conventions.quotes: Invalid enum value. Expected 'single' | 'double'
```

## Notes

- **All fields are optional** - start with what you need
- **No rule override** - this config provides context only; `.ai-rules` rules remain unchanged
- **AI context only** - this information helps AI understand your project better
