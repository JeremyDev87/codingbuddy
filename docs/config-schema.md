# CodingBuddy Configuration Schema

This document describes the configuration schema for CodingBuddy. The configuration file provides project context to AI assistants without overriding `.ai-rules`.

## Quick Start

Create a `codingbuddy.config.js` file in your project root:

```javascript
module.exports = {
  language: 'ko',
  projectName: 'my-awesome-app',
  techStack: {
    frontend: ['React', 'TypeScript'],
    backend: ['NestJS'],
  },
};
```

## Configuration File Formats

CodingBuddy supports multiple configuration file formats (in priority order):

1. `codingbuddy.config.js` - JavaScript (recommended, supports dynamic values)
2. `codingbuddy.config.json` - JSON
3. `.codingbuddyrc` - RC file format

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

```javascript
techStack: {
  // Basic (Nested)
  languages: ['TypeScript', 'Python'],
  frontend: ['React', 'Next.js', 'Tailwind CSS'],
  backend: ['NestJS', 'Express'],
  database: ['PostgreSQL', 'Redis'],
  infrastructure: ['Docker', 'AWS', 'Kubernetes'],
  tools: ['ESLint', 'Prettier', 'Husky'],

  // Deep (Optional) - detailed tech info
  details: {
    'TypeScript': {
      version: '5.x',
      notes: 'Strict mode enabled'
    }
  }
}
```

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

```javascript
architecture: {
  // Basic (Nested)
  pattern: 'feature-sliced',
  structure: ['src/', 'app/', 'features/', 'entities/', 'shared/'],
  componentStyle: 'feature-based',

  // Deep (Optional) - layer definitions
  layers: [
    { name: 'app', path: 'src/app', description: 'Application layer' },
    { name: 'features', path: 'src/features', dependencies: ['entities', 'shared'] }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | `string` | Architecture pattern (`'layered'`, `'hexagonal'`, `'clean'`, `'feature-sliced'`, etc.) |
| `structure` | `string[]` | Key directory paths |
| `componentStyle` | `string` | Component organization (`'flat'`, `'grouped'`, `'feature-based'`) |
| `layers` | `ArchitectureLayer[]` | (Deep) Layer definitions |

### Conventions (`conventions`)

Specify coding conventions:

```javascript
conventions: {
  // Basic (Nested)
  style: 'airbnb',
  naming: {
    files: 'kebab-case',
    components: 'PascalCase',
    functions: 'camelCase',
    variables: 'camelCase',
    constants: 'UPPER_SNAKE_CASE'
  },
  importOrder: ['react', '@/', '~/', '.'],
  maxLineLength: 100,
  semicolons: true,
  quotes: 'single',

  // Deep (Optional) - custom rules
  rules: {
    'no-console': 'warn'
  }
}
```

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

```javascript
testStrategy: {
  approach: 'tdd',
  frameworks: ['vitest', 'playwright'],
  coverage: 80,
  unitTestPattern: 'colocated',
  e2eDirectory: 'e2e/',
  mockingStrategy: 'minimal'
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

```javascript
ai: {
  defaultModel: 'claude-sonnet-4-20250514',
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

```javascript
// Key files AI should be aware of
keyFiles: [
  'src/core/types.ts',
  'docs/architecture.md',
  'CONTRIBUTING.md'
],

// Topics or areas to avoid
avoid: [
  'legacy-api',
  'deprecated-module'
],

// Custom freeform context
custom: {
  team: 'Platform Team',
  domain: 'E-commerce'
}
```

## Complete Example

```javascript
// codingbuddy.config.js
module.exports = {
  // Basic
  language: 'ko',
  projectName: 'wishket-platform',
  description: 'Freelancer marketplace platform',
  repository: 'https://github.com/example/wishket-platform',

  // Tech Stack
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js', 'Tailwind CSS', 'React Query'],
    backend: ['NestJS', 'TypeORM'],
    database: ['PostgreSQL', 'Redis'],
    infrastructure: ['Docker', 'AWS ECS', 'GitHub Actions'],
  },

  // Architecture
  architecture: {
    pattern: 'feature-sliced',
    structure: ['src/app', 'src/features', 'src/entities', 'src/shared'],
    componentStyle: 'feature-based',
  },

  // Conventions
  conventions: {
    style: 'airbnb',
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
      functions: 'camelCase',
    },
    quotes: 'single',
    semicolons: true,
  },

  // Test Strategy
  testStrategy: {
    approach: 'tdd',
    frameworks: ['vitest', 'playwright'],
    coverage: 80,
    unitTestPattern: 'colocated',
    mockingStrategy: 'minimal',
  },

  // AI Configuration
  ai: {
    defaultModel: 'claude-sonnet-4-20250514',
  },

  // Additional
  keyFiles: ['src/shared/types/index.ts', 'docs/api.md'],
  avoid: ['legacy-v1-api'],
};
```

## TypeScript Types

Import types for type-safe configuration:

```typescript
import type { CodingBuddyConfig } from 'codingbuddy/config';

const config: CodingBuddyConfig = {
  language: 'en',
  // ... IDE autocomplete works here
};

module.exports = config;
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
