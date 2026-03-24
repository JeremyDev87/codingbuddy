---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** This should be run in a dedicated worktree (created by brainstorming skill).

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Alternatives

### [Decision: e.g. State Management Approach]

| Criteria | Approach A: [Name] | Approach B: [Name] |
|---|---|---|
| Performance | ... | ... |
| Complexity | ... | ... |
| Maintainability | ... | ... |

**Decision:** [Chosen approach] — [One-line rationale]

---
```

## Alternatives Exploration

Every non-trivial decision in the plan MUST include at least two approaches with trade-off analysis.

**What counts as non-trivial:**
- Architecture choices (e.g. where to put new code)
- Data flow design (e.g. state management approach)
- API design (e.g. endpoint structure, payload shape)
- Testing strategy (e.g. unit vs integration)

**What does NOT need alternatives:**
- File naming that follows existing conventions
- Import statements
- Trivial implementation details

**Format for each decision:**

```markdown
### [Decision: Short Description]

| Criteria | Approach A: [Name] | Approach B: [Name] |
|---|---|---|
| Performance | ... | ... |
| Complexity | ... | ... |
| Maintainability | ... | ... |

**Decision:** [Chosen approach] — [One-line rationale]
```

**Rules:**
- Minimum 2 approaches per non-trivial decision
- Always include performance, complexity, and maintainability rows
- Add extra criteria rows when relevant (e.g. security, testability, migration cost)
- State the chosen approach with a clear rationale
- If only one viable approach exists, explain why alternatives were ruled out

## API Verification

When the plan references external APIs, SDKs, or protocols:

1. **Document every API assumption** with its source URL
2. **Create an "API Assumptions" table** in the plan:

| Assumption | Verified? | Source |
|-----------|:---------:|--------|
| Hook stdin has `tool_name` | ✅ | [Hooks Reference](url) |
| Hook stdin has `session_cost` | ❌ UNVERIFIED | — |

3. **All assumptions must be verified before ACT phase**
4. **WebFetch/WebSearch the official docs** — never rely on memory or guesses

### Why This Matters
Unverified API assumptions propagate into implementation, causing features to be unimplementable as designed. Verification at PLAN time costs minutes; rework at ACT time costs hours.

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- DRY, YAGNI, TDD, frequent commits

## Self-Review Gate

**Before submitting the plan, verify ALL items pass:**

- [ ] All file paths verified (existing files confirmed, new files marked as `Create:`)
- [ ] Steps are bite-sized (2-5 minutes each, one action per step)
- [ ] Risks identified with mitigation (what could go wrong and how to handle it)
- [ ] TDD applied where appropriate (test-first for core logic, test-after for UI)
- [ ] No over-engineering (YAGNI check — remove anything not directly needed)

**If any item fails:** Fix the plan before proceeding. Do not hand off an incomplete plan.

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `docs/plans/<filename>.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses superpowers:executing-plans
