---
name: documentation-generation
description: Use when creating or updating README, API docs, architecture docs, or CHANGELOG. Generates clear, accurate documentation from code structure and context.
---

# Documentation Generation

## Overview

Good documentation is the gift you give your future self and your team. It is NOT optional.

**Core principle:** Documentation describes behavior, not code. If the code changes, update the docs.

**Iron Law:**
```
DOCS ARE OUTDATED THE MOMENT THEY ARE WRITTEN — AUTOMATE OR ACCEPT THE DEBT
```

## When to Use

- Creating a new project README
- Documenting new API endpoints
- Generating CHANGELOG entries
- Writing architecture decision records (ADRs)
- Creating onboarding guides for new team members
- Documenting AI rules for multi-tool projects

## Document Types & Templates

### 1. README.md

A good README answers: What is this? How do I run it? How do I use it?

```markdown
# Project Name

One-sentence description of what this does and who it's for.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- Feature 1: Brief description
- Feature 2: Brief description

## Installation

\`\`\`bash
# Prerequisites
node >= 18
npm >= 9

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your values

# Run
npm start
\`\`\`

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |

## API Reference

See [API Documentation](./docs/api.md) for full reference.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
```

### 2. API Documentation

````markdown
# API Reference

## Authentication

All endpoints require Bearer token:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints

### GET /users

List all users.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Per-page count (default: 20, max: 100) |

**Response:**
\`\`\`json
{
  "data": [{ "id": "123", "email": "user@example.com" }],
  "meta": { "total": 42, "page": 1 }
}
\`\`\`

**Errors:**
| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
````

### 3. Architecture Decision Record (ADR)

```markdown
# ADR-001: Use NestJS for MCP Server

**Date:** 2024-01-15
**Status:** Accepted

## Context

We need a Node.js framework for the MCP server with dependency injection and testability.

## Decision

Use NestJS with TypeScript.

## Rationale

- Built-in dependency injection for testable code
- Decorator-based approach matches MCP patterns
- Strong TypeScript support
- Module system aligns with MCP's separation of concerns

## Consequences

- Higher initial complexity than Express
- Requires understanding of NestJS modules
- Excellent testing support out of the box
```

### 4. CHANGELOG

Follow [Keep a Changelog](https://keepachangelog.com) format:

```markdown
# Changelog

## [Unreleased]

### Added
- New feature X

## [1.2.0] - 2024-01-15

### Added
- Support for SSE transport mode
- Bearer token authentication for SSE

### Changed
- Improved error messages for invalid rules

### Fixed
- Memory leak in rule file watcher

### Security
- Fixed token exposure in debug logs

## [1.1.0] - 2024-01-01
...
```

## Generation Process

### Step 1: Gather Context

```bash
# Understand the project structure
ls -la
cat package.json
git log --oneline -20   # Recent changes for CHANGELOG

# Find existing documentation
find . -name "*.md" -not -path "*/node_modules/*"
```

### Step 2: Extract Information from Code

For TypeScript projects, extract JSDoc/TSDoc:
```typescript
/**
 * Search rules by query string.
 * @param query - Search term to match against rule content
 * @param options - Optional filters
 * @returns Matching rules sorted by relevance
 */
async searchRules(query: string, options?: SearchOptions): Promise<Rule[]>
```

For configuration:
```typescript
// Extract environment variables
grep -rn "process.env\." src/ | grep -o "process\.env\.[A-Z_]*" | sort -u
```

### Step 3: Write Documentation

**Principles:**
- **Show, don't just tell** — Include working examples for every major feature
- **Start with Why** — First sentence explains purpose, not mechanism
- **One job per section** — Each section answers one question
- **Concrete over abstract** — Specific examples beat generic descriptions

### Step 4: Verify Accuracy

```
- [ ] All code examples are runnable
- [ ] Environment variables list matches .env.example
- [ ] API endpoints match actual routes
- [ ] Prerequisites match actual requirements
- [ ] Links are not broken
```

## Documentation Checklist by Type

### README
- [ ] One-line description at top
- [ ] Quick Start (< 5 steps to run)
- [ ] Configuration table (all env vars)
- [ ] At least one working code example
- [ ] Link to full docs / contributing guide

### API Docs
- [ ] Authentication documented
- [ ] All endpoints listed
- [ ] Request/response examples for each
- [ ] Error codes documented
- [ ] Rate limits documented

### CHANGELOG
- [ ] Follows semver (MAJOR.MINOR.PATCH)
- [ ] Added / Changed / Deprecated / Removed / Fixed / Security sections
- [ ] Each entry links to issue/PR
- [ ] Unreleased section at top

### ADR
- [ ] Context explains why decision was needed
- [ ] Alternatives considered
- [ ] Decision and rationale clear
- [ ] Consequences (positive and negative) listed

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Documenting code, not behavior | Describe what it does, not how |
| Outdated examples | Add docs to definition of done |
| No quick start | First 5 minutes → working system |
| Wall of text | Use tables, code blocks, lists |
| Missing error docs | Document failure modes |
| Internal jargon | Write for a new team member |

## Tools to Accelerate

```bash
# TypeScript → API docs
npx typedoc --out docs/api src/

# Markdown linting
npx markdownlint-cli "**/*.md"

# Link checking
npx markdown-link-check README.md

# CHANGELOG generation from git log
npx conventional-changelog-cli -p angular
```
