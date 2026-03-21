# Example: Parallel Execution of #732-#743

Real-world case study from 2026-03-21. Twelve sub-issues of parent issue #731
("Skill metadata and agent schema improvements") executed via taskMaestro + codingbuddy AUTO mode.

---

## Context

**Parent Issue:** #731 — Skill metadata and agent schema improvements
**Sub-issues:** #732, #733, #734, #735, #736, #737, #738, #739, #740, #741, #742, #743
**Total:** 12 issues
**Goal:** Update skill frontmatter, agent JSON schemas, documentation, and adapter guides

## Phase 1: Issue Analysis

### Issue Summary

| # | Title | Target Files | Complexity |
|---|-------|-------------|------------|
| #732 | Add `allowed-tools` field to skill frontmatter | `.claude/skills/*/SKILL.md`, `.cursor/skills/*.md` | Simple |
| #733 | Add `argument-hint` to skill frontmatter | `.claude/skills/*/SKILL.md`, `.cursor/skills/*.md` | Simple |
| #734 | Add `disable-model-invocation` to skill frontmatter | `.claude/skills/*/SKILL.md`, `.cursor/skills/*.md` | Simple |
| #735 | Add `description` field to agent JSON schema | `packages/rules/.ai-rules/agents/*.json` | Simple |
| #736 | Update taskmaestro skill with wave-transition | `.claude/skills/taskmaestro/SKILL.md` | Medium |
| #737 | Add TDD strategy section to augmented-coding | `packages/rules/.ai-rules/rules/augmented-coding.md` | Simple |
| #738 | Update Claude Code adapter with parallel agents | `packages/rules/.ai-rules/adapters/claude-code.md` | Medium |
| #739 | Update Cursor adapter with new skill fields | `packages/rules/.ai-rules/adapters/cursor.md` | Simple |
| #740 | Add plan-to-issues skill | `.claude/skills/plan-to-issues/SKILL.md` | Medium |
| #741 | Add retro skill for retrospectives | `.claude/skills/retro/SKILL.md` | Medium |
| #742 | Update project rules with architecture notes | `packages/rules/.ai-rules/rules/project.md` | Simple |
| #743 | Update CLAUDE.md with new tool priority | `.claude/CLAUDE.md` | Simple |

### File Overlap Matrix

```
Conflicts found: 3 pairs

#732 <-> #733: skill SKILL.md files (3 shared)
  - .claude/skills/taskmaestro/SKILL.md
  - .claude/skills/plan-to-issues/SKILL.md
  - .claude/skills/retro/SKILL.md

#732 <-> #734: skill SKILL.md files (3 shared)
  - .claude/skills/taskmaestro/SKILL.md
  - .claude/skills/plan-to-issues/SKILL.md
  - .claude/skills/retro/SKILL.md

#733 <-> #734: skill SKILL.md files (3 shared)
  - .claude/skills/taskmaestro/SKILL.md
  - .claude/skills/plan-to-issues/SKILL.md
  - .claude/skills/retro/SKILL.md
```

### Dependencies

No inter-issue dependencies detected. All are independent sub-issues of #731.

## Phase 2: Wave Division

### Initial Attempt (FAILED)

```
Wave 1: #732, #733, #734, #735, #736, #737
Wave 2: #738, #739, #740, #741, #742, #743
```

**Problem:** #732, #733, #734 all modify the same skill SKILL.md files.
This was initially judged as "different YAML fields, trivial rebase" — **WRONG**.

**Result:** PRs #750 (#733) and #751 (#734) had merge conflicts after #732's PR was merged.

### Corrected Plan (Applied)

```
Wave 1: #732, #735, #736, #737  (4 panes — no file overlap)
Wave 2: #733, #738, #739, #740  (4 panes — no file overlap)
Wave 3: #734, #741, #742, #743  (4 panes — no file overlap)
```

**Verification:** Zero-Conflict Check passed for all waves.

**Iron Rule applied:** #732, #733, #734 each in separate waves because they share skill SKILL.md files.

## Phase 3: Worker Prompts

Each worker received:

```
AUTO: Issue #<N> 구현 — <title>

[Common prefix: AUTO mode methodology, escape condition, /ship integration]

## Your Task
[Issue-specific details: goal, target files, acceptance criteria]
```

SubAgent strategy: All issues were Simple/Medium complexity → no subAgent parallelization used.

## Phase 4: Execution

### Wave 1 Execution
```
Started: 2026-03-21 09:00
Pane 0: #732 (allowed-tools) → PR #748 created at 09:15
Pane 1: #735 (agent description) → PR #749 created at 09:22
Pane 2: #736 (taskmaestro) → PR #752 created at 09:35
Pane 3: #737 (augmented-coding) → PR #753 created at 09:12
Completed: 2026-03-21 09:35 (35 min)
```

### Wave 2 Execution
```
Started: 2026-03-21 09:40 (after Wave 1 PRs merged)
Pane 0: #733 (argument-hint) → PR #754 created at 09:55
Pane 1: #738 (claude adapter) → PR #756 created at 10:10
Pane 2: #739 (cursor adapter) → PR #757 created at 09:52
Pane 3: #740 (plan-to-issues) → PR #758 created at 10:20
Completed: 2026-03-21 10:20 (40 min)
```

### Wave 3 Execution
```
Started: 2026-03-21 10:25 (after Wave 2 PRs merged)
Pane 0: #734 (disable-model-invocation) → PR #759 created at 10:38
Pane 1: #741 (retro skill) → PR #760 created at 10:50
Pane 2: #742 (project rules) → PR #761 created at 10:35
Pane 3: #743 (CLAUDE.md) → PR #762 created at 10:32
Completed: 2026-03-21 10:50 (25 min)
```

## Phase 5: Results

### Summary

| Metric | Value |
|--------|-------|
| Total issues | 12 |
| Waves | 3 |
| Total duration | ~2 hours (including merge gaps) |
| Sequential estimate | ~6 hours (30 min/issue average) |
| Speedup | ~3x |
| Merge conflicts | 0 (after corrected wave plan) |
| Failed PRs | 0 |

### Merge Order

```
Wave 1: #753 → #748 → #749 → #752
Wave 2: #757 → #754 → #756 → #758
Wave 3: #762 → #761 → #759 → #760
```

(Within each wave, smaller diffs merged first)

### Lessons Learned

1. **Iron Rule is non-negotiable.** The initial "different YAML fields" judgment caused merge conflicts. File-level granularity is the only safe boundary.

2. **4 panes is the practical maximum.** With 4 panes, monitoring is manageable. More panes increase the risk of missed errors.

3. **Simple issues complete fastest.** YAML/config changes average 15 min. Medium issues (new skills) average 30 min. Plan waves so that similar complexity issues are grouped.

4. **Merge between waves is critical.** Workers in Wave N+1 need the merged code from Wave N. Always `git fetch origin master:master` before creating new worktrees.

5. **AUTO mode escape condition works.** All workers converged within 1-2 iterations. No worker hit the 3-iteration limit.

---

## Invocation

This execution would have been invoked as:

```bash
/parallel-issues --parent 731 --panes 4
```

Or equivalently:

```bash
/parallel-issues 732-743 --panes 4
```
