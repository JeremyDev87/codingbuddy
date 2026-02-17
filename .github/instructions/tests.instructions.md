---
applyTo: "**/*.{spec,test}.{ts,tsx}"
---

# Test Code Review

## Structure

- Follow Arrange-Act-Assert (AAA) pattern
- One logical assertion per test
- Descriptive test names that explain the behavior being tested
- Group related tests with describe blocks

## Quality

- No mocking — test real behavior with actual implementations
- Test edge cases: empty inputs, null values, boundary conditions
- Test error paths, not just happy paths
- Tests must be independent and not rely on execution order

## Coverage

- Core logic requires test-first TDD (Red → Green → Refactor)
- UI components allow test-after approach
- Target 90%+ coverage for core logic
