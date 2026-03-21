# EVAL Severity Criteria

Severity classification for the EVAL phase of AUTO mode workers.
Used to determine whether a worker can ship (`/ship`) or must iterate.

---

## Escape Condition

```
Critical == 0 AND High == 0  →  Ship (/ship <issue-number>)
Critical >  0 OR  High >  0  →  Return to ACT, fix, re-EVAL
Iteration >= 3               →  STOP, report remaining issues
```

---

## Severity Levels

### Critical — Must Fix (Blocks Shipping)

Issues that would cause immediate breakage or security risk in production.

| Category | Examples |
|----------|----------|
| **Broken tests** | Test suite fails, new tests don't pass, existing tests broken by changes |
| **Build failure** | TypeScript compilation errors, missing imports, syntax errors |
| **Security vulnerability** | XSS, injection, exposed secrets, insecure auth |
| **Data loss risk** | Destructive operations without confirmation, missing validation |
| **Runtime crash** | Null pointer, unhandled exception in critical path |
| **Missing core requirement** | Acceptance criteria explicitly marked "must" not met |

**Action:** Return to ACT phase immediately. Fix before any other work.

### High — Must Fix (Blocks Shipping)

Issues that would cause incorrect behavior or significant quality degradation.

| Category | Examples |
|----------|----------|
| **Incorrect behavior** | Feature does not match acceptance criteria |
| **Missing acceptance criteria** | Checkbox items from issue not implemented |
| **Regression** | Existing functionality broken by changes |
| **Type errors** | TypeScript `any` usage, missing type definitions |
| **Missing error handling** | Unhandled edge cases in core logic |
| **Test coverage gap** | Core logic paths without test coverage |

**Action:** Return to ACT phase. Fix before shipping.

### Medium — Note in PR (Does Not Block Shipping)

Issues that are real but acceptable for post-merge cleanup.

| Category | Examples |
|----------|----------|
| **Code style** | Inconsistent naming, formatting issues |
| **Missing edge case tests** | Non-critical paths without test coverage |
| **Documentation gaps** | Missing or incomplete inline comments |
| **Minor type looseness** | Correct but imprecise type annotations |
| **Performance** | Suboptimal but functional implementation |
| **Accessibility** | Minor a11y improvements possible |

**Action:** Note in PR description under "Known Issues / Follow-up" section. Ship.

### Low — Optional (Does Not Block Shipping)

Minor improvements that are nice-to-have but not worth blocking shipping.

| Category | Examples |
|----------|----------|
| **Refactoring opportunity** | Code works but could be cleaner |
| **Enhanced logging** | More detailed log messages possible |
| **Extended test cases** | Additional edge cases to cover |
| **Documentation enhancements** | More examples, better formatting |
| **Optimization** | Micro-optimizations with negligible impact |

**Action:** Optionally note in PR description. Ship.

---

## EVAL Checklist

When running EVAL phase, check each category in order:

```
1. TESTS
   - [ ] All existing tests pass
   - [ ] New tests cover acceptance criteria
   - [ ] No skipped or commented-out tests

2. BUILD
   - [ ] TypeScript compiles without errors (tsc --noEmit)
   - [ ] No lint errors in modified files
   - [ ] No circular dependencies introduced

3. ACCEPTANCE CRITERIA
   - [ ] Each checkbox item from issue is addressed
   - [ ] Behavior matches issue description
   - [ ] Edge cases considered

4. SECURITY (if applicable)
   - [ ] No secrets in code
   - [ ] Input validation present
   - [ ] No injection vulnerabilities

5. COMPATIBILITY
   - [ ] Changes are backward-compatible (or migration provided)
   - [ ] No breaking changes to public APIs
   - [ ] Existing integrations unaffected

6. CODE QUALITY
   - [ ] No TypeScript `any` usage
   - [ ] Pure/impure function separation maintained
   - [ ] SOLID principles followed
   - [ ] DRY — no unnecessary duplication
```

---

## Severity Decision Tree

```
Is the test suite broken?
├── YES → Critical
└── NO
    Does it compile cleanly?
    ├── NO → Critical
    └── YES
        Does behavior match acceptance criteria?
        ├── NO → High
        └── YES
            Are all acceptance criteria checkboxes met?
            ├── NO → High
            └── YES
                Are there code quality concerns?
                ├── YES → Medium (note in PR)
                └── NO
                    Any minor improvements possible?
                    ├── YES → Low (optional)
                    └── NO → Ship! 🚀
```

---

## Reporting Format

When EVAL is complete, output findings in this format:

```markdown
## EVAL Results — Iteration N

### Summary
- Critical: X
- High: Y
- Medium: Z
- Low: W

### Findings

#### Critical
1. [C1] Test `foo.spec.ts` fails: expected 3 but got 0
2. [C2] Missing import causes build failure

#### High
1. [H1] Acceptance criterion "validate input" not implemented
2. [H2] Missing error handling for API timeout

#### Medium
1. [M1] Variable `x` could be more descriptively named
2. [M2] Missing test for empty input edge case

#### Low
1. [L1] Could extract helper function for repeated logic

### Decision
- [ ] Ship: Critical=0, High=0 ✅
- [ ] Iterate: Fix C1, C2, H1, H2 → return to ACT
```

---

## SubAgent Specialists for EVAL

When using subAgent parallelization in EVAL phase:

| Specialist | Checks |
|-----------|--------|
| **code-quality-specialist** | Code style, SOLID, DRY, type safety |
| **test-strategy-specialist** | Test coverage, test quality, edge cases |
| **security-specialist** | OWASP top 10, secrets, input validation |
| **accessibility-specialist** | WCAG compliance, keyboard navigation |
| **performance-specialist** | Algorithmic complexity, memory usage |

Dispatch specialists based on issue complexity:

| Complexity | Recommended Specialists |
|-----------|------------------------|
| Simple | None (self-review sufficient) |
| Medium | code-quality |
| Complex | code-quality + test-strategy + security |
