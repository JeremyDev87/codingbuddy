---
name: parallel-issues
description: >-
  Execute multiple GitHub issues in parallel using taskMaestro worktrees.
  Analyzes dependencies and file overlap, divides into conflict-free waves,
  generates AUTO mode worker prompts, orchestrates parallel execution,
  and produces a completion report. Iron Rule: same file = different wave.
disable-model-invocation: true
argument-hint: [issue-numbers-or-range] [--panes <n>]
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent, AskUserQuestion
user-invocable: true
---

# Parallel Issues

Execute multiple GitHub issues in parallel using taskMaestro worktrees with AUTO mode workers.

Follow every step in order. Stop and report if any critical step fails.

## Prerequisites

- `tmux` installed and available
- `gh` CLI authenticated with repo access
- `claude` CLI available in PATH
- Git repository with a clean working tree on `master`
- `/taskmaestro` skill available (low-level tmux/worktree management)

## Constants

```
MAX_PANES=4              # default max concurrent panes
POLL_INTERVAL=30         # seconds between progress checks
MAX_WAVE_WAIT=3600       # seconds before wave timeout (60 min)
PLAN_DIR="docs/plans"    # where to write plan documents
```

---

## Iron Rule: Zero-Conflict Guarantee

```
┌─────────────────────────────────────────────────────┐
│  SAME FILE modified by 2+ issues = DIFFERENT WAVES  │
│  No exceptions. No "trivial rebase". No optimism.   │
└─────────────────────────────────────────────────────┘
```

**Origin:** Wave 1 incident where issues #733 and #734 ran in parallel, both modifying
the same YAML files. PRs #750 and #751 had merge conflicts. The file overlap matrix
was created but "different YAML fields" was incorrectly treated as non-conflicting.

**Enforcement:**
1. Validate at **file unit**, never at field/line unit
2. If file overlap count >= 1 between any two issues, they go to different waves
3. Wave plan must pass the Zero-Conflict Check before execution
4. No human override allowed for this rule

---

## Phase 1: Issue Collection & Analysis

### Step 1.1: Parse Arguments

```
Input formats:
  /parallel-issues 732 733 734 735        # space-separated
  /parallel-issues 732,733,734,735        # comma-separated
  /parallel-issues 732-743                # range
  /parallel-issues --parent 731           # all sub-issues of #731
  /parallel-issues 732-743 --panes 3     # limit concurrent panes
```

Parse `$ARGUMENTS` to extract a list of issue numbers. If `--panes` is provided, store the value (default: `MAX_PANES`).

### Step 1.2: Fetch Issue Details

For each issue number, fetch details:

```bash
for ISSUE in $ISSUES; do
  gh issue view "$ISSUE" --json number,title,body,labels,state \
    --jq '{number, title, body, labels: [.labels[].name], state}' \
    > "/tmp/parallel-issues/issue-${ISSUE}.json"
done
```

Filter out closed issues. Warn if any issue is already closed.

### Step 1.3: Extract Dependencies

Scan each issue body for dependency patterns:

```
Patterns to detect:
  - "depends on #NNN" / "Depends on #NNN"
  - "after #NNN" / "After #NNN"
  - "blocked by #NNN" / "Blocked by #NNN"
  - "requires #NNN" / "Requires #NNN"
  - "Parent: #NNN"
  - Sub-issue relationships (via gh api)
```

Build a dependency graph: `Map<issueNum, dependsOn[]>`

### Step 1.4: Extract Target Files

Scan each issue body for file paths:

```
Regex pattern (ERE):
  (?:packages|src|apps|\.claude|\.cursor|\.kiro|\.q|\.antigravity|\.codex)/[\w./@-]+\.\w+

Filter out:
  - URLs (http://, https://)
  - Trailing punctuation
  - Duplicates
```

Build a file map: `Map<issueNum, filePaths[]>`

### Step 1.5: Generate File Overlap Matrix

Compare all issue pairs for shared files:

```
For each pair (A, B) where A < B:
  shared = intersection(files[A], files[B])
  if shared is not empty:
    record overlap: { issueA, issueB, sharedFiles }
```

Output the matrix:

```
File Overlap Matrix:
  #733 <-> #734: packages/rules/.ai-rules/agents/README.md (1 file)
  #732 <-> #736: (none)
  ...
```

### Step 1.6: Assess Complexity

For each issue, classify complexity:

| Complexity | Criteria | Examples |
|-----------|----------|----------|
| Simple | 1-3 files, config/YAML changes only | Add label, update field |
| Medium | 4-8 files, new file creation, docs | New agent, documentation |
| Complex | 8+ files or logic implementation | New skill, code feature |

---

## Phase 2: Wave Division & Plan Generation

> **Reference:** Read `references/wave-analysis-guide.md` for the detailed algorithm.

### Step 2.1: Topological Sort

Order issues by dependency graph:

```
1. Find all issues with zero incoming dependencies → Wave 1 candidates
2. For issues depending on Wave 1 → Wave 2 candidates
3. Recurse until all issues are assigned a minimum wave
```

### Step 2.2: Apply Iron Rule — File Overlap Splitting

Within each wave from Step 2.1, check for file overlaps:

```
For each wave W:
  For each pair (A, B) in W:
    if overlap_matrix[A][B] is not empty:
      Move B to wave W+1 (or later)
      Re-check W+1 for new overlaps
      Repeat until wave W has zero internal overlaps
```

**Algorithm:** Greedy graph coloring on the file-conflict graph.

### Step 2.3: Zero-Conflict Verification

```
VERIFY: For every wave W:
  For every pair (A, B) in W:
    assert overlap(files[A], files[B]) == empty

If assertion fails → ABORT and report the conflict
```

This check is mandatory. Do not skip it.

### Step 2.4: Determine Merge Order

Within each wave, determine merge order based on:
1. `priority:must` first, then `priority:should`, then `priority:could`
2. Fewer file changes merged first (smaller diff = lower risk)
3. No dependencies within wave (guaranteed by Iron Rule)

### Step 2.5: Generate Plan Document

Write to `docs/plans/YYYY-MM-DD-parallel-issues-HHMM.md`:

```markdown
# Parallel Issues Execution Plan

**Date:** YYYY-MM-DD HH:MM
**Issues:** #N1, #N2, ..., #Nn
**Waves:** K waves

## Wave Summary

| Wave | Issues | Panes | Est. Complexity |
|------|--------|-------|-----------------|
| 1 | #732, #733, #735 | 3 | Simple, Simple, Medium |
| 2 | #734, #736 | 2 | Simple, Complex |

## File Overlap Matrix

[from Phase 1.5]

## Wave Details

### Wave 1
- #732: "Title" — files: [...] — complexity: Simple
- #733: "Title" — files: [...] — complexity: Simple
- Merge order: #732 → #733

### Wave 2
- #734: "Title" — files: [...] — complexity: Medium
- Merge order: #734
```

### Step 2.6: User Approval

Present the plan summary and ask for approval:

```
Parallel Issues Plan:
  Total: 12 issues in 3 waves

  Wave 1 (4 panes): #732, #733, #735, #737
  Wave 2 (4 panes): #734, #736, #738, #739
  Wave 3 (4 panes): #740, #741, #742, #743

  File overlaps detected: 3 pairs (resolved into separate waves)
  Iron Rule: ✅ All waves conflict-free

  Proceed? [Yes / Adjust / Cancel]
```

Wait for user approval. If "Adjust", accept modifications and re-verify Iron Rule.

---

## Phase 3: Worker Prompt Generation

> **Reference:** Read `references/auto-mode-template.md` for the full worker prompt template.

### Step 3.1: Build Common Prefix

Every worker receives the same AUTO mode methodology prefix. This ensures each worker
is self-contained and can operate after context clear.

The common prefix includes:
- AUTO mode iteration cycle (PLAN → ACT → EVAL → repeat)
- Escape condition: `Critical = 0 AND High = 0`
- codingbuddy MCP tool usage (parse_mode, update_context, generate_checklist)
- SubAgent parallelization strategy by complexity
- `/ship <issue-number>` as completion action

### Step 3.2: Build Issue-Specific Suffix

For each issue, append:

```markdown
## Your Task

**Issue:** #<number> — <title>
**Complexity:** <Simple|Medium|Complex>

### Goal
<extracted from issue body — Purpose section>

### Target Files
<file list from Phase 1.4>

### Acceptance Criteria
<extracted from issue body — checkbox items>

### Technical Details
<extracted from issue comments if available>
```

### Step 3.3: Assemble Worker Prompts

```
For each issue I in current wave:
  prompt[I] = "AUTO: Issue #" + I.number + " 구현\n\n" + common_prefix + "\n\n" + issue_suffix[I]
```

### Step 3.4: SubAgent Strategy by Complexity

Include in each worker prompt:

| Complexity | SubAgent Strategy |
|-----------|-------------------|
| Simple | No subAgents needed. Direct implementation. |
| Medium | Optional: 1 specialist (test-strategy or code-quality) |
| Complex | Recommended: 2-3 specialists (architecture + test-strategy + code-quality) |

> **Reference:** Read `references/eval-criteria.md` for EVAL severity classification.

---

## Phase 4: taskMaestro Execution

### Step 4.1: Execute Wave

For each wave, use the `/taskmaestro` skill:

```bash
# Start the wave
/taskmaestro wave-transition <comma-separated-issues>
```

This internally:
1. Stops any current workers
2. Cleans existing worktrees
3. Creates fresh worktrees from master
4. Launches Claude Code instances
5. Waits for readiness
6. Assigns task prompts

### Step 4.2: Assign Worker Prompts

After `/taskmaestro wave-transition` completes, send the full worker prompt to each pane:

```bash
for i in range(0, wave_size):
  pane = "taskmaestro:0.${i}"
  prompt = worker_prompts[wave_issues[i]]

  # Send prompt via tmux
  tmux send-keys -t "$pane" "$prompt" Enter
```

**Important:** If worker prompts are too long for tmux send-keys, write them to temp files
and use `/parallel-issues` file-based prompt injection:

```bash
PROMPT_FILE="/tmp/parallel-issues/prompt-${ISSUE}.md"
echo "$prompt" > "$PROMPT_FILE"
tmux send-keys -t "$pane" "$(cat $PROMPT_FILE)" Enter
```

### Step 4.3: Monitor Progress

Poll each pane at `POLL_INTERVAL` (30s) intervals:

```bash
monitor_wave() {
  local wave_issues=("$@")
  local start_time=$(date +%s)

  while true; do
    local all_done=true

    for i in "${!wave_issues[@]}"; do
      local pane="taskmaestro:0.${i}"
      local content=$(tmux capture-pane -t "$pane" -p 2>/dev/null | tail -20)

      # Check for completion indicators
      if echo "$content" | grep -qE '(PR created|/ship completed|⏵⏵|⏵ |❯)'; then
        # Check if idle (prompt visible = done or waiting)
        if echo "$content" | grep -qE '⏵⏵|⏵ |❯'; then
          echo "pane-${i} (#${wave_issues[$i]}): IDLE"
        fi
      else
        all_done=false
        echo "pane-${i} (#${wave_issues[$i]}): WORKING"
      fi
    done

    if $all_done; then
      echo "=== Wave complete ==="
      break
    fi

    # Timeout check
    local elapsed=$(( $(date +%s) - start_time ))
    if [ "$elapsed" -gt "$MAX_WAVE_WAIT" ]; then
      echo "WARNING: Wave timeout after ${MAX_WAVE_WAIT}s"
      break
    fi

    sleep "$POLL_INTERVAL"
  done
}
```

### Step 4.4: Verify Wave Completion

Before transitioning to the next wave:

```
For each issue in completed wave:
  1. Check if PR was created: gh pr list --head <branch> --json number,url
  2. Check PR status: gh pr view <number> --json state,reviews,statusCheckRollup
  3. If no PR found → flag as incomplete
  4. If PR has failing checks → flag for manual review
```

### Step 4.5: Wave Transition

If more waves remain:

```
1. Collect completion status of current wave
2. Merge completed PRs (or instruct user to merge)
3. Wait for merge to propagate
4. Proceed to next wave: /taskmaestro wave-transition <next-wave-issues>
5. Repeat from Step 4.2
```

**Important:** Between waves, ensure merged code is available:
```bash
git fetch origin master:master
```

---

## Phase 5: Cleanup & Reporting

### Step 5.1: Collect Results

```bash
# Gather all PRs created during this session
for ISSUE in $ALL_ISSUES; do
  PR_INFO=$(gh pr list --search "Issue #${ISSUE}" --json number,url,state \
    --jq '.[] | "#\(.number) \(.url) \(.state)"')
  echo "Issue #${ISSUE}: ${PR_INFO:-NO PR FOUND}"
done
```

### Step 5.2: Generate Report

```markdown
# Parallel Issues Execution Report

**Date:** YYYY-MM-DD HH:MM
**Duration:** X hours Y minutes
**Issues:** N total, M completed, K failed

## Results by Wave

### Wave 1
| Issue | Title | PR | Status |
|-------|-------|----|--------|
| #732 | ... | #750 | ✅ Merged |
| #733 | ... | #751 | ✅ Merged |

### Wave 2
| Issue | Title | PR | Status |
|-------|-------|----|--------|
| #734 | ... | #755 | 🔄 Open |

## Merge Order
1. Wave 1: #750 → #751 → #752
2. Wave 2: #755 → #756

## Issues Requiring Attention
- #738: PR #760 has failing CI checks
```

### Step 5.3: Update Plan Document

Append results to the plan document created in Phase 2:

```bash
cat >> "${PLAN_DIR}/${PLAN_FILE}" <<'EOF'

## Execution Results

[Report from Step 5.2]
EOF
```

### Step 5.4: Update Parent Issue (if applicable)

If issues share a parent (detected via `--parent` flag or sub-issue relationships):

```bash
# Get current parent body
PARENT_BODY=$(gh issue view "$PARENT_NUM" --json body --jq .body)

# Add completion status comment
gh issue comment "$PARENT_NUM" --body "$(cat <<EOF
## Parallel Execution Complete

Executed ${TOTAL} sub-issues in ${WAVE_COUNT} waves via taskMaestro.

$(for ISSUE in $ALL_ISSUES; do
  echo "- #${ISSUE}: ${STATUS[$ISSUE]}"
done)
EOF
)"
```

---

## Escape Conditions

### Normal Exit
- All waves completed
- All PRs created and CI passing
- Report generated

### Early Exit — User Cancel
- User responds "Cancel" at approval step
- Clean up any temp files, report what was analyzed

### Error Exit
- Iron Rule violation detected after plan approval (should not happen)
- GitHub API failure (network, auth)
- tmux session crash

### Worker Escape (inside each AUTO mode worker)
- **Exit condition:** `Critical = 0 AND High = 0` in EVAL phase
- **Action on exit:** Run `/ship <issue-number>` to create PR
- **If stuck:** After 3 AUTO iterations without meeting exit condition, stop and report

---

## Error Handling

| Failure | Recovery |
|---------|----------|
| Issue not found | Skip issue, warn user, continue with remaining |
| File path extraction finds nothing | Mark as "unknown files", require manual wave assignment |
| Dependency cycle detected | Report cycle, ask user to break it |
| tmux pane timeout | Retry once, then skip issue and continue |
| PR creation fails in worker | Flag in report, don't block other workers |
| Wave transition fails | Stop, report status, let user decide |

---

## Reference Files

These files provide detailed guidance for specific aspects of the workflow.
Read them when executing the corresponding phase.

| File | Phase | Purpose |
|------|-------|---------|
| `references/auto-mode-template.md` | Phase 3 | Worker prompt template with full AUTO methodology |
| `references/wave-analysis-guide.md` | Phase 2 | Dependency analysis + wave splitting algorithm |
| `references/eval-criteria.md` | Phase 3 | EVAL severity classification for worker escape condition |
| `examples/2026-03-21-parallel-issues.md` | All | Real-world case study (#732-#743) |
