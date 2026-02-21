---
name: context-management
description: Use when working on long tasks that span multiple sessions, when context compaction is a concern, or when decisions from PLAN mode need to persist through ACT and EVAL modes.
---

# Context Management

## Overview

AI assistant context windows are finite. Long tasks get compacted, earlier decisions are forgotten, and continuity breaks. Context management is the practice of preserving critical information so work survives compaction.

**Core principle:** If it matters after the current conversation, write it down. Memory is the enemy of continuity.

**Iron Law:**
```
EXTERNAL STATE > INTERNAL MEMORY
Write decisions to files. Files survive compaction; conversation memory does not.
```

## When to Use

- Starting a task that will span multiple sessions
- Beginning PLAN mode (decisions must survive to ACT)
- Completing ACT mode (progress must survive to EVAL)
- When conversation is approaching context limits
- Before any context compaction event
- When resuming work after a break

## The Context Document (codingbuddy)

The primary context persistence mechanism is `docs/codingbuddy/context.md`.

```
docs/codingbuddy/context.md
─────────────────────────────
This file is:
- Created/reset by PLAN mode
- Appended by ACT mode
- Appended by EVAL mode
- Always at a fixed, predictable path
- Safe to read at any point
```

### What Goes in Context

**PLAN mode writes:**
- Task description
- Key design decisions and their rationale
- Architecture choices
- Dependencies and constraints
- Recommended ACT agent

**ACT mode writes:**
- Progress milestones completed
- Files created/modified
- Implementation decisions made
- Issues encountered and resolved
- Next steps

**EVAL mode writes:**
- Quality findings (with severity)
- Security issues found
- Performance observations
- Recommendations for next iteration

### Context Document Format

```markdown
# Context: [Task Title]

## PLAN — [timestamp]
**Task:** [Original task description]
**Primary Agent:** solution-architect
**Recommended ACT Agent:** agent-architect

### Decisions
- Decision 1: [What was decided and why]
- Decision 2: [What was decided and why]

### Notes
- Implementation note 1
- Constraint or dependency to remember

---

## ACT — [timestamp]
**Primary Agent:** agent-architect

### Progress
- [x] Created RulesService with search capability
- [x] Added Tests: 12 passing
- [ ] SSE transport implementation pending

### Notes
- Used glob for file discovery (faster than readdir recursion)
- NestJS module structure: McpModule → RulesModule

---

## EVAL — [timestamp]

### Findings
- [HIGH] Missing rate limiting on /sse endpoint
- [MEDIUM] Test coverage at 72%, below 80% target

### Recommendations
- Add rate limiting middleware
- Add tests for error cases in RulesService
```

## Context Strategy by Task Duration

### Short Tasks (< 1 hour, single session)

No special context management needed. Conversation memory is sufficient.

### Medium Tasks (1-4 hours, 1-2 sessions)

```
1. Write task summary to context.md at start
2. Update progress at each major milestone
3. Write completion summary before ending session
```

### Long Tasks (multi-day, multiple sessions)

```
1. Create context.md with full plan (PLAN mode)
2. Create task breakdown in docs/codingbuddy/plan/
3. Update context.md after each working session
4. Begin each session by reading context.md
5. Use git commits as progress markers
```

## Session Start Protocol

When resuming a task:

```markdown
## Session Resume Checklist

1. Read context document:
   - docs/codingbuddy/context.md

2. Check git status:
   - What was last committed?
   - Any uncommitted changes?

3. Check task list:
   - What was pending at last session?

4. Verify environment:
   - Tests still passing?
   - Build still working?

5. Update context with session start note
```

## Session End Protocol

Before ending a session:

```markdown
## Session End Checklist

1. Commit all completed work with descriptive message

2. Update context document:
   - Mark completed items
   - Note pending items
   - Capture any decisions made

3. Note exact stopping point:
   - What file/function was being edited?
   - What was the next intended step?

4. If blocked: note the blocker clearly

5. Push to remote if collaborating
```

## Information Priority

When deciding what to preserve, use this priority:

```
MUST preserve:
- Architecture decisions (hard to reconstruct)
- Why (not what) was done — rationale survives code changes
- Open questions and blockers
- External dependencies and constraints

SHOULD preserve:
- Files created and their purpose
- Test coverage status
- Performance baseline numbers

CAN skip:
- Step-by-step implementation details (read the code)
- Obvious decisions (no need to record "used async/await")
- Information available in git history
```

## Context Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Relying on conversation memory | Compaction erases it | Write to file |
| Writing everything verbatim | Context file becomes noise | Summarize decisions, not steps |
| Never reading context file | Repeating work already done | Read at session start |
| Single monolithic context file | Hard to navigate | Split by phase (PLAN/ACT/EVAL) |
| Context file not in git | Lost if repo changes machines | Always commit context docs |

## notepad.md (OMC Alternative)

For sessions not using codingbuddy's parse_mode, use OMC's notepad:

```
notepad_write_priority: Critical info always loaded at session start
notepad_write_working:  Session-specific notes (auto-pruned after 7 days)
notepad_write_manual:   Permanent notes that must survive
```

**When to use notepad vs context.md:**
- `context.md` → For codingbuddy PLAN/ACT/EVAL workflow
- notepad → For ad-hoc sessions without formal workflow

## Quick Reference

```
Context File Locations:
──────────────────────
docs/codingbuddy/context.md    → Primary context (PLAN/ACT/EVAL)
docs/codingbuddy/plan/         → Detailed plan documents
~/.claude/notepad.md            → Global session notes (OMC)

Update Context via MCP:
──────────────────────
update_context(mode, decisions[], notes[], progress[], status)

Read Context via MCP:
──────────────────────
read_context(verbosity: minimal|standard|full)
```
