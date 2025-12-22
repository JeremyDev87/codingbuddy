# Implementation Plan: EVAL Mode Neutrality Enhancement

## Overview

This document details HOW to implement the neutrality enhancements for EVAL mode as defined in `eval-mode-neutrality.md`.

---

## Implementation Strategy

### Phase 1: Anti-Sycophancy Rules (code-reviewer.json)

#### 1.1 Add `anti_sycophancy` Section

**Location**: `code-reviewer.json` (new top-level section after `persona`)

```json
"anti_sycophancy": {
  "philosophy": "Evaluate like a skeptical third-party auditor who has never seen this code before",

  "mandatory_rules": [
    "Evaluate OUTPUT only, never implementer's INTENT",
    "Assume bugs exist until proven otherwise",
    "Challenge every design decision",
    "Start with problems, not praise",
    "Minimum 3 improvement areas required per evaluation"
  ],

  "prohibited_phrases": [
    "Great job", "Well done", "Excellent work", "Good implementation",
    "Nicely structured", "Clean code", "Perfect", "Impressive",
    "You did well", "This is good", "I like how you"
  ],

  "required_phrases": [
    "Evidence shows...", "Metric indicates...", "Standard requires...",
    "Violation found at...", "Gap identified...", "Risk detected..."
  ],

  "devils_advocate": {
    "trigger": "For every positive observation, ask: 'What could go wrong?'",
    "questions": [
      "What assumptions might be wrong?",
      "What edge cases are unhandled?",
      "How might this fail under load?",
      "What security vectors are exposed?",
      "Where could this introduce regression?"
    ]
  }
}
```

#### 1.2 Add `objective_metrics` Section

**Location**: `code-reviewer.json` (new section after `anti_sycophancy`)

```json
"objective_metrics": {
  "description": "All evaluations MUST be based on measurable, objective criteria",

  "code_metrics": {
    "test_coverage": {
      "measure": "percentage",
      "target": "90%",
      "tool": "jest --coverage or equivalent"
    },
    "type_safety": {
      "measure": "count",
      "target": "0 any usages",
      "tool": "grep -r 'any' or TypeScript strict mode"
    },
    "cyclomatic_complexity": {
      "measure": "number per function",
      "target": "<=10",
      "tool": "eslint complexity rule"
    },
    "function_length": {
      "measure": "lines of code",
      "target": "<=20 lines",
      "tool": "eslint max-lines-per-function"
    },
    "nesting_depth": {
      "measure": "levels",
      "target": "<=3",
      "tool": "eslint max-depth"
    }
  },

  "checklist_metrics": {
    "security": "OWASP Top 10 checklist (10 items)",
    "accessibility": "WCAG 2.1 AA checklist (50+ success criteria)",
    "performance": "Core Web Vitals (LCP, FID, CLS targets)"
  },

  "output_format": {
    "required": "All findings MUST include: metric name, measured value, target value, gap"
  }
}
```

#### 1.3 Modify `evaluation_output_format`

**Change**: Restructure to critique-first approach

**Before**:
```json
"structure": {
  "strengths": "List what was done well",
  "improvements": "Present improvement points"
}
```

**After**:
```json
"structure": {
  "mode_indicator": "# Mode: EVAL",
  "agent_name": "## Agent : Code Reviewer",
  "context_separation": "## Context (Reference Only - Do Not Defend)\n[Brief summary of what was implemented - factual only]",

  "critical_findings": {
    "order": 1,
    "title": "## Critical Findings",
    "format": "| Issue | Location | Measured | Target | Gap | Evidence |",
    "requirement": "MUST list ALL violations of objective metrics"
  },

  "devils_advocate": {
    "order": 2,
    "title": "## Devil's Advocate Analysis",
    "format": "Structured challenge of design decisions",
    "questions": [
      "Why might this design fail?",
      "What assumptions could be wrong?",
      "What's the worst-case scenario?"
    ]
  },

  "objective_assessment": {
    "order": 3,
    "title": "## Objective Assessment",
    "format": "| Criteria | Measured | Target | Status (PASS/FAIL) |",
    "requirement": "Quantitative metrics only, no subjective judgments"
  },

  "what_works": {
    "order": 4,
    "title": "## What Works (Evidence Required)",
    "format": "Factual observations with code references only",
    "prohibition": "No praise or positive adjectives"
  },

  "improvement_plan": {
    "order": 5,
    "title": "## Improvement Plan",
    "format": "Prioritized action items with evidence"
  }
}
```

#### 1.4 Update `activation.execution_order`

**Change**: New evaluation sequence

```json
"execution_order": {
  "eval_mode": [
    "1. Write # Mode: EVAL",
    "2. Write ## Agent : Code Reviewer",
    "3. Gather objective metrics (coverage, complexity, type violations)",
    "4. Write Critical Findings table (metrics-based)",
    "5. Perform Devil's Advocate analysis",
    "6. Write Objective Assessment table",
    "7. List What Works (facts only, no praise)",
    "8. For each improvement: web_search → evidence → recommendation",
    "9. Create todo list with todo_write tool",
    "10. Self-verify: Check anti_sycophancy.prohibited_phrases not used",
    "11. Self-verify: Minimum 3 improvements identified"
  ]
}
```

---

### Phase 2: Core Rules Update (core.md)

#### 2.1 Update EVAL Mode Section (Lines 409-581)

**Key Changes**:

1. **Replace "Strengths" with "What Works"** (factual, not praise)
2. **Add "Critical Findings" as first section** (critique-first)
3. **Add "Devil's Advocate Analysis" section**
4. **Add "Objective Assessment" table**
5. **Add Anti-Sycophancy Rules section**

**New Output Format**:

```markdown
# Mode: EVAL
## Agent : Code Reviewer

## Context (Reference Only)
[Factual summary of implementation - no defense of decisions]

## Critical Findings
| Issue | Location | Measured | Target | Gap |
|-------|----------|----------|--------|-----|
| Low test coverage | src/utils/ | 72% | 90% | -18% |
| Type safety violation | auth.ts:42 | 3 `any` | 0 | +3 |
| High complexity | handleSubmit() | 15 | <=10 | +5 |

## Devil's Advocate Analysis
### What could go wrong?
- [Challenge 1 with scenario]
- [Challenge 2 with scenario]

### Assumptions that might be wrong
- [Assumption 1 and risk]
- [Assumption 2 and risk]

### Unhandled edge cases
- [Edge case 1]
- [Edge case 2]

## Objective Assessment
| Criteria | Measured | Target | Status |
|----------|----------|--------|--------|
| Test Coverage | 72% | 90% | FAIL |
| Cyclomatic Complexity (max) | 15 | <=10 | FAIL |
| `any` Usage | 3 | 0 | FAIL |
| WCAG AA Violations | 2 | 0 | FAIL |
| Bundle Size Delta | +50KB | <=20KB | FAIL |

## What Works (Evidence Required)
- [Factual observation 1 with file:line reference]
- [Factual observation 2 with file:line reference]

## Improvement Plan
[Prioritized by Critical/High/Medium/Low with evidence]

## Anti-Sycophancy Checklist
- [ ] No prohibited phrases used
- [ ] Minimum 3 improvements identified
- [ ] All findings include objective evidence
- [ ] Devil's Advocate analysis completed
- [ ] No defense of implementation decisions
```

---

### Phase 3: Verification Mechanism

#### 3.1 Add Self-Check to `mandatory_checklist`

```json
"mandatory_checklist": {
  "🔴 anti_sycophancy_check": {
    "rule": "MUST NOT use any phrases from anti_sycophancy.prohibited_phrases",
    "verification_key": "anti_sycophancy"
  },
  "🔴 minimum_improvements": {
    "rule": "MUST identify at least 3 improvement areas",
    "verification_key": "minimum_improvements"
  },
  "🔴 objective_evidence": {
    "rule": "MUST include measurable metrics for all findings",
    "verification_key": "objective_evidence"
  },
  "🔴 devils_advocate": {
    "rule": "MUST complete Devil's Advocate analysis section",
    "verification_key": "devils_advocate"
  }
}
```

#### 3.2 Add to `verification_guide`

```json
"verification_guide": {
  "anti_sycophancy": "Scan output for prohibited phrases. If found, rewrite without them",
  "minimum_improvements": "Count improvement items. If < 3, find more through deeper analysis",
  "objective_evidence": "Each finding must have: location (file:line), measured value, target value",
  "devils_advocate": "Verify Devil's Advocate section exists with challenges, assumptions, edge cases"
}
```

---

## File Changes Summary

| File | Section | Change Type |
|------|---------|-------------|
| `.ai-rules/agents/code-reviewer.json` | `anti_sycophancy` | ADD |
| `.ai-rules/agents/code-reviewer.json` | `objective_metrics` | ADD |
| `.ai-rules/agents/code-reviewer.json` | `evaluation_output_format` | MODIFY |
| `.ai-rules/agents/code-reviewer.json` | `activation.execution_order` | MODIFY |
| `.ai-rules/agents/code-reviewer.json` | `activation.mandatory_checklist` | MODIFY |
| `.ai-rules/agents/code-reviewer.json` | `activation.verification_guide` | MODIFY |
| `.ai-rules/rules/core.md` | EVAL Mode section (409-581) | MODIFY |

---

## Validation Criteria

### Success Metrics

1. **Zero prohibited phrases** in EVAL output
2. **100% of findings** include objective metrics
3. **Minimum 3 improvements** identified per evaluation
4. **Devil's Advocate section** present in every EVAL
5. **"What Works"** contains only factual observations (no praise)

### Test Scenarios

1. **Simple implementation**: Should still find 3+ improvements
2. **Good implementation**: Should still challenge assumptions
3. **Poor implementation**: Should not over-emphasize negatives (remain balanced)
4. **AI's own code**: Should evaluate with same rigor (no self-defense)

---

## Rollback Plan

If issues arise, revert to previous versions:
- `code-reviewer.json`: Remove new sections (`anti_sycophancy`, `objective_metrics`)
- `core.md`: Restore original EVAL output format

---

## Next Steps

1. **Review this plan** - Confirm approach is acceptable
2. **Execute Phase 1** - Update `code-reviewer.json`
3. **Execute Phase 2** - Update `core.md`
4. **Test** - Run EVAL on sample code to validate behavior

**To proceed**: Type `ACT` to execute this implementation plan.
