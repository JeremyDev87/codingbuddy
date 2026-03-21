# Rule Trigger Patterns

Patterns for writing clear, unambiguous trigger conditions in AI coding rules. A trigger defines **when** a rule activates — ambiguous triggers cause inconsistent AI behavior.

## Trigger Anatomy

```
**When:** <scope> + <condition> + <qualifier (optional)>
```

| Part | Purpose | Example |
|------|---------|---------|
| Scope | What code area | "In TypeScript files" |
| Condition | What is happening | "writing a new function" |
| Qualifier | Narrows further | "that is exported" |

## Pattern Catalog

### File-Scoped Triggers

```markdown
**When:** Creating or modifying a TypeScript file (.ts, .tsx)
**When:** Adding a new test file
**When:** Editing files in the `src/api/` directory
**When:** Working with migration files (`*.migration.ts`)
```

### Action-Scoped Triggers

```markdown
**When:** Writing a new function or method
**When:** Adding a dependency to package.json
**When:** Creating a new React component
**When:** Defining an API endpoint
**When:** Writing a database query
```

### Context-Scoped Triggers

```markdown
**When:** Implementing a feature that handles user input
**When:** Adding authentication or authorization logic
**When:** Modifying shared utility code used by 3+ modules
**When:** Changing code that runs in a CI/CD pipeline
```

### Negation Triggers (When NOT to Apply)

```markdown
**When:** NOT applicable:
- Prototype or spike code (marked with `// SPIKE:`)
- Generated code (auto-generated files)
- Third-party type definitions (`.d.ts`)
```

## Ambiguity Antipatterns

| Ambiguous Trigger | Problem | Fixed Trigger |
|-------------------|---------|---------------|
| "When appropriate" | Who decides? | "When the function has > 3 parameters" |
| "When necessary" | Always unclear | "When the module is imported by 2+ files" |
| "When writing code" | Too broad | "When writing exported functions" |
| "When dealing with errors" | Vague scope | "When implementing catch blocks in async functions" |
| "When it makes sense" | Subjective | "When the function performs I/O operations" |
| "In complex scenarios" | Undefined threshold | "When cyclomatic complexity exceeds 10" |

## Combining Triggers

### AND (all conditions must be true)

```markdown
**When:** Writing a new API endpoint AND the endpoint accepts user input
```

### OR (any condition activates)

```markdown
**When:** Creating a new module OR modifying a module's public API (exported types/functions)
```

### Conditional (if-then)

```markdown
**When:** Adding a new dependency
  - IF the dependency has no TypeScript types → also add `@types/<pkg>`
  - IF the dependency is > 50KB → document the size justification
```

## Trigger Strength Vocabulary

| Keyword | Strength | Meaning |
|---------|----------|---------|
| ALWAYS / MUST | Mandatory | No exceptions — rule fires every time |
| SHOULD / PREFER | Default | Rule fires unless there's a documented reason not to |
| CONSIDER / MAY | Advisory | Rule is a suggestion, not a requirement |
| NEVER / MUST NOT | Prohibition | Rule prevents an action unconditionally |

### Using Strength in Context

```markdown
### Input Validation

**When:** Writing a function that accepts external input (API request, form data, URL params)

**Do:** ALWAYS validate and sanitize input before processing.

**When:** Writing internal utility functions called only by trusted code

**Do:** CONSIDER adding input validation for defense-in-depth.
```

## Testing Your Triggers

For each trigger, ask:

1. **Can I give 3 concrete examples where this trigger fires?**
   - If not, the trigger is too vague.

2. **Can I give 3 concrete examples where this trigger does NOT fire?**
   - If not, the trigger is too broad.

3. **Would two different AI tools interpret this the same way?**
   - If not, add more specificity.

4. **Is the trigger observable from the code?**
   - Triggers based on intent ("when optimizing") are weaker than triggers based on observable state ("when the file contains a database query").
