---
name: code-explanation
description: Use when explaining complex code to new team members, conducting code reviews, onboarding, or understanding unfamiliar codebases. Provides structured analysis from high-level overview to implementation details.
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---

# Code Explanation

## Overview

Understanding code is a prerequisite to improving it. Rushed explanations create misunderstanding that compounds over time.

**Core principle:** Explain at the right level of abstraction. Start high, drill down only when needed.

**Iron Law:**
```
READ BEFORE EXPLAINING. UNDERSTAND BEFORE SIMPLIFYING.
```

Never explain code you haven't fully read. Never simplify what you haven't fully understood.

## When to Use

- Onboarding new team members to a codebase
- Code review: explaining design decisions
- Understanding legacy code before modifying it
- Explaining an AI agent's recommendations
- Documenting complex algorithms or patterns
- Understanding error stack traces

## The Five Levels of Explanation

Choose the level based on your audience and purpose:

| Level | Audience | Goal | Depth |
|-------|----------|------|-------|
| **L1: Bird's Eye** | Non-technical stakeholders | What does this system do? | Architecture diagram |
| **L2: Module** | New developers | How is this organized? | Module/file structure |
| **L3: Function** | Developers onboarding | What does this code do? | Function by function |
| **L4: Line** | Debugging partners | Why is this written this way? | Line by line |
| **L5: Algorithm** | Algorithm review | How does this work mathematically? | Proof-level |

## The Explanation Process

### Phase 1: Read First

```
1. Read the entire file/function before explaining anything
2. Identify the core purpose (what problem does this solve?)
3. Note dependencies (what does this require?)
4. Note side effects (what does this change?)
5. Note error handling (what can go wrong?)
```

### Phase 2: Bird's Eye View (Always Start Here)

```markdown
**What this is:** One sentence describing purpose
**What problem it solves:** The business/technical need
**How it fits:** Where it sits in the larger system
**Key dependencies:** What it relies on
**Key outputs:** What it produces or modifies
```

**Example:**
```markdown
**What this is:** RulesService — file system reader for AI coding rules
**What problem it solves:** Provides a unified interface for reading and searching
  .ai-rules files regardless of directory structure
**How it fits:** Used by McpModule to serve rules via MCP protocol
**Key dependencies:** Node.js fs/promises, glob patterns
**Key outputs:** Array of Rule objects with name, content, and metadata
```

### Phase 3: Structure Walk-Through

Walk through the code structure before implementation details:

```typescript
// Before explaining each function, show the structure:

class RulesService {
  // 1. Constructor — sets up file paths
  constructor() { ... }

  // 2. getRules() — entry point, returns all rules
  async getRules(): Promise<Rule[]> { ... }

  // 3. searchRules() — filters rules by query
  async searchRules(query: string): Promise<Rule[]> { ... }

  // 4. Private: readRuleFile() — reads individual file
  private async readRuleFile(path: string): Promise<Rule> { ... }
}
```

### Phase 4: Deep Dive (Only When Requested)

Explain non-obvious implementation choices:

```typescript
// ❓ "Why is this using glob instead of fs.readdir?"
// ✅ "glob allows pattern matching across nested directories
//    (.ai-rules/**/*.md) without manual recursion. readdir
//    only lists one directory level."

const files = await glob('**/*.md', { cwd: this.rulesDir });
```

```typescript
// ❓ "Why is this async even though it looks synchronous?"
// ✅ "File I/O is always async in Node.js to avoid blocking
//    the event loop. Even a small file read blocks for ~1-5ms
//    which multiplies badly under load."

const content = await fs.readFile(filePath, 'utf-8');
```

### Phase 5: Mental Model

Finish with a mental model the reader can hold in their head:

```
RulesService mental model:
─────────────────────────
  .ai-rules/             ← Root directory
  └── rules/core.md      ← Each .md file becomes a Rule
  └── agents/planner.json ← Each .json becomes an Agent

  getRules() = "read all files, return as array"
  searchRules() = "filter that array by content match"
  getAgent() = "read specific JSON file, parse it"
```

## Explanation Templates

### For Functions

```markdown
### `functionName(params): returnType`

**Purpose:** [One sentence — what does it do?]

**Parameters:**
- `param1` — [What it represents, valid range/values]
- `param2` — [What it represents, valid range/values]

**Returns:** [What is returned, in what shape]

**Side effects:** [What does it change outside itself?]

**Error cases:** [What errors can it throw and when?]

**Example:**
\`\`\`typescript
const result = functionName('input', { option: true });
// result === { expected: 'output' }
\`\`\`
```

### For Classes

```markdown
### `ClassName`

**Responsibility:** [Single responsibility in one sentence]

**Lifecycle:**
1. Construction — [What happens when created]
2. Usage — [How it's used]
3. Cleanup — [Any teardown needed]

**Key methods:**
- `method1()` — [Purpose]
- `method2()` — [Purpose]

**Dependencies injected:**
- `Dependency1` — [Why it needs this]
```

### For Complex Algorithms

```markdown
### Algorithm: [Name]

**Problem:** [What problem does this solve?]

**Approach:** [High-level strategy]

**Complexity:** O([time]) time, O([space]) space

**Step-by-step walkthrough:**

Given input `[example input]`:
1. Step 1 → intermediate result
2. Step 2 → intermediate result
3. Final step → `[expected output]`

**Edge cases handled:**
- Empty input: [behavior]
- Single element: [behavior]
- Duplicate values: [behavior]
```

## Onboarding Guide Format

When explaining a whole codebase to a new team member:

```markdown
# [Project Name] Codebase Guide

## In 30 Seconds

[What this system does, who uses it, why it exists]

## Mental Model

[ASCII diagram of key components and data flow]

## Start Here

1. Read `src/main.ts` — entry point
2. Read `src/app.module.ts` — understand module structure
3. Read `src/mcp/mcp.service.ts` — core business logic

## Key Concepts

**[Concept 1]:** [Explanation with code example]
**[Concept 2]:** [Explanation with code example]

## Common Tasks

- "How do I add a new rule?" → See `packages/rules/.ai-rules/`
- "How do I add a new agent?" → See `packages/rules/.ai-rules/agents/`
- "How do I run tests?" → `yarn test`

## What to Avoid

- [Common mistake 1 and why]
- [Common mistake 2 and why]
```

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll explain as I read" | Read first, explain second |
| "The code is self-explanatory" | It's never self-explanatory to someone new |
| "Just look at the tests" | Tests explain behavior, not intent |
| "I'll summarize without reading" | Summaries from unread code spread misinformation |

## Quick Reference

| Situation | Explanation Level |
|-----------|------------------|
| New to project | L1 → L2 → L3 on request |
| Code review | L3 — function by function |
| Debugging together | L4 — line by line |
| Algorithm discussion | L5 — mathematical |
| Stakeholder demo | L1 only |
