# PLAN Feature Command

## Description
Analyze requirements and create structured implementation plan following .ai-rules standards.

## Command
```bash
# Read context
READ packages/rules/.ai-rules/rules/core.md
READ packages/rules/.ai-rules/rules/project.md  
READ packages/rules/.ai-rules/rules/augmented-coding.md

# Analyze project state
RUN git status
RUN git log --oneline -10

# Create plan
PLAN implementation for: $1
- Follow TDD cycle for core logic
- Use Test-After for UI components
- Maintain 90%+ test coverage
- Apply SOLID principles
- Generate todo list with priorities
- Include risk assessment

# Output in Korean
RESPOND in Korean (한국어)
```

## Usage
```bash
# In OpenCode CLI
/plan-feature "사용자 등록 기능"
```

## Expected Output
- Structured PLAN mode response
- Todo list creation using todo_write tool
- TDD vs Test-After strategy decision
- File structure planning
- Quality checklist