---
name: error-analysis
description: Use when encountering error messages, stack traces, or unexpected application behavior. Provides structured analysis to understand root cause before attempting any fix.
---

# Error Analysis

## Overview

Errors are information. Stack traces are maps. Reading them carefully reveals root cause faster than guessing.

**Core principle:** Classify the error before diagnosing it. Different error classes have different diagnostic approaches.

**Relationship to systematic-debugging:** Use `error-analysis` to understand WHAT the error is and WHERE it originates. Use `systematic-debugging` to find WHY it happens and implement the fix.

**Iron Law:**
```
READ THE ENTIRE STACK TRACE BEFORE FORMING ANY HYPOTHESIS
```

The answer is almost always in the error message. Most debugging failures are reading failures.

## When to Use

- Encountering a new error message
- Stack trace from production logs
- Unexpected application behavior (silent failure)
- CI/CD pipeline failures
- Type errors, runtime errors, build errors

## Error Classification

First, classify the error type:

| Class | Symptoms | Common Causes |
|-------|----------|--------------|
| **Syntax Error** | Fails at parse/compile time | Typo, missing bracket, wrong syntax |
| **Type Error** | TypeScript compiler error | Wrong type, missing null check |
| **Runtime Error** | Fails during execution | Null reference, division by zero |
| **Logic Error** | Wrong output, no crash | Algorithm mistake, off-by-one |
| **Network Error** | Connection failures | Service down, timeout, firewall |
| **Config Error** | App won't start | Missing env var, wrong path |
| **Concurrency Error** | Intermittent failures | Race condition, deadlock |
| **Memory Error** | Growing memory, crash | Memory leak, large allocation |

## Reading Stack Traces

### Anatomy of a Stack Trace

```
Error: Cannot read properties of undefined (reading 'name')  ← Error type + message
    at RulesService.getRule (/app/src/rules/rules.service.ts:42:18)  ← Closest to error
    at McpService.handleTool (/app/src/mcp/mcp.service.ts:87:32)
    at McpModule.dispatch (/app/src/mcp/mcp.module.ts:23:12)  ← Furthest from error
```

**Reading order:**
1. **Error message** — WHAT went wrong
2. **First frame** — WHERE it broke (your code closest to error)
3. **Subsequent frames** — HOW we got there (call chain)
4. **Last frame** — ENTRY POINT that triggered the chain

### Stack Trace Analysis Template

```markdown
## Error Analysis

**Error type:** [TypeError / ReferenceError / etc.]
**Error message:** [Exact message]
**File:** [filename:line:column]
**Function:** [function where error occurred]

**Call chain:** (read bottom to top)
1. Entry: [how it started]
2. → [intermediate call]
3. → [proximate cause]

**Initial hypothesis:** [What do I think is undefined/null/wrong?]
**Evidence needed:** [What do I need to verify the hypothesis?]
```

### Common Error Patterns

```typescript
// ❌ "Cannot read properties of undefined (reading 'X')"
// → Something is undefined that you expected to exist
// → Look at the line: what object is being accessed?
// → Trace back: where was this object supposed to come from?

const user = await getUser(id);
console.log(user.name); // → user is undefined when id not found
// Fix: check if user exists before accessing properties

// ❌ "is not a function"
// → Called something that isn't a function
// → Often: wrong import, undefined module, this binding issue
import { something } from './module'; // wrong path → undefined
something(); // → TypeError: something is not a function

// ❌ "Cannot find module"
// → Module doesn't exist at specified path
// → Check: path correct? file exists? compiled?

// ❌ "ENOENT: no such file or directory"
// → File system path doesn't exist
// → Check: relative vs absolute path, working directory
```

## Diagnostic Process

### Phase 1: Classify and Locate

```
1. What class of error is this? (see table above)
2. What file and line number? (first frame in stack)
3. What was the application doing when it failed?
   (context: which API endpoint, which user action, which test)
4. Is it reproducible? (always / sometimes / once)
5. When did it start? (new error or regression?)
```

### Phase 2: Understand the Context

```typescript
// For "Cannot read properties of undefined"
// Add temporary logging to understand what's actually there:

// Before:
const result = await this.rulesService.getRule(name);
return result.content; // ← crashes

// Add logging:
const result = await this.rulesService.getRule(name);
console.error('DEBUG result:', JSON.stringify(result, null, 2));
return result.content;
```

**Common context questions:**
- What is the actual value vs expected value?
- What are the function inputs?
- What state was the application in?
- Is this error path tested?

### Phase 3: Trace to Origin

Follow the error backward through the call chain:

```
Frame 1: rules.service.ts:42 — result.content crashes
→ result is undefined
→ What could make getRule return undefined?

Frame 2: rules.service.ts:35 — find() returns undefined when no match
→ Why didn't it find the rule?

Frame 3: rules.service.ts:28 — rules array
→ How was rules array populated?
→ Ah: readRulesDirectory() failed silently on missing directory
→ ROOT CAUSE: directory path wrong, no error thrown
```

### Phase 4: Form Hypothesis

```markdown
**Hypothesis:** [Specific, testable statement]

Example: "The rules directory path is built from `__dirname` which
resolves to the dist/ folder in production, but .ai-rules is at
the project root, so the path is wrong."

**Evidence to gather:**
- Log the actual `rulesDir` path at startup
- Check if directory exists at that path in production

**Falsification:** If the path is correct, this hypothesis is wrong
```

## Error Catalog

### TypeScript Errors

```typescript
// TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
// → Type mismatch. Use explicit casting only if you know the type is correct.

// TS2339: Property 'X' does not exist on type 'Y'
// → Accessing property that doesn't exist. Check interface definition.

// TS7006: Parameter 'X' implicitly has an 'any' type
// → TypeScript strict mode requires explicit types. Add the type.

// TS2532: Object is possibly 'undefined'
// → Add null check: if (x !== undefined) or use optional chaining x?.y
```

### Node.js Runtime Errors

```
ECONNREFUSED → Service not running or wrong port
EADDRINUSE   → Port already in use
ENOENT       → File/directory doesn't exist
EMFILE       → Too many open file handles (leak)
ENOMEM       → Out of memory
```

### NestJS / MCP Errors

```typescript
// "Nest can't resolve dependencies"
// → Circular dependency or missing provider in module
// → Check: is the service in the module's providers array?

// "Cannot GET /endpoint" (404)
// → Route not registered or wrong HTTP method
// → Check: @Controller prefix + @Get/Post path

// MCP: "Method not found"
// → Tool/Resource/Prompt name not registered
// → Check: capability registration in McpService
```

## Quick Reference

| Error Pattern | First Check |
|--------------|------------|
| `undefined reading 'X'` | What should X be? Where does it come from? |
| `is not a function` | Is the import correct? Is it actually exported? |
| `Cannot find module` | Does the file exist? Is the path correct? |
| `ENOENT` | Is the file path absolute? Does it exist? |
| Intermittent failure | Is there shared mutable state? Race condition? |
| Works locally, fails in CI | Environment variable missing? Path difference? |

## Output Format

```markdown
## Error Analysis Summary

**Error:** [class] — [message]
**Location:** [file:line]
**Reproducible:** Yes / No / Intermittent

**Root Cause:** [One clear sentence]

**Evidence:** [What confirms the root cause]

**Fix:** [What needs to change]
**Prevents recurrence:** [Test to add or check to add]

→ Hand off to systematic-debugging skill for implementation
```
