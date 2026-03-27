---
name: plan-to-issues
description: Decompose specs or implementation plans into independent GitHub issues with dependency graphs, wave grouping, and file overlap analysis for safe parallel execution.
---

# Plan to Issues

## Overview

Turn specs and implementation plans into a set of independent, well-structured GitHub issues ready for parallel execution. Each issue gets acceptance criteria, file dependency mapping, wave assignment, and priority labels.

**Core principle:** Issues that touch the same files MUST NOT be in the same wave. File overlap = sequential execution.

**Announce at start:** "I'm using the plan-to-issues skill to decompose this plan into GitHub issues."

**Iron Law:**

```
ISSUES MODIFYING THE SAME FILE MUST NEVER RUN IN THE SAME WAVE
```

## When to Use

- Implementation plan is ready and needs to be broken into trackable units of work
- Spec document needs decomposition into parallel-safe issues
- Planning a multi-issue feature that will use `/taskmaestro` for parallel execution
- Roadmap or design doc needs to become actionable GitHub issues

**Use this ESPECIALLY when:**
- The plan has 3+ independent deliverables
- Multiple developers or agents will work in parallel
- You need wave grouping for `/taskmaestro` execution

**Don't use when:**
- Single-file change or trivial fix (just create the issue directly)
- Requirements are still unclear (use brainstorming skill first)
- Plan hasn't been written yet (use writing-plans skill first)

## Input

The skill accepts one of:
- **Spec document path**: `docs/plans/YYYY-MM-DD-<feature>.md`
- **Plan document path**: Any markdown file with implementation steps
- **Inline description**: Direct feature description in the prompt

## The Five Phases

### Phase 1: Analyze — Identify Independent Deliverables

**Read the plan and extract discrete units of work:**

1. **Parse the plan document**
   - Read the spec/plan file
   - Identify each distinct feature, component, or change
   - Note dependencies between items

2. **Define each deliverable**
   - Summary: What does this issue deliver?
   - Scope: Which files will be created or modified?
   - Dependencies: What must be done before this?
   - Acceptance criteria: How do we know it's done?

3. **Estimate file touchpoints**
   - List every file each deliverable will create or modify
   - Be specific — `src/utils/parse.ts` not `src/utils/`
   - Include test files: `src/utils/parse.test.ts`

**Completion criteria:**
- [ ] All deliverables identified with clear scope
- [ ] File touchpoints listed for each deliverable
- [ ] Dependencies between deliverables noted

### Phase 2: Overlap Detection — Map File Conflicts

**Use `validate_parallel_issues` to verify safety:**

1. **Build the file overlap matrix**
   - Compare file lists between all deliverables
   - Identify any shared files

2. **Validate with MCP tool**

```
Call: codingbuddy validate_parallel_issues
  issues: [issue_numbers]
  issueContents: { "1": "body1", "2": "body2", ... }
```

3. **Apply the Iron Rule**
   - Same file in two deliverables = different waves
   - No exceptions — even "small" changes to shared files cause merge conflicts

**Decision matrix:**

| Overlap | Action |
|---------|--------|
| No shared files | Same wave OK |
| Shared test helpers only | Same wave OK (read-only imports) |
| Shared source files | Different waves MANDATORY |
| Shared config files | Different waves MANDATORY |

**Completion criteria:**
- [ ] File overlap matrix built
- [ ] `validate_parallel_issues` called (if issues already exist)
- [ ] Conflicts resolved via wave separation

### Phase 3: Prioritize — Assign Priority and Wave Groups

**Priority levels:**

| Priority | Meaning | Criteria |
|----------|---------|----------|
| `P0` | Critical | Blocks other issues; foundational setup |
| `P1` | High | Core feature; needed for MVP |
| `P2` | Medium | Enhancement; improves quality |
| `P3` | Low | Nice-to-have; polish |

**Wave assignment rules:**

1. **Wave 1**: All P0 issues + any P1 issues with zero file overlaps with P0
2. **Wave 2**: Issues that depend on Wave 1 completion + P1/P2 with no overlap with each other
3. **Wave N**: Remaining issues grouped by zero-overlap constraint

```
Wave 1: [#1, #2, #3]  ← No file overlaps between these
Wave 2: [#4, #5]       ← Depend on Wave 1; no overlaps between these
Wave 3: [#6]           ← Depends on Wave 2
```

**Completion criteria:**
- [ ] All deliverables have priority labels
- [ ] Wave groups assigned with zero intra-wave file overlap
- [ ] Dependency chain is clear

### Phase 4: Create — Generate GitHub Issues

**Create each issue with structured body:**

```bash
gh issue create \
  --title "<type>(<scope>): <description>" \
  --label "<priority>,<wave>,<feature-area>" \
  --body "$(cat <<'EOF'
## Summary

<1-2 sentence description of what this issue delivers>

## Details

<Implementation details, approach, key decisions>

## Files to Create/Modify

- [ ] `path/to/file.ts` — <what changes>
- [ ] `path/to/file.test.ts` — <what tests>

## Acceptance Criteria

- [ ] <Criterion 1>
- [ ] <Criterion 2>
- [ ] <Criterion 3>

## Dependencies

- Depends on: #<number> (if any)
- Blocks: #<number> (if any)

## Wave Assignment

**Wave <N>** — <reason for this wave>
Can run in parallel with: #<numbers>
Must wait for: #<numbers> (if any)
EOF
)"
```

**Label conventions:**

| Label | Format | Example |
|-------|--------|---------|
| Priority | `P0` through `P3` | `P1` |
| Wave | `wave-<N>` | `wave-1` |
| Feature area | Project-specific | `auth`, `api`, `ui` |
| Type | Conventional commits | `feat`, `fix`, `refactor` |

**Auto-create missing labels:**

```bash
gh label create "wave-1" --color "4ECDC4" --description "Wave 1: parallel group" 2>/dev/null || true
gh label create "wave-2" --color "45B7D1" --description "Wave 2: parallel group" 2>/dev/null || true
gh label create "P0" --color "FF0000" --description "Critical priority" 2>/dev/null || true
gh label create "P1" --color "FF6B6B" --description "High priority" 2>/dev/null || true
gh label create "P2" --color "FFD93D" --description "Medium priority" 2>/dev/null || true
gh label create "P3" --color "95E1D3" --description "Low priority" 2>/dev/null || true
```

**Completion criteria:**
- [ ] All issues created with structured body
- [ ] Labels applied (created if missing)
- [ ] Dependencies linked between issues

### Phase 5: Summarize — Output Dependency Graph and Execution Plan

**Present the final decomposition:**

```markdown
## Decomposition Summary

### Dependency Graph

#1 ─┬─► #3
    └─► #4 ──► #6
#2 ────► #5

### Wave Execution Plan

| Wave | Issues | Parallel Safe | Depends On |
|------|--------|---------------|------------|
| 1 | #1, #2 | Yes (0 file overlaps) | — |
| 2 | #3, #4, #5 | Yes (0 file overlaps) | Wave 1 |
| 3 | #6 | N/A (single) | Wave 2 |

### File Overlap Matrix

| | #1 | #2 | #3 | #4 | #5 | #6 |
|---|---|---|---|---|---|---|
| #1 | — | 0 | 1 | 0 | 0 | 0 |
| #2 | 0 | — | 0 | 0 | 1 | 0 |
...

Total issues: 6
Waves: 3
Estimated parallel speedup: ~3x
```

**Completion criteria:**
- [ ] Dependency graph visualized
- [ ] Wave execution plan table complete
- [ ] File overlap matrix shown
- [ ] Summary shared with user

## Integration with taskmaestro

The wave grouping output is designed for direct use with `/taskmaestro`:

```
/taskmaestro --issues "#1,#2,#3" --wave 1
/taskmaestro --issues "#4,#5" --wave 2
```

Each wave runs in parallel tmux panes with git worktree isolation.

## Quick Reference

| Phase | Action | Tool |
|-------|--------|------|
| **1. Analyze** | Extract deliverables from plan | Read tool |
| **2. Overlap** | Detect file conflicts | `validate_parallel_issues` |
| **3. Prioritize** | Assign P0-P3 and waves | Manual analysis |
| **4. Create** | Generate GitHub issues | `gh issue create` |
| **5. Summarize** | Dependency graph + execution plan | Output |

## Safety Checklist

Before creating issues:

- [ ] Plan document read completely
- [ ] Every deliverable has specific file touchpoints (not directories)
- [ ] File overlap matrix checked — no intra-wave conflicts
- [ ] Priority levels assigned based on dependency chain
- [ ] Issue bodies include acceptance criteria
- [ ] Wave assignments respect the Iron Rule
- [ ] Labels exist or will be auto-created
- [ ] `validate_parallel_issues` called for final verification

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "These issues probably don't overlap" | CHECK. Run overlap detection. Assumptions cause merge conflicts. |
| "I'll put them all in Wave 1 for speed" | STOP. Overlapping files in one wave = guaranteed conflicts. |
| "File overlap is minor, just a config file" | STOP. Config conflicts are the hardest to resolve. Different waves. |
| "I don't need acceptance criteria" | You do. Issues without AC get implemented wrong. |
| "I'll figure out waves later" | Waves are determined by file overlap. Do it now. |
| "This deliverable is too small for its own issue" | Small, focused issues are easier to parallelize and review. |
| "I'll skip validate_parallel_issues" | The MCP tool catches overlaps you missed. Always validate. |

## Examples

### Spec to Issues

```
Input:  docs/plans/2025-03-15-auth-redesign.md
Output: 5 GitHub issues across 2 waves

Wave 1 (parallel):
  #101 feat(auth): add JWT token service        [P0, wave-1]
  #102 feat(auth): add password hashing utils    [P0, wave-1]
  #103 feat(db): add users migration             [P0, wave-1]

Wave 2 (parallel, after Wave 1):
  #104 feat(auth): add login/register endpoints  [P1, wave-2]
  #105 feat(auth): add auth middleware            [P1, wave-2]
```

### Plan with Overlaps

```
Input:  docs/plans/2025-04-01-api-v2.md

Overlap detected:
  Issue A: modifies src/routes/index.ts
  Issue B: modifies src/routes/index.ts
  → A and B MUST be in different waves

Wave 1: [A, C, D]  ← A here
Wave 2: [B, E]     ← B here (after A merges)
```
