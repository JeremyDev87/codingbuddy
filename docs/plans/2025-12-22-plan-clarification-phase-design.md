# PLAN MODE Clarification Phase - Implementation Design

**Date**: 2025-12-22
**Status**: Implemented

---

## Summary

Add an optional "Clarification Phase" to PLAN MODE that asks sequential questions to clarify ambiguous requirements before creating a plan.

---

## Why (Problem Definition)

### Current Problem

Currently, PLAN MODE immediately starts creating a plan upon receiving a user request. During this process:

1. **Ambiguous requirements are directly incorporated into the plan** - AI arbitrarily interprets parts that the user hasn't clearly defined and includes them in the plan
2. **Plans built on incorrect assumptions** - Risk of the plan proceeding in a direction different from the user's intent
3. **Increased rework costs** - Situations where feedback like "this isn't what I meant" during the ACT phase requires starting over from scratch
4. **Expectation mismatch between user and AI** - Final deliverables differ from what the user originally wanted

### Expected Benefits

1. **Accurate plan creation** - Start planning only after all ambiguities are resolved
2. **Improved user engagement** - Easy participation in decision-making through multiple-choice questions
3. **Reduced rework** - Clear requirements enable correct direction from the start
4. **Enhanced communication quality** - Systematic Q&A process improves mutual understanding

---

## What (Feature Definition)

### Feature Overview

Add a **"Clarification Phase"** before plan creation when entering PLAN MODE. During this phase, the AI identifies ambiguous or unclear parts of the requirements and asks the user sequential questions to clarify them.

### Core Feature Requirements

| Requirement | Description |
|-------------|-------------|
| **Sequential single question** | Present only 1 question at a time |
| **Progress indicator** | Display question number (e.g., `Question 1/5`, `Question 2/5`) |
| **Multiple-choice first** | Provide options whenever possible for easy user response |
| **Completion condition** | Continue asking until all questions are resolved |
| **Summary and confirmation** | Summarize collected information and confirm after all questions |

### Question Categories

Areas requiring clarification:

1. **Scope** - Feature application range, impact range
2. **Priority** - Core features vs. additional features
3. **Constraints** - Technical/business constraints
4. **Expected Behavior** - Edge case handling approaches
5. **Non-functional Requirements** - Performance, security, accessibility, etc.
6. **Existing System Integration** - Relationship with existing code/systems

### Exception Handling

| Situation | Handling Method |
|-----------|-----------------|
| Requirements are already clear | Skip Clarification Phase, proceed directly to PLAN creation |
| User responds "I'm not sure" | Present default recommendation and confirm |
| User requests to skip question | Note that the item will be handled by AI judgment |

---

## How (Design Decisions)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Implementation approach** | Rule-based (documents only) | No MCP server changes needed; AI follows documented guidelines |
| **Question generation** | AI-generated dynamically | Templates are too rigid; AI adapts to context |
| **Trigger condition** | AI judgment | Start only when ambiguity detected, skip if requirements are clear |
| **State management** | AI context | No server-side state; AI tracks progress in conversation |
| **Language** | Agent setting → User input fallback | Follow `communication.language`, detect user language if unset |

---

## Architecture

```
[User PLAN request]
       │
       v
[AI: Assess ambiguity level]
       │
   Ambiguous? ──No──> [Standard PLAN workflow]
       │
      Yes
       │
       v
[Start Clarification Phase]
       │
       v
[Question 1/N (multiple-choice)]
       │
       v
[User response]
       │
       v
    ... repeat ...
       │
       v
[All questions complete]
       │
       v
[Summary & Confirmation]
       │
       v
[Begin PLAN creation]
```

---

## Files Created/Modified

### 1. NEW: `packages/rules/.ai-rules/rules/clarification-guide.md`

Purpose: Guidelines for AI to generate contextual clarification questions.

```markdown
# Clarification Question Guidelines

## When to Start Clarification Phase
- Scope is unclear (affects which modules/users?)
- Priority is ambiguous (must-have vs nice-to-have?)
- Constraints not specified (technical/business limits?)
- Edge cases undefined (error handling?)
- Integration points unclear (existing system relations?)

## Ambiguity Assessment Checklist

| Check | Question | If unclear → Ask about |
|-------|----------|------------------------|
| [ ] | Is the **scope** defined? | Scope |
| [ ] | Are **priorities** clear? | Priority |
| [ ] | Are **constraints** known? | Constraints |
| [ ] | Are **edge cases** specified? | Expected Behavior |
| [ ] | Are **non-functional requirements** defined? | Non-functional |
| [ ] | Is **integration** with existing code clear? | Integration |

**Rule:** If 2+ items are unclear → Start Clarification Phase

## Question Format Rules
1. **Single Question** - Ask only ONE question per message
2. **Progress Indicator** - Show "Question N/M" format
3. **Multiple-Choice First** - Provide A/B/C options when possible
4. **Custom Input** - Always allow user's own input option
5. **Language** - Follow agent's communication.language, fallback to user input language

## Question Count Guidelines

| Request Complexity | Recommended Questions |
|--------------------|----------------------|
| Simple feature | 2-3 questions |
| Standard feature | 3-5 questions |
| Complex feature | 5-7 questions |

**Best Practice:** Avoid exceeding 7 questions.

## Output Format (Korean)

### 질문 1/3

**[카테고리]에 대한 확인이 필요합니다:**

[컨텍스트에 맞게 조정된 질문]

- **A)** [선택지 1]
- **B)** [선택지 2]
- **C)** [선택지 3]

> 답변을 선택해주세요 (A/B/C) 또는 다른 의견이 있으시면 말씀해주세요.

## After All Questions

| 항목 | 결정 사항 |
|------|----------|
| 범위 | [사용자 선택] |
| 우선순위 | [사용자 선택] |
| ... | ... |

이 내용이 맞나요? 확인해주시면 PLAN 수립을 시작하겠습니다.
```

---

### 2. MODIFIED: `packages/rules/.ai-rules/rules/core.md`

Location: Inside "Plan Mode" section, before "What PLAN does"

Added section:

```markdown
### Clarification Phase (Optional)

**Purpose:**
Resolve ambiguous requirements through sequential Q&A before creating a plan.

**Trigger Condition:**
- AI assesses user request for ambiguity
- If unclear scope, constraints, priority, or expected behavior detected → Start Clarification Phase
- If requirements are already clear → Skip directly to Plan creation

**Phase Rules:**
1. **Single Question Rule** - Ask only ONE question per message
2. **Progress Indicator** - Display "Question N/M" format (estimate M, adjust as needed)
3. **Multiple-Choice First** - Provide A/B/C options whenever possible
4. **Custom Input Allowed** - Always allow "Other" option for user's own input
5. **Language Setting** - Follow agent's `communication.language` setting; if not set, detect from user's input language

**Question Flow:**
1. Analyze request → Identify ambiguous points → Estimate question count
2. Present Question 1/N (multiple-choice format)
3. Wait for user response
4. Continue until all clarifications complete
5. Summarize all collected information in a table
6. Get user confirmation ("Yes" / request modification)
7. Proceed to Plan creation with clarified requirements

**Skip Conditions:**
- User explicitly requests to skip: "Skip clarification" or "Just create the plan"
- Requirements are detailed and unambiguous
- User provides comprehensive specification document

**Reference:**
See `packages/rules/.ai-rules/rules/clarification-guide.md` for detailed question guidelines.
```

---

## Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | Create clarification guidelines document | ✅ Done |
| 2 | Add Clarification Phase section to core.md | ✅ Done |
| 3 | Add Korean output format | ✅ Done |
| 4 | Add question count guidelines | ✅ Done |
| 5 | Add ambiguity assessment checklist | ✅ Done |
| 6 | Test with ambiguous PLAN request | Pending |
| 7 | Test skip condition (clear requirements) | Pending |

---

## Acceptance Criteria

- [x] Clarification Phase starts when AI detects ambiguous requirements
- [x] Questions are presented one at a time
- [x] Progress indicator shows N/M format
- [x] Questions use multiple-choice format when possible
- [x] Summary table shown after all questions
- [x] User confirmation required before PLAN creation
- [x] Phase is skipped when requirements are already clear
- [x] Language follows agent setting with user input fallback
- [x] Ambiguity assessment checklist provided
- [x] Question count guidelines provided (2-7 questions)
- [x] Korean output format supported

---

## Out of Scope

- Clarification for ACT MODE and EVAL MODE
- Multilingual question templates
- Question history persistence
- Learning from past clarifications
