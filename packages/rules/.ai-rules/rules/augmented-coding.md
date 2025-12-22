# Augmented Coding Principles

Based on Kent Beck's approach: https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes

## Philosophy: Beyond Vibe Coding

### Vibe Coding vs Augmented Coding
- **Vibe Coding**: Don't care about code, only behavior. Feed errors back to AI hoping for fixes.
- **Augmented Coding**: Care about code quality, complexity, tests, and coverage. Same value system as hand coding—tidy code that works. You just don't type much of it.

**We practice Augmented Coding**: High standards for AI-generated code, same as hand-written code.

---

## TDD Cycle (Strict Adherence)

Follow the **Red → Green → Refactor** cycle religiously:

1. **Red**: Write a failing test that defines a small increment of functionality
2. **Green**: Implement the minimum code needed to make the test pass
3. **Refactor**: Improve structure only after tests are passing

### Core Rules
- Write one test at a time
- Make it pass with minimal code
- Run all tests after each change
- Never skip the refactor step

### TDD Strategy by Code Type

#### Core Logic (Test-First TDD)
Apply strict TDD to:
- API call functions
- Data models and hooks
- Utility functions
- Custom hooks with business logic

**Workflow:**
1. Write failing test
   - Define expected behavior
   - Cover edge cases
   - Cover error cases
2. Define types
3. Implement minimal code
4. Verify all tests pass
5. Refactor for clarity

#### UI Components (Test-After)
For visual components, implement first, then test:
- Feature components
- Composite widgets
- Reusable UI components

**Workflow:**
1. Define types
2. Define constants
3. Implement component
4. Write tests
5. Refactor

---

## Tidy First Approach

**Core Principle**: Separate structural changes from behavioral changes. Never mix them.

### Two Types of Changes

#### 1. Structural Changes (Tidy First)
Code reorganization without changing behavior:
- Renaming variables/functions/files
- Extracting methods
- Moving code between files
- Reorganizing imports
- Fixing formatting

**Validation**: Run tests before and after—they should all pass.

#### 2. Behavioral Changes
Adding or modifying actual functionality:
- New features
- Bug fixes
- Logic modifications
- API integrations

### Workflow Rule
When both types of changes are needed:
1. Make structural changes FIRST
2. Commit structural changes separately
3. Then make behavioral changes
4. Commit behavioral changes separately

**Never mix in the same commit.**

---

## Commit Discipline

### Only Commit When:
1. ✅ ALL tests are passing
2. ✅ ALL linter/compiler warnings resolved
3. ✅ Change represents a single logical unit of work
4. ✅ Commit message clearly states: structural OR behavioral change

### Commit Messages
- **Structural**: `refactor: extract validation logic to utils`
- **Behavioral**: `feat: add user registration endpoint`

Use small, frequent commits rather than large, infrequent ones.

---

## AI Monitoring Checkpoints

Watch AI carefully and intervene when you see:

### 🚨 Warning Signs (Stop AI Immediately)

1. **Unnecessary Loops**: AI generating complex loops when simpler solutions exist
2. **Unrequested Features**: AI adding functionality you didn't ask for (even if reasonable)
3. **Test Cheating**: AI disabling, deleting, or skipping tests
4. **Complexity Accumulation**: Code getting messier instead of cleaner
5. **Coding Ahead**: AI implementing beyond current test requirements

### ✅ Good AI Behavior

- Follows your exact instructions
- Implements only what's needed for current test
- Maintains or improves code simplicity
- Respects existing patterns
- Asks for clarification when uncertain

### Intervention Strategy

Review intermediate results continuously:
- Check code after each AI response
- Verify AI did exactly what you asked
- Stop and redirect if veering off track
- Propose specific next steps: "for the next test, add keys in reverse order"

---

## Code Quality Standards

### Core Principles (SOLID)
- **Single Responsibility**: Each function/class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for base types
- **Interface Segregation**: No client should depend on unused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions

### Quality Metrics
- **Eliminate Duplication**: DRY (Don't Repeat Yourself) ruthlessly
- **Express Intent Clearly**: Names and structure reveal purpose
- **Make Dependencies Explicit**: No hidden coupling
- **Keep Methods Small**: Single responsibility, 10-20 lines max
- **Minimize State**: Prefer pure functions, minimize side effects
- **Simplest Solution**: "What's the simplest thing that could possibly work?"

### Testing Standards
- **Coverage Goal**: 90%+ for all code
- **Test Structure**: `describe/it` pattern with clear names
- **No Mocking**: Test real behavior with actual implementations (or MSW for API mocking)
- **User Perspective**: Use Testing Library, test from user's viewpoint

---

## Refactoring Guidelines

### When to Refactor
- Only in the **Green** phase (all tests passing)
- After adding new functionality
- When you see duplication
- When intent is unclear

### How to Refactor
1. **One change at a time**: Single refactoring operation
2. **Run tests after each step**: Verify behavior unchanged
3. **Use named patterns**: Apply established refactoring patterns (Extract Method, Move Field, etc.)
4. **Prioritize clarity**: Remove duplication, improve naming

### Common Refactorings
- Extract Method/Function
- Rename Variable/Function
- Move Method
- Inline Temporary
- Replace Magic Number with Constant
- Extract Interface

---

## Testing Best Practices

### Test Naming
Use descriptive names that explain behavior:
```typescript
// ✅ Good
it('returns error when email format is invalid', () => {})
it('successfully creates user with valid data', () => {})

// ❌ Bad
it('test1', () => {})
it('handles input', () => {})
```

### Test Organization
```typescript
describe('UserRegistration', () => {
  describe('when input is valid', () => {
    it('creates user record', () => {})
    it('sends welcome email', () => {})
  })

  describe('when input is invalid', () => {
    it('returns validation error', () => {})
    it('does not create user', () => {})
  })
})
```

### Test Coverage Requirements
- **Core Logic**: 90%+ coverage required
- **UI Components**: Focus on user interactions and state changes
- **Edge Cases**: Always test boundaries and error conditions
- **Happy Path**: Test successful scenarios first, then failures

---

## Example Workflow

### Building a Feature with TDD

#### Step 1: Write First Test (Red)
```typescript
describe('useCreateUserMutation', () => {
  it('successfully creates user with valid data', async () => {
    const { result } = renderHook(() => useCreateUserMutation());

    await act(async () => {
      await result.current.mutate({ email: 'test@example.com', name: 'Test' });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});
```

#### Step 2: Minimal Implementation (Green)
```typescript
export const useCreateUserMutation = () => {
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await api.post('/users', data);
      return response.data;
    },
  });
};
```

#### Step 3: Verify Tests Pass
Run tests → All green ✅

#### Step 4: Refactor (If Needed)
Extract validation, improve error handling, etc.

#### Step 5: Commit
```bash
git commit -m "feat: add create user mutation hook"
```

#### Step 6: Next Test
```typescript
it('returns error when data is invalid', async () => {
  // ... next increment
});
```

Repeat until feature is complete.

---

## Integration with Project Rules

This file defines **HOW** we write code with AI.

See also:
- `core.md` - PLAN/ACT/EVAL modes and communication rules
- `project.md` - Tech stack, architecture, and project context

---

**Remember**: Programming with AI is still programming. Make more consequential decisions per hour, fewer boring decisions. Yak shaving goes away. Focus on architecture, design, and quality—let AI handle the typing.
