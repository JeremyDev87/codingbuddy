# Contributing to Codingbuddy

Thank you for your interest in contributing to Codingbuddy! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

Be respectful and inclusive. We welcome contributors of all backgrounds and experience levels.

## Getting Started

### Prerequisites

- Node.js v18+
- Yarn (via Corepack)

### Setup

```bash
# Clone the repository
git clone https://github.com/Codingbuddydev/codingbuddy.git
cd codingbuddy

# Install dependencies
cd mcp-server
yarn install

# Run tests to verify setup
yarn test

# Start development server
yarn start:dev
```

### Project Structure

```
codingbuddy/
├── .ai-rules/           # Shared AI coding rules
│   ├── rules/           # Core rules (markdown)
│   ├── agents/          # Specialist agent definitions (JSON)
│   └── adapters/        # Tool-specific integration guides
├── mcp-server/          # NestJS-based MCP server
│   └── src/
│       ├── mcp/         # MCP protocol handlers
│       ├── rules/       # Rules service
│       ├── config/      # Configuration loading
│       └── keyword/     # Keyword parsing
└── docs/                # Documentation
```

## Development Workflow

### 1. Find or Create an Issue

- Check [existing issues](https://github.com/Codingbuddydev/codingbuddy/issues)
- For new features, create an issue first to discuss the approach
- For bug fixes, you can proceed directly with a PR

### 2. Create a Branch

```bash
# Feature branch
git checkout -b feat/your-feature-name

# Bug fix branch
git checkout -b fix/bug-description

# Documentation
git checkout -b docs/what-you-are-documenting
```

### 3. Make Changes

- Follow the [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation if needed

### 4. Test Your Changes

```bash
cd mcp-server

# Run all checks
yarn lint          # ESLint
yarn format:check  # Prettier
yarn typecheck     # TypeScript
yarn test          # Unit tests
yarn test:coverage # Coverage (must be 80%+)
yarn circular      # Circular dependency check
yarn build         # Build verification
```

### 5. Submit a Pull Request

- Fill out the PR template completely
- Link related issues
- Request review from maintainers

## Coding Standards

### TypeScript

- **Strict mode**: No `any` types allowed
- **Type safety**: Use proper types for all parameters and return values
- **Naming conventions**:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions/variables: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Code Quality

- Follow SOLID principles
- Keep functions small and focused
- Separate pure and impure functions
- Aim for 80%+ test coverage

### Formatting

We use ESLint and Prettier for code formatting:

```bash
# Check formatting
yarn lint
yarn format:check

# Auto-fix
yarn lint:fix
yarn format
```

### Testing

- Use Vitest for testing
- Follow TDD when possible: Red → Green → Refactor
- Test file naming: `*.spec.ts`

```bash
# Run tests
yarn test

# Run with coverage
yarn test:coverage
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

### Examples

```bash
feat(mcp): add new search_rules tool
fix(config): handle missing config file gracefully
docs(readme): update installation instructions
refactor(rules): simplify rule parsing logic
test(mcp): add coverage for error cases
chore(deps): update dependencies
```

### Scope

Common scopes:
- `mcp` - MCP server functionality
- `rules` - Rules service
- `config` - Configuration
- `agents` - Agent definitions
- `docs` - Documentation
- `ci` - CI/CD

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`yarn test`)
- [ ] Code is formatted (`yarn format:check`)
- [ ] No linting errors (`yarn lint`)
- [ ] No type errors (`yarn typecheck`)
- [ ] Coverage meets threshold (`yarn test:coverage`)
- [ ] Documentation updated if needed

### PR Title

Follow the same format as commit messages:

```
feat(mcp): add new tool for agent activation
```

### PR Description

Include:
1. **Summary**: What does this PR do?
2. **Related Issues**: Link to related issues
3. **Testing**: How was this tested?
4. **Checklist**: Confirm all checks pass

### Review Process

1. Maintainers will review your PR
2. Address any feedback
3. Once approved, maintainers will merge

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Error messages or logs

### Feature Requests

Include:
- Problem you're trying to solve
- Proposed solution
- Alternative approaches considered
- Any additional context

## Questions?

- Open a [GitHub Discussion](https://github.com/Codingbuddydev/codingbuddy/discussions)
- Check existing issues and documentation

---

Thank you for contributing to Codingbuddy!
