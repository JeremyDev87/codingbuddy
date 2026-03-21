# Rule Template

Copy this template when writing new AI coding rules for `.ai-rules/rules/`.

---

## Rule File Template

```markdown
# <Category Name>

<Brief description of what rules in this file govern and why they matter.>

## Rules

### <Rule Name>

**When:** <Specific trigger condition — when does this rule activate?>

**Do:** <Concrete action in imperative mood. One sentence.>

**Don't:** <Specific anti-pattern to avoid. One sentence.>

**Check:** <How to verify the rule was followed — must be testable.>

**Example:**

\`\`\`typescript
// Good
<correct code example>

// Bad
<incorrect code example>
\`\`\`

**Why:** <One-sentence rationale linking to a real consequence.>

---

### <Next Rule Name>

...

## Rationale

<Why these rules exist for this project. Link to incidents, standards, or team decisions.>

## Exceptions

<Cases where these rules do not apply. Keep this list short — fewer exceptions = less ambiguity.>
```

---

## Filled Example

```markdown
# TypeScript Strictness

Rules for maintaining type safety across the codebase.

## Rules

### No `any` Type

**When:** Writing or modifying TypeScript code.

**Do:** Use explicit types for all function parameters and return values. Use `unknown` for truly unknown types, then narrow with type guards.

**Don't:** Use `any` — it disables the compiler's ability to catch errors.

**Check:** `npx tsc --noEmit` passes with `noImplicitAny: true` in tsconfig.json.

**Example:**

\`\`\`typescript
// Good
function parseInput(raw: unknown): ParsedData {
  if (typeof raw !== 'string') throw new TypeError('Expected string');
  return JSON.parse(raw) as ParsedData;
}

// Bad
function parseInput(raw: any): any {
  return JSON.parse(raw);
}
\`\`\`

**Why:** `any` silently propagates through the type system and causes runtime errors that the compiler should have caught.

---

### Explicit Return Types on Exported Functions

**When:** Defining a function that is exported from a module.

**Do:** Annotate the return type explicitly.

**Don't:** Rely on type inference for public API boundaries.

**Check:** ESLint rule `@typescript-eslint/explicit-function-return-type` on exported functions.

**Example:**

\`\`\`typescript
// Good
export function calculateTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Bad
export function calculateTotal(items: LineItem[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

**Why:** Explicit return types act as documentation and prevent accidental API changes when internal implementation changes.

## Rationale

TypeScript strict mode catches ~40% of bugs at compile time. These rules ensure we get the full benefit of the type system.

## Exceptions

- Test files (`.test.ts`, `.spec.ts`) may use `as` casting for test fixtures.
- Third-party library type augmentation files may require `any` in `.d.ts` declarations.
```

---

## Checklist Before Committing a New Rule

```
- [ ] "When" trigger is specific (not "always" or "when appropriate")
- [ ] "Do" action is imperative and unambiguous
- [ ] "Don't" anti-pattern is concrete
- [ ] "Check" criterion is automatable or clearly verifiable
- [ ] Example shows both correct and incorrect code
- [ ] "Why" links to a real consequence (not "best practice")
- [ ] Rule doesn't duplicate an existing rule
- [ ] Rule works with all target AI tools (Claude, Cursor, Copilot, Q, Kiro)
```
