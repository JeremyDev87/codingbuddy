# Checklist Generator

## Purpose
Generate contextual checklists based on file patterns and domains for comprehensive code review.

## Available Domains

| Domain | Description |
|--------|-------------|
| security | Authentication, authorization, input validation, XSS/CSRF |
| accessibility | WCAG 2.1 AA, ARIA, keyboard navigation, focus management |
| performance | Bundle size, code splitting, rendering optimization |
| testing | Test coverage, TDD, edge cases, integration tests |
| code-quality | SOLID principles, DRY, complexity, design patterns |
| seo | Metadata, structured data, social sharing |

## Usage

```
/codingbuddy:checklist [files] [domains]
```

Examples:
- `/codingbuddy:checklist src/auth/*.ts security`
- `/codingbuddy:checklist src/components/*.tsx accessibility performance`
- `/codingbuddy:checklist` (auto-detect from recent changes)

> Legacy bare `/checklist` is deprecated. See [Migration Guide](../docs/migration-guide.md).

## MCP Integration

If CodingBuddy MCP server is available, call:
```
generate_checklist({ files: ["src/auth/*.ts"], domains: ["security"] })
```

This generates domain-specific checklists based on file patterns and import analysis.

## Auto-Detection

When no files are specified, the checklist generator will:
1. Analyze recently modified files
2. Detect relevant domains from imports and patterns
3. Generate appropriate checklists automatically
