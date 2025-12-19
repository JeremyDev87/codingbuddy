# REFACTOR-001 Implementation Plan

## Analysis Summary

### Issue 1: File Reading Pattern Duplication

**Originally estimated**: 3 locations
**Actually found**: 6 locations (+ 3 additional in config.analyzer.ts)

| Module | Pattern | Return on Error |
|--------|---------|-----------------|
| ignore.parser.ts | readFile → catch → return empty | `{ patterns: [], source: null }` |
| context.loader.ts (loadContextFile) | readFile → catch → return null | `null` |
| context.loader.ts (getAllFiles) | readdir → catch → skip | (continues) |
| code.sampler.ts | stat + readFile → catch → skip | (continues) |
| package.analyzer.ts | readFile → catch → return null | `null` |
| config.analyzer.ts | readFile → catch → skip (×3) | (continues) |

**Key observation**: None check for ENOENT specifically. All use bare `catch` blocks.

### Issue 2: Path Matching Logic Duplication

| Pattern Type | Location | Approach |
|--------------|----------|----------|
| Path separator handling | code.sampler.ts | Check both `/` and `\` manually |
| Path separator handling | ignore.parser.ts | Normalize `\` to `/` upfront |
| Wildcard matching | config.analyzer.ts | Simple `*` → `.*` regex |
| Glob pattern matching | ignore.parser.ts | Full gitignore-style (**, !, anchors) |
| Directory in path check | code.sampler.ts | Custom `pathContainsDir()` helper |
| Directory in path check | directory.analyzer.ts | Inline string checks |

---

## Implementation Plan

### Phase 1: Create Shared File Utilities

**Goal**: Consolidate file reading patterns into reusable utilities

**New module**: `src/shared/file.utils.ts`

**Functions to create**:

1. `safeReadFile(path): Promise<string | null>`
   - Returns file content or null if not found
   - Throws on permission/other errors

2. `safeReadFileWithFallback<T>(path, fallback): Promise<T>`
   - Returns parsed content or fallback value
   - Useful for config files with default empty objects

3. `tryReadFile(path): Promise<string | undefined>`
   - Silent failure variant for skip-on-error patterns

**Refactoring targets** (6 files):
- `src/config/ignore.parser.ts`
- `src/config/context.loader.ts`
- `src/analyzer/code.sampler.ts`
- `src/analyzer/package.analyzer.ts`
- `src/analyzer/config.analyzer.ts`

### Phase 2: Create Shared Path Utilities

**Goal**: Unify path matching approaches

**New module**: `src/shared/path.utils.ts`

**Functions to create**:

1. `normalizePath(path): string`
   - Converts all `\` to `/`
   - Single source of truth for path normalization

2. `pathContainsSegment(path, segment): boolean`
   - Checks if path contains a directory segment
   - Replaces manual `/dir/` and `\dir\` checks

3. `matchesGlobPattern(path, pattern): boolean`
   - Wrapper around existing `patternToRegex` in ignore.parser.ts
   - Reusable for config.analyzer.ts wildcard matching

**Refactoring targets** (3 files):
- `src/analyzer/code.sampler.ts`
- `src/analyzer/config.analyzer.ts`
- `src/analyzer/directory.analyzer.ts`

---

## Execution Order

```
Step 1: Create src/shared/file.utils.ts + tests
        ↓
Step 2: Refactor config/ modules to use file.utils
        ↓
Step 3: Refactor analyzer/ modules to use file.utils
        ↓
Step 4: Create src/shared/path.utils.ts + tests
        ↓
Step 5: Refactor analyzer/ modules to use path.utils
        ↓
Step 6: Run full test suite, verify 269+ tests pass
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking error handling behavior | Keep same return types (null, empty object, skip) |
| Missing edge cases | Existing tests cover current behavior |
| Import cycle | shared/ has no dependencies on config/ or analyzer/ |

---

## Success Metrics

- [ ] `safeReadFile` pattern used in all 6 locations
- [ ] `normalizePath` used consistently for path operations
- [ ] No duplicate file reading try-catch blocks remain
- [ ] No duplicate path separator handling remains
- [ ] All 269 existing tests pass
- [ ] New utility functions have dedicated test coverage

---

## Estimated Scope

| Item | Count |
|------|-------|
| New files | 4 (2 utils + 2 spec files) |
| Modified files | 6 |
| New functions | 5-6 |
| Risk level | Low |
