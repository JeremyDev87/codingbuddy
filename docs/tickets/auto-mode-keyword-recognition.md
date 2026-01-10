# AUTO Mode Keyword Not Recognized Across AI Tools

## Problem Statement

When users attempt to use AUTO mode with the keyword `AUTO:` (e.g., `AUTO: Build a new payment feature`), the AI tools fail to recognize it as a valid workflow mode keyword.

## Expected Behavior

- User types `AUTO: <task description>`
- AI tool recognizes `AUTO` as a workflow mode keyword
- `parse_mode` MCP tool is called automatically
- AI enters AUTO mode and cycles through PLAN → ACT → EVAL phases autonomously

## Actual Behavior

- User types `AUTO: <task description>`
- AI tool does NOT recognize `AUTO` as a keyword
- `parse_mode` MCP tool is NOT called
- AI treats the message as a regular prompt, ignoring the AUTO mode intent

## Root Cause Analysis

The AUTO keyword was missing from the mandatory keyword detection lists in AI tool configuration files. While the MCP server's `parse_mode` tool correctly supports AUTO mode, the AI tool configurations only listed `PLAN`, `ACT`, and `EVAL` as recognized keywords.

### Affected Files

| AI Tool | Configuration File | Issue |
|---------|-------------------|-------|
| Claude Code | `.claude/rules/custom-instructions.md` | AUTO missing from keyword list |
| Cursor | `.cursor/rules/*.mdc` | AUTO missing from keyword detection |
| Antigravity | `.antigravity/rules/instructions.md` | AUTO missing from workflow modes |
| Codex | `.codex/rules/system-prompt.md` | AUTO missing from mode documentation |
| Amazon Q | `.q/rules/customizations.md` | AUTO missing from keyword list |
| Kiro | `.kiro/rules/guidelines.md` | AUTO missing from keyword list |

### Test Coverage Gap

The `rule-filter.spec.ts` test file lacked test cases for AUTO mode filtering behavior, making this gap harder to detect during development.

## Impact

- Users cannot use AUTO mode despite it being a documented feature
- Autonomous workflow (PLAN → ACT → EVAL cycling) is inaccessible
- Inconsistent behavior across AI tools
- User frustration when documented features don't work

## Acceptance Criteria

1. All AI tool configuration files include AUTO in keyword detection
2. Localized variants (자동, 自動, 自动, AUTOMÁTICO) are also recognized
3. Test coverage exists for AUTO mode filtering behavior
4. Code documentation explains AUTO mode design decisions

## Priority

**High** - Core feature broken, affects user workflow

## Labels

- `bug`
- `documentation`
- `ai-tools`
- `workflow`
