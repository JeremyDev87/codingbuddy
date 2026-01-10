# PR: Add AUTO Mode Documentation Across All AI Tool Configurations

## Summary

This PR fixes the AUTO mode keyword recognition issue by updating all AI tool configuration files to include AUTO as a recognized workflow mode keyword, along with its localized variants.

## Problem

Users attempting to use AUTO mode (`AUTO: <task>`) found that AI tools did not recognize the keyword and failed to trigger the autonomous workflow cycle. The root cause was that AUTO was missing from the keyword detection rules in all AI tool configuration files.

## Solution

### 1. Updated AI Tool Configuration Files (7 files)

Added AUTO mode to keyword detection in all tool-specific configuration files:

| File | Changes |
|------|---------|
| `.antigravity/rules/instructions.md` | Added AUTO to workflow modes and keyword detection |
| `.claude/rules/custom-instructions.md` | Added AUTO to mandatory keyword list with localized variants |
| `.codex/rules/system-prompt.md` | Added AUTO to mode documentation |
| `.cursor/rules/auto-agent.mdc` | Added AUTO and localized variants (자동, 自動, 自动, AUTOMÁTICO) |
| `.cursor/rules/imports.mdc` | Added AUTO to workflow and required actions |
| `.kiro/rules/guidelines.md` | Added AUTO to keyword detection |
| `.q/rules/customizations.md` | Added AUTO to keyword detection |

### 2. Added Test Coverage

Added 3 new test cases to `apps/mcp-server/src/keyword/rule-filter.spec.ts`:

```typescript
it('should return full content for AUTO mode (no filtering)')
it('should not add filtered view note for AUTO mode')
it('should preserve full content length for AUTO mode')
```

Also updated the sample test data (`SAMPLE_CORE_MD`) to include an Auto Mode section.

### 3. Added Code Documentation

Added comprehensive JSDoc comments to `apps/mcp-server/src/keyword/rule-filter.ts` explaining the AUTO mode design decision:

- Why AUTO mode uses `null` markers (no filtering)
- Rationale: AUTO mode cycles through all phases and needs access to all mode documentation

### 4. Updated Adapter Documentation

Updated `packages/rules/.ai-rules/adapters/antigravity.md` with AUTO mode section including:
- Triggering AUTO mode
- Localized keyword variants
- Example usage
- Workflow explanation

## Files Changed

```
 .antigravity/rules/instructions.md                 |  9 +++--
 .claude/rules/custom-instructions.md               | 13 +++++--
 .codex/rules/system-prompt.md                      |  7 +++-
 .cursor/rules/auto-agent.mdc                       |  2 +-
 .cursor/rules/imports.mdc                          |  3 +-
 .kiro/rules/guidelines.md                          |  5 ++-
 .q/rules/customizations.md                         |  5 ++-
 apps/mcp-server/src/keyword/rule-filter.spec.ts    | 45 +++++++++++++++++++++-
 apps/mcp-server/src/keyword/rule-filter.ts         | 16 +++++++-
 docs/plans/2025-12-17-codex-adapter-configuration.md |  4 +-
 packages/rules/.ai-rules/adapters/antigravity.md   |  8 ++--
 11 files changed, 94 insertions(+), 23 deletions(-)
```

## Testing

### Automated Tests
- ✅ All 15 rule-filter tests passing
- ✅ 3 new AUTO mode tests added and passing

### Manual Verification
- Verified AUTO keyword in all configuration files
- Verified localized variants included where applicable
- Verified documentation consistency across adapters

## Checklist

- [x] All AI tool configs updated with AUTO keyword
- [x] Localized variants included (자동, 自動, 自动, AUTOMÁTICO)
- [x] Test coverage added for AUTO mode filtering
- [x] Code documentation added explaining design decisions
- [x] Adapter documentation updated
- [x] All tests passing

## Related

- Fixes: AUTO mode keyword not recognized
- Related to: Keyword Invocation feature
- Affects: All AI tool integrations (Claude Code, Cursor, Antigravity, Codex, Q, Kiro)
