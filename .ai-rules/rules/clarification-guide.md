# Clarification Question Guidelines

Guidelines for AI to generate contextual clarification questions during PLAN MODE.

---

## When to Start Clarification Phase

Start Clarification Phase when any of the following ambiguities are detected:

- **Scope unclear** - Which modules, components, or users are affected?
- **Priority ambiguous** - What is must-have vs nice-to-have?
- **Constraints not specified** - Technical or business limitations?
- **Edge cases undefined** - How to handle errors or exceptions?
- **Integration points unclear** - Relationship with existing systems?

**Skip Clarification Phase when:**
- Requirements are detailed and unambiguous
- User provides comprehensive specification document
- User explicitly requests: "Skip clarification" or "Just create the plan"

---

## Ambiguity Assessment Checklist

Use this checklist to determine if Clarification Phase is needed:

| Check | Question | If unclear → Ask about |
|-------|----------|------------------------|
| [ ] | Is the **scope** defined? (which files, modules, users) | Scope |
| [ ] | Are **priorities** clear? (must-have vs nice-to-have) | Priority |
| [ ] | Are **constraints** known? (tech stack, compatibility) | Constraints |
| [ ] | Are **edge cases** specified? (errors, empty states) | Expected Behavior |
| [ ] | Are **non-functional requirements** defined? (performance, security) | Non-functional |
| [ ] | Is **integration** with existing code clear? | Integration |

**Rule:** If 2+ items are unclear → Start Clarification Phase

---

## Question Format Rules

1. **Single Question** - Ask only ONE question per message
2. **Progress Indicator** - Show "Question N/M" format (estimate M, adjust as needed)
3. **Multiple-Choice First** - Provide A/B/C options when possible
4. **Custom Input** - Always allow user's own input option
5. **Language** - Follow agent's `communication.language` setting; if not set, detect from user's input language

### Question Count Guidelines

| Request Complexity | Recommended Questions |
|--------------------|----------------------|
| Simple feature | 2-3 questions |
| Standard feature | 3-5 questions |
| Complex feature | 5-7 questions |

**Best Practice:** Start with estimated count, adjust as conversation progresses. Avoid exceeding 7 questions.

---

## Question Categories

Use these categories as reference when generating questions. Adapt to specific context.

| Category | Focus Areas |
|----------|-------------|
| **Scope** | Feature boundary, affected modules, user roles |
| **Priority** | Core requirements vs optional features, MVP definition |
| **Constraints** | Technical limits, dependencies, compatibility, deadlines |
| **Expected Behavior** | Edge cases, error handling, default values |
| **Non-functional** | Performance, security, accessibility requirements |
| **Integration** | Existing code relations, data flow, API dependencies |

---

## Output Format

### During Clarification (English)

```markdown
## Clarification Phase

### Question 1/3

**[Category] clarification needed:**

[Question text adapted to context]

- **A)** [Option 1]
- **B)** [Option 2]
- **C)** [Option 3]

> Select your answer (A/B/C) or share your own input.
```

### During Clarification (Korean)

```markdown
## Clarification Phase

### 질문 1/3

**[카테고리]에 대한 확인이 필요합니다:**

[컨텍스트에 맞게 조정된 질문]

- **A)** [선택지 1]
- **B)** [선택지 2]
- **C)** [선택지 3]

> 답변을 선택해주세요 (A/B/C) 또는 다른 의견이 있으시면 말씀해주세요.
```

### After All Questions

```markdown
## 수집된 정보 요약

| 항목 | 결정 사항 |
|------|----------|
| 범위 | [사용자 선택] |
| 우선순위 | [사용자 선택] |
| 제약조건 | [사용자 선택] |
| ... | ... |

이 내용이 맞나요? 확인해주시면 PLAN 수립을 시작하겠습니다.
```

---

## Handling Special Cases

| Situation | Response |
|-----------|----------|
| User answers "I'm not sure" / "잘 모르겠어요" | Present default recommendation with rationale, ask for confirmation |
| User wants to skip a question | Note that AI will use best judgment, continue to next question |
| User provides unexpected answer | Acknowledge the input, incorporate into understanding, continue |
| User asks to skip all questions | Proceed to PLAN creation, note assumptions made |
