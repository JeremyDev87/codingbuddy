---
name: test-coverage-gate
description: >-
  Use before shipping, creating PRs, or merging to enforce minimum test coverage thresholds.
  Covers line, branch, and function coverage. Supports vitest, jest, c8, and istanbul.
  Blocks shipping when coverage falls below configurable thresholds (default 80%).
disable-model-invocation: true
argument-hint: "[--threshold=N] [--type=line|branch|function|all]"
---

# Test Coverage Gate

## Overview

Untested code is unverified code. Shipping without coverage data is shipping blind.

This skill enforces minimum test coverage thresholds before code leaves your machine. It detects your coverage tool, runs the analysis, compares results against thresholds, and blocks shipping if coverage is insufficient.

**Core principle:** No code ships without meeting coverage thresholds. Period.

**Iron Law:**
```
NO SHIP WITHOUT COVERAGE GATE PASSING
If coverage is below threshold, the PR does not get created.
```

## When to Use

**Always, before:**
- Running `/ship` to create a PR
- Merging feature branches
- Tagging releases
- Deploying to staging or production

**Especially when:**
- Adding new features (new code must be tested)
- Refactoring (coverage must not drop)
- Fixing bugs (regression test required)
- Touching critical paths (auth, payments, data processing)

**Skip only when:**
- Documentation-only changes (no source code modified)
- Configuration file changes (non-code)
- Generated code explicitly excluded from coverage

## Configuration

### Default Thresholds

```
Line Coverage:     80%
Branch Coverage:   80%
Function Coverage: 80%
```

### Custom Thresholds

Override defaults per project via `codingbuddy.config.json`, `package.json`, or tool-native config:

```jsonc
// codingbuddy.config.json
{
  "coverage": {
    "thresholds": {
      "lines": 80,
      "branches": 80,
      "functions": 80
    },
    "tool": "auto",        // "vitest" | "jest" | "c8" | "istanbul" | "auto"
    "excludePatterns": [
      "**/*.config.*",
      "**/generated/**",
      "**/migrations/**"
    ]
  }
}
```

```jsonc
// package.json (alternative)
{
  "coverageGate": {
    "lines": 80,
    "branches": 80,
    "functions": 80
  }
}
```

### Per-Tool Native Config

If thresholds are already defined in your test tool's config, the gate respects them:

| Tool | Config Location |
|------|----------------|
| Vitest | `vitest.config.ts` → `test.coverage.thresholds` |
| Jest | `jest.config.ts` → `coverageThreshold.global` |
| c8 | `.c8rc.json` or `package.json` → `c8` |
| Istanbul/nyc | `.nycrc` or `package.json` → `nyc` |

**Priority order:** CLI flags > `codingbuddy.config.json` > tool-native config > defaults (80%)

## Supported Tools

### Auto-Detection

The gate detects your coverage tool automatically:

```
1. Check package.json devDependencies:
   - @vitest/coverage-v8 or @vitest/coverage-istanbul → vitest
   - jest + jest coverage config → jest
   - c8 → c8
   - nyc or istanbul → istanbul
2. Check for tool-specific config files:
   - vitest.config.ts → vitest
   - jest.config.ts → jest
   - .c8rc.json → c8
   - .nycrc → istanbul
3. Fallback: prompt user to specify tool
```

### Tool Commands

| Tool | Coverage Command |
|------|-----------------|
| **Vitest** | `npx vitest run --coverage --reporter=json` |
| **Jest** | `npx jest --coverage --coverageReporters=json-summary` |
| **c8** | `npx c8 --reporter=json-summary npm test` |
| **Istanbul/nyc** | `npx nyc --reporter=json-summary npm test` |

## Workflow

### Phase 1: Detect Coverage Tool

```
- [ ] Scan package.json devDependencies for coverage packages
- [ ] Check for tool-specific config files
- [ ] Resolve coverage tool (or prompt if ambiguous)
- [ ] Verify coverage tool is installed
```

If the tool is not installed:
```bash
# Suggest installation
echo "Coverage tool not found. Install with:"
echo "  yarn add -D @vitest/coverage-v8   # for vitest"
echo "  yarn add -D jest                   # for jest"
echo "  yarn add -D c8                     # for c8"
echo "  yarn add -D nyc                    # for istanbul/nyc"
```

### Phase 2: Run Coverage Analysis

```
- [ ] Execute coverage command for detected tool
- [ ] Capture JSON coverage output
- [ ] Parse coverage summary (lines, branches, functions)
```

**Expected output format (json-summary):**
```json
{
  "total": {
    "lines": { "total": 500, "covered": 420, "pct": 84.0 },
    "branches": { "total": 120, "covered": 96, "pct": 80.0 },
    "functions": { "total": 80, "covered": 68, "pct": 85.0 }
  }
}
```

### Phase 3: Compare Against Thresholds

```
- [ ] Load thresholds (CLI > config > tool-native > defaults)
- [ ] Compare each metric against its threshold
- [ ] Classify result: PASS or FAIL per metric
```

**Comparison logic:**
```
For each metric in [lines, branches, functions]:
  actual = coverage_report.total[metric].pct
  threshold = resolved_thresholds[metric]
  result = actual >= threshold ? PASS : FAIL
```

### Phase 4: Gate Decision

#### PASS — All metrics meet thresholds

```
Coverage Gate: PASS

  Lines:     84.0% >= 80% ✅
  Branches:  80.0% >= 80% ✅
  Functions: 85.0% >= 80% ✅

Proceed with shipping.
```

#### FAIL — One or more metrics below threshold

```
Coverage Gate: FAIL ❌

  Lines:     84.0% >= 80% ✅
  Branches:  72.0% >= 80% ❌ (-8.0%)
  Functions: 85.0% >= 80% ✅

BLOCKED: Coverage below threshold.

Uncovered areas requiring attention:
  - src/auth/oauth.ts: branches 45% (missing: error paths lines 23-31, 55-60)
  - src/utils/parser.ts: branches 60% (missing: edge cases lines 88-95)

Action required:
  1. Add tests for uncovered branches listed above
  2. Re-run coverage gate
  3. Ship only after all metrics pass
```

**On failure:**
- Block `/ship` from creating the PR
- List specific files and lines with low coverage
- Suggest which tests to write
- Never allow override without explicit `--skip-coverage` flag

## Integration with /ship

### Pre-Ship Hook

The coverage gate runs **before** any PR creation step in `/ship`:

```
/ship workflow:
  1. Lint check
  2. Type check (tsc --noEmit)
  3. Run tests
  4. ▶ COVERAGE GATE ◀  ← This skill
  5. Build verification
  6. Create branch + commit + push
  7. Create PR
```

If the coverage gate fails at step 4, steps 5-7 are **not executed**.

### Skip Flag

For exceptional cases (hotfixes, documentation):
```
/ship --skip-coverage
```

When `--skip-coverage` is used:
- Log a warning: `⚠️ Coverage gate skipped. Reason must be documented in PR.`
- Add `[skip-coverage]` label to the PR
- Require reason in PR description

## Failure Recovery

### Common Issues

| Issue | Solution |
|-------|----------|
| Coverage tool not installed | Install via `yarn add -D <tool>` |
| No coverage config found | Add `coverage` section to test tool config |
| Coverage report not generated | Verify test command produces JSON output |
| Threshold too strict for legacy code | Set per-directory thresholds, raise gradually |
| New files have 0% coverage | Write tests before shipping (TDD) |

### Gradual Adoption

For projects starting below 80%:

```jsonc
// Start with current baseline, ratchet up over time
{
  "coverage": {
    "thresholds": {
      "lines": 60,       // Current: 58% → target 80%
      "branches": 50,    // Current: 48% → target 80%
      "functions": 65     // Current: 63% → target 80%
    },
    "ratchet": true       // Never allow coverage to decrease
  }
}
```

**Ratchet mode:** When enabled, the threshold automatically increases to match the highest coverage ever achieved. Coverage can only go up, never down.

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "Coverage doesn't matter for this change" | Every change matters. Untested code breaks. |
| "I'll add tests later" | Later never comes. Test now. |
| "80% is too high for this project" | Lower the threshold explicitly, don't skip the gate. |
| "This is just a hotfix" | Hotfixes need tests too — use `--skip-coverage` and document why. |
| "The tests are slow" | Slow tests > no tests. Optimize later. |
| "It's only a config change" | Config changes can break things. Verify coverage didn't drop. |
