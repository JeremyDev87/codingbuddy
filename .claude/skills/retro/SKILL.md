---
name: retro
description: >-
  Use after completing parallel/batch work, multi-step plan execution,
  or any session where surprises occurred (good or bad) and learnings
  should be captured before context fades.
disable-model-invocation: true
argument-hint: [context-file-or-description]
allowed-tools: Bash, Read, Write, Grep, Glob
user-invocable: true
---

# Structured Retrospective

Analyze what happened in the current session, extract learnings, and turn them into durable improvements — rules, feedback memories, or GitHub issues.

Follow every step in order. Stop and report if any step fails.

## Core Principle

**Learnings decay.** If a retrospective doesn't happen immediately after the work, the insights are lost. Capture them while context is fresh, classify them by type, and route them to the right destination so they compound over time.

## The Iron Law

```
NO RETRO WITHOUT EVIDENCE.
Every Keep, Problem, and Action must cite a specific event from the session — not a general feeling.
```

## When to Use

- After completing parallel/batch work (taskmaestro waves, swarm, ultrawork)
- After a multi-step plan execution (PLAN → ACT → EVAL cycle)
- After a significant debugging session
- After any session where something surprising happened (good or bad)
- When the user explicitly asks to reflect on recent work

**Don't use when:**
- The session was trivial (single file edit, quick fix)
- No context.md or session history exists to analyze

## Step 1: Gather Session Context

Read the session history from `docs/codingbuddy/context.md`:

```bash
cat docs/codingbuddy/context.md
```

If the file does not exist or is empty, check for alternative sources:

1. `$ARGUMENTS` — the user may pass a file path or description
2. Git log for recent commits on the current branch: `git log --oneline -20`
3. If no context is found, stop and tell the user: "No session history found. Run a PLAN → ACT cycle first, or pass a context file as argument."

Collect:
- **Tasks attempted** — what was planned
- **Tasks completed** — what actually shipped
- **Tasks failed or blocked** — what didn't work and why
- **Timeline** — rough sequence of events

## Step 2: Keep Analysis

Identify what went well. For each item:

| Field | Description |
|-------|-------------|
| **What** | The specific thing that worked |
| **Evidence** | Where in the session this happened (commit, step, decision) |
| **Why it worked** | Root cause of success — not luck, but a reproducible reason |

Ask:
- What practices should we repeat?
- What decisions saved time or prevented issues?
- What tools or patterns proved valuable?

Output as a numbered list:

```
### Keeps
1. **[What]** — [Evidence]. [Why it worked].
2. ...
```

## Step 3: Problem + Root-Cause Analysis

Identify what went wrong or could be improved. For each item:

| Field | Description |
|-------|-------------|
| **What** | The specific problem or friction |
| **Evidence** | Where in the session this happened |
| **Impact** | Time lost, quality degraded, or risk introduced |
| **Root Cause** | Apply 5-Whys — dig past the symptom |

Severity classification:

| Severity | Definition |
|----------|------------|
| **Critical** | Caused data loss, broken deploy, or security issue |
| **High** | Wasted > 30 minutes or required full rework |
| **Medium** | Caused friction but was resolved within the session |
| **Low** | Minor annoyance, cosmetic, or hypothetical risk |

Output as a numbered list:

```
### Problems
1. **[Severity]** [What] — [Evidence]. Root cause: [5-Whys result].
2. ...
```

## Step 4: Classify Learnings

For every Keep and Problem, classify the learning into exactly one category:

| Category | Destination | When to use |
|----------|-------------|-------------|
| **rule** | `.ai-rules/` or CLAUDE.md | The learning is a universal principle that should apply to all future sessions |
| **memory** | Feedback memory file | The learning is specific to this user, project, or workflow preference |
| **automation** | New skill or GitHub issue | The learning can be automated — a script, hook, or skill can prevent/enforce it |
| **none** | No action needed | Already known, already automated, or too situational to generalize |

Output as a table:

```
### Classification

| # | Learning | Category | Destination | Action |
|---|----------|----------|-------------|--------|
| 1 | [summary] | rule | CLAUDE.md | Add rule: "..." |
| 2 | [summary] | memory | feedback_xxx.md | Save feedback: "..." |
| 3 | [summary] | automation | GitHub issue | Create issue: "..." |
| 4 | [summary] | none | — | — |
```

## Step 5: Generate Action Items

For each learning classified as **rule**, **memory**, or **automation**, create a concrete action item:

### For `rule` items:
- Draft the exact rule text
- Identify the target file (CLAUDE.md, `.ai-rules/rules/core.md`, etc.)
- Format: `Add to [file]: "[rule text]"`

### For `memory` items:
- Draft the feedback memory content following the project's memory format:
  ```markdown
  ---
  name: feedback_[topic]
  description: [one-line description]
  type: feedback
  ---

  [Rule itself]

  **Why:** [reason from the session]
  **How to apply:** [when this guidance kicks in]
  ```

### For `automation` items:
- Draft a GitHub issue body compatible with `/plan-to-issues`:
  ```markdown
  ## Purpose
  [What this automation prevents or enables]

  ## Changes
  - [file or component to create/modify]

  ## Acceptance Criteria
  - [ ] [verifiable criterion]
  ```

## Step 6: Save Feedback Memories

For each `memory` classified item from Step 4:

1. Check if a similar feedback memory already exists:
   ```bash
   ls ~/.claude/projects/*/memory/feedback_*.md 2>/dev/null
   grep -rl "[keyword]" ~/.claude/projects/*/memory/ 2>/dev/null
   ```

2. If exists → update the existing file
3. If new → create the memory file and update MEMORY.md index

**Rules:**
- One memory per learning — don't bundle unrelated learnings
- Use the project's established memory format (frontmatter + content)
- Memory name must be descriptive: `feedback_[topic].md`

## Step 7: Create GitHub Issues (Optional)

For each `automation` classified item from Step 4:

1. Ask the user: "Create GitHub issues for [N] automation items? (y/n)"
2. If yes, for each item create an issue:
   ```bash
   gh issue create --title "feat: [title]" --body "$(cat <<'EOF'
   ## Purpose
   [from Step 5]

   ## Changes
   [from Step 5]

   ## Acceptance Criteria
   [from Step 5]
   EOF
   )"
   ```
3. If the user declines, print the issue drafts so they can create them later.

**Rules:**
- Never create issues without user confirmation
- Add label `feat` for new automations, `improvement` for enhancements
- Link back to the session context if relevant

## Step 8: Report

Print a summary of the retrospective:

```
## Retro Summary

### Session
- **Branch**: [current branch]
- **Commits**: [N commits in session]
- **Context file**: docs/codingbuddy/context.md

### Results
- **Keeps**: [N] identified
- **Problems**: [N] identified ([critical], [high], [medium], [low])
- **Actions**: [N] total
  - Rules added/updated: [N]
  - Feedback memories saved: [N]
  - GitHub issues created: [N]
  - No action needed: [N]

### Action Items
1. [action summary] → [destination] ✅ Done / 📋 Draft
2. ...
```
