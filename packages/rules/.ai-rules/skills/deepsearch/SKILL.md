---
name: deepsearch
description: Use when simple grep/glob is insufficient and you need comprehensive, multi-pass codebase understanding
user-invocable: false
allowed-tools: Read, Grep, Glob, Bash
---

# Deep Search

## Overview

Single-pass searches miss connections. Grep finds strings, not understanding.

**Core principle:** ALWAYS search in multiple passes with increasing precision. A single query never gives the full picture.

**Violating the letter of this process is violating the spirit of thorough search.**

## The Iron Law

```
NO CONCLUSIONS WITHOUT CROSS-REFERENCED EVIDENCE FROM MULTIPLE PASSES
```

If you haven't completed at least Phases 1-3, your understanding is incomplete.

## When to Use

Use when simple grep/glob is **insufficient**:
- Understanding how a feature works end-to-end
- Tracing data flow across multiple files/modules
- Finding all usages and side effects before refactoring
- Detecting dead code or unused exports
- Mapping dependency chains
- Understanding implicit relationships (event emitters, dynamic imports, reflection)
- Auditing a pattern's usage across the codebase

**Use this ESPECIALLY when:**
- Initial search returns too many or too few results
- You need to understand "everything that touches X"
- The codebase uses indirection (dependency injection, plugins, event systems)
- You're about to make a breaking change
- You need confidence that nothing was missed

**Don't use when:**
- You know the exact file and symbol (use direct read)
- A single grep gives you the complete answer
- You're looking up a specific API signature

## The Four Phases

You MUST complete each phase before drawing conclusions.

### Phase 1: Broad Search — Cast a Wide Net

**Goal:** Discover all potentially relevant files and symbols.

1. **Start with Multiple Search Strategies**
   - Search by name: function names, class names, variable names
   - Search by pattern: string literals, error messages, log statements
   - Search by structure: file naming conventions, directory patterns
   - Search by type: imports, exports, type definitions

2. **Use Varied Query Terms**
   - Don't stop at the first query term
   - Try synonyms, abbreviations, related concepts
   - Search for both the interface and the implementation
   - Include test files — they reveal intended usage

3. **Record Everything**
   - Note every file that appears relevant
   - Note unexpected hits — they often reveal hidden connections
   - Note files that *should* have matched but didn't

**Output:** A list of all candidate files and symbols to investigate.

### Phase 2: Narrow Focus — Understand Each Hit

**Goal:** Read and understand each candidate in context.

1. **Classify Each Result**
   - Definition vs. usage vs. re-export
   - Direct dependency vs. indirect dependency
   - Active code vs. dead code vs. test code

2. **Read Surrounding Context**
   - Don't just read the matching line — read the function/class
   - Check imports at the top of the file
   - Check exports at the bottom
   - Read adjacent functions for related logic

3. **Build a Symbol Map**
   - Where is it defined?
   - Where is it imported?
   - Where is it called/used?
   - What calls it? (reverse dependency)

4. **Identify Indirection**
   - Dynamic imports (`import()`, `require()`)
   - String-based lookups (registries, plugin systems)
   - Event-driven connections (emit/on patterns)
   - Dependency injection (constructor injection, providers)
   - Configuration-driven behavior (feature flags, env vars)

### Phase 3: Cross-Reference — Connect the Dots

**Goal:** Map relationships between all discovered symbols and files.

1. **Trace Data Flow**
   - Follow data from source to sink
   - Input → transform → output for each function in the chain
   - Note where data shape changes (serialization, mapping)

2. **Trace Control Flow**
   - What triggers this code path?
   - What conditions must be true?
   - What error paths exist?
   - What happens on failure?

3. **Identify Dependency Chains**
   - A imports B imports C — trace the full chain
   - Circular dependencies — note them explicitly
   - Shared dependencies — what else depends on the same module?

4. **Check for Side Effects**
   - Global state mutations
   - File system operations
   - Database writes
   - External API calls
   - Cache invalidation

5. **Verify Completeness**
   - For every "used by" reference, verify the reverse "depends on"
   - Look for orphaned code that nothing references
   - Check for dynamic/runtime references that static search misses

### Phase 4: Validate — Confirm Your Understanding

**Goal:** Prove your mental model is correct.

1. **Test Your Hypothesis**
   - "If I change X, these files should be affected: [list]"
   - "This function is called in these scenarios: [list]"
   - "This code path is triggered by: [list]"
   - Verify each claim with evidence from the code

2. **Check for Gaps**
   - Are there files you expected to find but didn't?
   - Are there connections that seem missing?
   - Does the architecture diagram match the actual code?

3. **Look for Dead Code**
   - Exported but never imported
   - Defined but never called
   - Imported but never used
   - Behind feature flags that are always off

4. **Verify with Tests**
   - Do existing tests confirm your understanding?
   - Do test descriptions match your mental model?
   - Are there test cases for edge cases you identified?

5. **Summarize Findings**
   - List all files involved and their roles
   - Draw the dependency graph (text or description)
   - Note any risks, dead code, or inconsistencies found
   - Provide confidence level: high / medium / low

## Red Flags — STOP and Search Deeper

If you catch yourself thinking:
- "This is probably the only place it's used"
- "I found one result, that must be it"
- "The naming convention tells me everything"
- "I don't need to check test files"
- "Dynamic imports won't matter here"
- "This module is self-contained"
- "I can skip Phase 3, the connections are obvious"

**ALL of these mean: STOP. You're making assumptions. Return to Phase 1.**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Grep found it, I'm done" | Grep finds strings, not relationships. Continue to Phase 2. |
| "Only one file imports this" | Check for dynamic imports, re-exports, and test files. |
| "The naming is clear enough" | Names lie. Read the implementation. |
| "Tests aren't relevant" | Tests reveal intended behavior and edge cases. Always check. |
| "This is a small codebase" | Small codebases have hidden complexity too. Follow the process. |
| "I'll trace the rest later" | Incomplete understanding leads to broken refactors. Trace now. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Broad Search** | Multiple strategies, varied terms, record all | Complete candidate list |
| **2. Narrow Focus** | Classify, read context, build symbol map | Understand each hit |
| **3. Cross-Reference** | Trace data/control flow, find dependencies | Map all relationships |
| **4. Validate** | Test hypothesis, check gaps, verify with tests | Confirmed mental model |

## Search Strategy Checklist

Use this checklist to ensure thorough coverage:

- [ ] Searched by symbol name (exact and substring)
- [ ] Searched by string literals and error messages
- [ ] Searched by file/directory naming patterns
- [ ] Checked imports and exports
- [ ] Checked test files for usage examples
- [ ] Checked configuration files
- [ ] Traced dynamic/runtime references
- [ ] Verified reverse dependencies
- [ ] Looked for event-driven connections
- [ ] Checked for dead/unused code
