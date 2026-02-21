---
name: legacy-modernization
description: Use when modernizing legacy code or migrating outdated patterns to current best practices. Covers assessment, strangler fig pattern, incremental migration, and risk management.
---

# Legacy Modernization

## Overview

Legacy code isn't bad code — it's code that solved a real problem when it was written. Modernization is the process of adapting it to current requirements without breaking what works.

**Core principle:** Never rewrite from scratch. Strangle it incrementally. Each step must leave the system in a working state.

**Iron Law:**
```
THE SYSTEM MUST WORK AFTER EVERY CHANGE
There is no "temporarily broken while we modernize"
```

## When to Use

- Migrating from CommonJS to ESM
- Upgrading major framework versions (NestJS 9 → 10)
- Replacing callback patterns with async/await
- Moving from JavaScript to TypeScript
- Replacing deprecated APIs
- Architectural migration (monolith → modules)

## Assessment Phase

### Inventory

Before any changes, understand what you have:

```bash
# Size and complexity
find src/ -name "*.ts" -o -name "*.js" | \
  xargs wc -l | sort -rn | head -20

# Dependency graph
npx madge --circular src/

# Test coverage (what's protected)
npx jest --coverage --coverageReporters text-summary

# Outdated packages
npm outdated

# Known patterns to modernize
grep -rn "require\(" src/ --include="*.ts" | wc -l  # CommonJS in TypeScript
grep -rn "callback\|\.then\|\.catch" src/ --include="*.ts" | wc -l  # Promises vs async
grep -rn ": any" src/ --include="*.ts" | wc -l  # Untyped code
```

### Risk Assessment

Rate each area for modernization risk:

```markdown
## Modernization Risk Register

| Module | Lines | Test Coverage | External Deps | Criticality | Risk |
|--------|-------|---------------|---------------|-------------|------|
| rules.service.ts | 120 | 85% | None | High | LOW |
| mcp.service.ts | 450 | 45% | MCP SDK | High | HIGH |
| main.ts | 60 | 0% | NestJS | Medium | MEDIUM |

Risk = (Criticality × (100 - Coverage%)) / 100
```

### Modernization Backlog

```markdown
## Modernization Items

| ID | Pattern | Count | Files | Effort |
|----|---------|-------|-------|--------|
| M-001 | `any` type → explicit types | 23 | 8 files | 2h |
| M-002 | Callbacks → async/await | 12 | 4 files | 4h |
| M-003 | CommonJS → ESM imports | 45 | 15 files | 1h |
| M-004 | NestJS 9 → NestJS 10 | 1 | package.json | 8h |
```

## Migration Strategies

### Strategy 1: Strangler Fig (Recommended)

Build new behavior alongside old behavior, gradually replacing old with new.

```typescript
// Phase 1: New implementation behind feature flag
async getRules(): Promise<Rule[]> {
  if (process.env.USE_NEW_RULES_ENGINE === 'true') {
    return this.newRulesEngine.getRules(); // New implementation
  }
  return this.legacyGetRules(); // Old implementation still works
}

// Phase 2: Enable in staging, verify
// Phase 3: Enable in production (10% → 50% → 100%)
// Phase 4: Remove old implementation
async getRules(): Promise<Rule[]> {
  return this.newRulesEngine.getRules(); // Old code removed
}
```

### Strategy 2: Branch by Abstraction

1. Create abstraction over legacy code
2. Implement new code behind abstraction
3. Switch abstraction to new code
4. Remove old code

```typescript
// Step 1: Introduce interface
interface RulesEngine {
  getRules(): Promise<Rule[]>;
  searchRules(query: string): Promise<Rule[]>;
}

// Step 2: Wrap legacy code
class LegacyRulesEngine implements RulesEngine {
  // Existing code, now behind interface
}

// Step 3: New implementation
class NewRulesEngine implements RulesEngine {
  // Modern implementation
}

// Step 4: Switch (one line change)
const rulesEngine: RulesEngine = new NewRulesEngine();
// Was: new LegacyRulesEngine()
```

## Common Modernization Patterns

### JavaScript → TypeScript

```javascript
// Before (JavaScript)
function getUser(id) {
  return fetch('/api/users/' + id)
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      return data.user;
    });
}
```

```typescript
// After (TypeScript + async/await)
async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data: { user: User } = await response.json();
  return data.user;
}
```

### Callbacks → Async/Await

```javascript
// Before (callbacks)
function readRule(path, callback) {
  fs.readFile(path, 'utf8', function(err, content) {
    if (err) return callback(err);
    callback(null, parseRule(content));
  });
}
```

```typescript
// After (async/await)
async function readRule(path: string): Promise<Rule> {
  const content = await fs.promises.readFile(path, 'utf-8');
  return parseRule(content);
}
```

### Removing `any` Types

```typescript
// Before
function processRule(rule: any): any {
  return { name: rule.name, content: rule.content };
}

// After (step 1: define interface)
interface RuleInput {
  name: string;
  content: string;
  [key: string]: unknown; // allow extra properties
}

interface ProcessedRule {
  name: string;
  content: string;
}

// After (step 2: type the function)
function processRule(rule: RuleInput): ProcessedRule {
  return { name: rule.name, content: rule.content };
}
```

## Safe Migration Process

```
For EACH modernization item:

1. WRITE TESTS (if coverage < 80%)
   - Tests must cover current behavior
   - These tests protect against regression

2. MODERNIZE one file at a time
   - Apply pattern change
   - Keep behavior identical

3. RUN ALL TESTS
   - All existing tests must still pass
   - No "we'll fix the tests later"

4. COMMIT
   - One commit per file or per pattern type
   - Message: "refactor: migrate X to Y in Z"

5. VERIFY in staging before next item
```

## Version Upgrade Process (Major Versions)

```markdown
## NestJS 9 → 10 Migration Plan

### Preparation
- [ ] Read migration guide: https://docs.nestjs.com/migration-guide
- [ ] Test suite at 80%+ coverage
- [ ] Feature branch created

### Steps
1. [ ] Update peer dependencies first
2. [ ] Update NestJS packages
3. [ ] Fix breaking API changes (see migration guide)
4. [ ] Run test suite
5. [ ] Fix type errors
6. [ ] Test in staging
7. [ ] Deploy to production

### Rollback
- git revert to previous package.json
- npm install
- Deploy previous version
```

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking working functionality | Write tests before modernizing |
| Long migration blocks features | Use strangler fig pattern |
| Merge conflicts | Small, frequent commits |
| Regression in edge cases | Test coverage for edge cases first |
| Team unfamiliar with new patterns | Document new patterns + pair programming |

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "Let's rewrite it from scratch" | Rewrites take 3× longer and miss edge cases |
| "We'll fix tests later" | Tests are the safety net — fix them now |
| "One big refactoring PR" | Small PRs are safer and reviewable |
| "The new code is obviously correct" | Verify with tests, not confidence |
| "We can modernize while adding features" | Keep modernization commits separate |

## Quick Reference

```
Migration Patterns:
──────────────────────────────
Strangler Fig  → New code wraps old, gradual replacement
Branch by Abstraction → Interface first, then implementations
Parallel Run   → Old and new run simultaneously, compare results
Expand-Contract → Database: add new → migrate → remove old

Priority Order:
──────────────────────────────
1. Highest risk (low coverage, high criticality) → test first
2. Quick wins (high impact, low effort)
3. Architectural changes (last, requires stability)
```
