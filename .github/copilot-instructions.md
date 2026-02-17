# Copilot Code Review Instructions

## Review Priority Levels

- **🔴 CRITICAL (Block merge)**: Security vulnerabilities, logic errors, breaking changes, data loss risks
- **🟡 IMPORTANT (Requires discussion)**: Code quality issues, missing tests, performance bottlenecks, architectural deviations
- **🟢 SUGGESTION (Non-blocking)**: Readability improvements, minor optimizations, best practice refinements

## Security Review

- Check for hardcoded secrets, API keys, or credentials
- Look for SQL injection and XSS vulnerabilities
- Verify proper input validation and sanitization
- Check for command injection in shell executions
- Ensure authentication/authorization is properly implemented
- Verify dependencies don't have known vulnerabilities

## TypeScript Standards

- No `any` type usage — use `unknown` or specific types with strict mode
- Prefer `const` over `let`, never use `var`
- Use explicit return types for public functions
- Ensure proper null/undefined handling with strict null checks
- Prefer pure functions over impure ones (separate files for pure/impure)

## Code Quality

- Functions should follow Single Responsibility Principle (10-20 lines max)
- No deeply nested code (max 3-4 levels)
- No magic numbers — use named constants
- Remove dead code and unused imports
- DRY: No duplicated logic across files
- Keep methods small and focused

## Testing Standards

- Core logic (entities, shared/utils, hooks) MUST have tests (TDD approach)
- UI components (features, widgets) should have test-after coverage
- Target 90%+ test coverage
- No mocking — test real behavior with actual implementations
- Use Arrange-Act-Assert pattern
- Test edge cases and error paths

## Architecture

- Layer dependency: app → widgets → features → entities → shared
- No circular dependencies between modules
- Server Components as default, Client Components only when necessary
- Pure/impure function separation (different files)

## NestJS Patterns (MCP Server)

- Follow NestJS module pattern (Module → Controller/Gateway → Service)
- Use dependency injection properly
- Validate DTOs with class-validator decorators
- Handle errors with proper NestJS exception filters

## Commit & PR Standards

- Conventional commits format (feat:, fix:, refactor:, test:, docs:, chore:)
- Each PR should be focused on a single concern
- PR description must explain "why", not just "what"
