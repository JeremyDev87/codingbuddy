---
name: rule-authoring
description: Use when writing AI coding rules for codingbuddy that must work consistently across multiple AI tools (Cursor, Claude Code, Codex, GitHub Copilot, Amazon Q, Kiro). Covers rule clarity, trigger design, and multi-tool compatibility.
---

# Rule Authoring

## Overview

AI coding rules are instructions that shape how AI assistants behave. Poorly written rules are ignored, misinterpreted, or cause inconsistent behavior across tools.

**Core principle:** Rules must be unambiguous, actionable, and testable. If an AI assistant can interpret a rule two different ways, it will choose the wrong one at the worst moment.

**Iron Law:**
```
EVERY RULE MUST HAVE A TESTABLE "DID IT WORK?" CRITERION
```

## When to Use

- Writing new rules for `.ai-rules/rules/`
- Updating existing rules that produce inconsistent behavior
- Adapting rules for a new AI tool (cursor, codex, q, kiro)
- Auditing rules for ambiguity or overlap

## Rule Quality Criteria

A good rule is:

| Quality | Bad Example | Good Example |
|---------|-------------|--------------|
| **Specific** | "Write good code" | "Functions must have a single return type" |
| **Actionable** | "Be careful with auth" | "All endpoints must check authentication before executing" |
| **Testable** | "Follow best practices" | "Test coverage must be ≥ 80% for new files" |
| **Bounded** | "Always use TypeScript" | "Use TypeScript strict mode in all .ts files" |
| **Non-overlapping** | Two rules about the same thing | One rule per concern |

## Rule Structure

### Core Rule Format

```markdown
## [Rule Category]: [Rule Name]

**When:** [Trigger condition — when does this rule apply?]

**Do:** [Specific action to take]

**Don't:** [Specific anti-pattern to avoid]

**Example:**
\`\`\`typescript
// ✅ Good
function getUser(id: string): Promise<User>

// ❌ Bad
function getUser(id: any): any
\`\`\`

**Why:** [One-sentence rationale]
```

### Rule File Structure

```markdown
# [Category Name]

Brief description of what rules in this file govern.

## Rules

### Rule 1: [Name]
...

### Rule 2: [Name]
...

## Rationale

Why these rules exist for this project.

## Exceptions

Cases where these rules do not apply (keep this list short).
```

## Writing Process

### Phase 1: Identify the Rule Need

```
1. What behavior is inconsistent or incorrect?
   → "AI assistants sometimes use 'any' type in TypeScript"

2. What is the desired behavior?
   → "All variables must have explicit types"

3. What is the trigger condition?
   → "When writing TypeScript code"

4. Can an AI verify compliance?
   → "Yes: TypeScript compiler will error on 'any' in strict mode"

5. Is there already a rule covering this?
   → Check existing rules in .ai-rules/rules/
```

### Phase 2: Write the Rule

**Template:**
```markdown
### [Rule Name]

**When:** [Specific trigger condition]

**Do:** [Concrete action in imperative mood]

**Don't:** [Specific anti-pattern]

**Check:** [How to verify the rule was followed]
```

**Good examples:**
```markdown
### No `any` Type

**When:** Writing TypeScript code

**Do:** Always specify explicit types for function parameters and return values

**Don't:** Use `any` type — use `unknown` for truly unknown types, then narrow

**Check:** TypeScript compiler passes with `noImplicitAny: true` in tsconfig

---

### Test Before Implement (TDD)

**When:** Implementing a new function or feature

**Do:** Write the failing test first, then write minimal implementation to pass it

**Don't:** Write implementation first and add tests after

**Check:** Running tests shows RED (failure) before GREEN (pass)
```

### Phase 3: Test Multi-Tool Compatibility

Different AI tools parse rules differently. Test your rules with each tool:

```
Compatibility checklist for each new rule:

Claude Code:
- [ ] Rule triggers correctly from CLAUDE.md or custom-instructions.md
- [ ] Rule doesn't conflict with default Claude behavior

Cursor:
- [ ] Rule works in .cursorrules or .cursor/rules/
- [ ] Pattern matching works as expected

GitHub Copilot / Codex:
- [ ] Rule understandable from .github/copilot-instructions.md
- [ ] No Copilot-specific syntax required

Amazon Q:
- [ ] Compatible with .q/rules/ format

Kiro:
- [ ] Compatible with .kiro/ format
```

### Phase 4: Anti-Ambiguity Review

Read each rule and ask: "Could this be interpreted two different ways?"

**Ambiguity red flags:**
```
❌ "appropriate" → What's appropriate? Define it.
❌ "when necessary" → When is that? Specify the condition.
❌ "best practices" → Which ones? List them.
❌ "avoid" → How strongly? Use "never" or "prefer X over Y".
❌ "clean code" → What does clean mean? Measurable criteria only.
```

**Ambiguity fixes:**
```
❌ "Use appropriate error handling"
✅ "Catch specific error types, never catch Exception or Error base class"

❌ "Write clean functions"
✅ "Functions must be ≤ 30 lines and have a single return type"

❌ "When necessary, add comments"
✅ "Add comments only for non-obvious logic. Self-documenting code needs no comments."
```

## Rule Categories

| Category | File | Covers |
|----------|------|--------|
| Core workflow | `rules/core.md` | PLAN/ACT/EVAL modes, TDD |
| Project | `rules/project.md` | Tech stack, architecture |
| Augmented coding | `rules/augmented-coding.md` | Code quality, testing |

## Adapter-Specific Formatting

### Claude Code (`adapters/claude-code.md`)

```markdown
## Claude Code Specific Rules

- Use `parse_mode` for PLAN/ACT/EVAL detection
- Follow `dispatch_agents` pattern for parallel agents
- Context persists via `docs/codingbuddy/context.md`
```

### Cursor (`adapters/cursor.md`)

```markdown
## Cursor-Specific Rules

Rules in `.cursorrules` are parsed line-by-line.
Keep rules to one line each for Cursor compatibility.
```

### Codex (`adapters/codex.md`)

```markdown
## GitHub Copilot / Codex Rules

Place in `.github/copilot-instructions.md`.
Copilot prefers explicit examples over abstract rules.
```

## Rule Maintenance

### Auditing Existing Rules

```bash
# Find rules that haven't been updated recently
git log --since="6 months ago" -- packages/rules/.ai-rules/rules/

# Find duplicate rule concepts
grep -h "^###" packages/rules/.ai-rules/rules/*.md | sort | uniq -d
```

**Quarterly audit questions:**
1. Is this rule still relevant to our current stack?
2. Is this rule being followed consistently?
3. Does this rule conflict with any new tool defaults?
4. Are there new patterns that need new rules?

## Quick Reference

```
Rule Strength Vocabulary:
─────────────────────────
MUST / ALWAYS     → Required, no exceptions
SHOULD / PREFER   → Default behavior, exceptions allowed
AVOID / PREFER NOT → Discouraged, explain if used
NEVER / MUST NOT  → Prohibited
```

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "This rule is obvious" | Write it anyway — different AI tools need explicit guidance |
| "The existing rule covers this" | Check carefully — overlap causes conflicts |
| "Rules don't need testing" | Test with each target AI tool |
| "Abstract rules are more flexible" | Abstract rules are ignored or misapplied |

## Additional resources

- [Rule template](examples/rule-template.md) — Copy-and-adapt template with filled example and pre-commit checklist
- [Trigger patterns](examples/trigger-patterns.md) — Catalog of clear trigger patterns, ambiguity antipatterns, and strength vocabulary
