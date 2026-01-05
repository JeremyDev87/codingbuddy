# Implement TDD Command

## Description
Execute TDD workflow following Red → Green → Refactor cycle with .ai-rules standards.

## Command
```bash
# Read TDD guidelines
READ packages/rules/.ai-rules/rules/augmented-coding.md

# Follow TDD cycle
IMPLEMENT using TDD cycle:
1. RED: Write failing test
2. GREEN: Minimal implementation
3. REFACTOR: Improve structure
4. COMMIT: After green phase

# Quality checks
MAINTAIN:
- TypeScript strict mode (no any)
- 90%+ test coverage
- Pure/impure function separation
- SOLID principles

# Run tests after each step
RUN tests and verify coverage

# Output in Korean
RESPOND in Korean (한국어)
```

## Usage
```bash
# In OpenCode CLI
/implement-tdd
```

## Quality Standards
- No mocking principle
- Real API integration only
- Evidence-based testing
- Incremental commits