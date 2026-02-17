---
applyTo: "**/*.{ts,tsx}"
---

# TypeScript Code Review

## Type Safety

- Never use `any` — use `unknown`, generics, or specific types
- Enable and respect strict null checks
- Use discriminated unions for complex state
- Prefer type inference where obvious, explicit types for public APIs

## Patterns

- Prefer `readonly` for immutable data
- Use `as const` for literal types
- Avoid type assertions (`as`) — use type guards instead
- Use `satisfies` operator for type validation without widening

## Imports

- No circular imports
- Group imports: external → internal → relative
- Use named exports (avoid default exports)
