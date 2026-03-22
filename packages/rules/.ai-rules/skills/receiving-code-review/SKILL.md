---
name: receiving-code-review
description: >-
  Use when receiving PR review feedback or code review comments.
  Enforces verification-first response to review feedback with
  anti-sycophancy classification and constructive disagreement protocol.
allowed-tools: Read, Grep, Glob, Bash(gh:*, git:*)
argument-hint: [pr-url-or-number]
---

# Receiving Code Review

## Overview

Blind agreement with review feedback is as harmful as ignoring it. Implementing unverified suggestions introduces bugs, degrades architecture, and teaches reviewers that superficial comments get results.

**Core principle:** Treat every review comment as a hypothesis to be tested, not an instruction to be followed. Evidence determines your response, not authority or politeness.

**Violating the letter of this process is violating the spirit of receiving code review.**

## The Iron Law

```
VERIFY BEFORE IMPLEMENTING — AGREEMENT WITHOUT EVIDENCE IS SYCOPHANCY
```

- Reviewer authority does not replace verification. Senior engineers make mistakes too.
- "Sounds good, fixing now" without reading the referenced code is failure.
- Implementing a wrong fix is worse than the original code — it adds confusion AND a bug.

## When to Use

**Always use for:**
- PR review comments requesting changes
- Code review feedback from teammates or AI agents
- EVAL mode feedback on your implementation
- Post-merge review comments requiring follow-up

**Lighter process acceptable for:**
- Typo fixes and formatting-only feedback (verify the typo exists, then fix)
- Documentation wording suggestions (read the suggestion, apply if clearer)

**Do NOT use for:**
- Automated linter/CI feedback (mechanical — just fix or configure)
- Pair programming feedback (synchronous — different workflow)
- Architectural review requiring re-planning (use `brainstorming` or `writing-plans` skills)
- Giving reviews (use `pr-review` skill instead)

## Quick Reference

### Feedback Classification

| Classification | Criteria | Verification Required | Action |
|---------------|----------|----------------------|--------|
| **Must-Fix** | Bug, crash, security vulnerability, data loss | YES — reproduce the issue | Fix immediately after verification |
| **Evaluate** | Alternative approach, refactoring, performance | YES — compare approaches | Implement if better, discuss if not |
| **Preference** | Style, naming, formatting, subjective taste | NO — check project conventions | Accept if convention-aligned, discuss if not |

### Decision Matrix

| Verification Result | Classification | Action |
|--------------------|---------------|--------|
| Issue reproduced | Must-Fix | Fix and cite the reproduction |
| Issue NOT reproduced | Must-Fix | Reply with evidence, ask for scenario |
| Alternative is better | Evaluate | Adopt with acknowledgment |
| Alternative is equivalent or worse | Evaluate | Decline with evidence and tradeoff analysis |
| Matches project convention | Preference | Accept silently |
| Contradicts project convention | Preference | Cite convention, keep current approach |

---

## Phase 1: Triage & Classify

**Goal:** Categorize every review comment before acting on any of them.

**Process:**
1. Read ALL comments before responding to any
2. Classify each comment as Must-Fix, Evaluate, or Preference
3. Order by priority: Must-Fix first, then Evaluate, then Preference

**Classification decision tree:**

```
Is the reviewer claiming a bug, crash, security issue, or data loss?
├── YES → Must-Fix
└── NO → Is the reviewer suggesting an alternative approach or refactoring?
    ├── YES → Evaluate
    └── NO → Preference
```

**Watch for misclassification:**

| Looks Like | Actually Is | How to Tell |
|-----------|-------------|-------------|
| Must-Fix ("this will crash") | Evaluate (edge case that can't happen in context) | Check call sites and input constraints |
| Preference ("rename this") | Must-Fix (name collision causes shadowing bug) | Check scope for conflicts |
| Evaluate ("use pattern X") | Preference (both patterns are equivalent here) | Compare actual tradeoffs in this context |

**Done when:** Every comment has a classification tag. If unsure, classify UP (Preference → Evaluate, Evaluate → Must-Fix).

---

## Phase 2: Verify

**Goal:** Build evidence for each Must-Fix and Evaluate item before acting.

### Verification Matrix

| Feedback Type | Verification Method | Evidence |
|--------------|-------------------|----------|
| "This will crash/fail on X" | Write a test with input X, run it | Test result (pass/fail) |
| "N+1 query / performance issue" | Add logging, hit the endpoint, measure | Query count, timing data |
| "This violates SRP / SOLID" | Evaluate against project conventions and codebase patterns | Convention references, pattern grep results |
| "Use pattern X instead" | Compare both approaches against existing codebase patterns | `grep` for pattern usage, tradeoff list |
| "Missing error handling" | Trace call path, check if error can actually reach this code | Call chain analysis |
| "Race condition possible" | Analyze concurrent access paths | Sequence diagram or test |
| "Style: rename this variable" | **Skip verification** — this is Preference | Check project conventions only |

### Verification Checklist

For each Must-Fix / Evaluate item:

- [ ] Read the exact code the reviewer references (not just the comment)
- [ ] Check if the claimed issue can actually occur given the call context
- [ ] If a bug claim: write a minimal test to reproduce
- [ ] If an alternative approach: grep codebase for both patterns
- [ ] If a convention claim: check `.ai-rules/` or project style guide
- [ ] Record the evidence (test output, grep results, or analysis)

**Done when:** Every Must-Fix and Evaluate item has a verification result: `reproduced`, `not reproduced`, or `tradeoff analyzed`.

**Guard against over-verification:** Preference items do NOT need verification. If you catch yourself writing a test for a variable rename, stop — you are stalling.

---

## Phase 3: Respond

**Goal:** Act on each item based on classification AND verification evidence.

### Processing Order

1. **Must-Fix items** (process first — they may invalidate other comments)
2. **Evaluate items** (some may become moot after Must-Fix changes)
3. **Preference items** (batch these for efficiency)

### Response Templates

**Must-Fix — Verified:**
> Confirmed. Reproduced with [test/scenario]. Fixed in [commit]. Added regression test.

**Must-Fix — Cannot Reproduce:**
> Attempted to reproduce with [specific steps]. Test passes with [input]. Could you share the exact scenario you're seeing? Here's what I tested: [evidence].

**Evaluate — Adopted:**
> Good point. Adopted [approach] because [evidence it's better in this context]. [Brief tradeoff acknowledged].

**Evaluate — Declined:**
> Considered this. Staying with current approach because [concrete evidence]. The tradeoff: [their approach advantage] vs [current approach advantage]. In this context, [reason current wins].

**Evaluate — Partial Agreement:**
> You're right about [the problem]. However, [proposed solution] would [issue]. Instead, I [alternative fix] which addresses the concern while [preserving X].

**Preference — Accepted:**
> Updated.

**Preference — Convention Conflict:**
> Project convention uses [X pattern] per [rule reference]. Keeping for consistency. Happy to discuss changing the convention project-wide if you'd like.

### Tone Calibration

| Reviewer | Tone | Example |
|---------|------|---------|
| Peer | Direct and evidence-based | "Tested this — passes with null input. What scenario triggers the crash?" |
| Senior / Tech Lead | Respectful but still evidence-based | "Great catch on [valid point]. For [other point], I verified with [test] and it passes — could you clarify the scenario?" |
| External Contributor | Welcoming but factual | "Thanks for the review! I checked [claim] and found [evidence]. Here's my reasoning: [explanation]." |

**Key principle:** Deference is not compliance. You can respect someone's expertise while still requiring evidence for their claims.

**Done when:** Every comment has a response: implemented (with commit reference), declined (with evidence), or discussed (with question).

---

## Phase 4: Re-request Review

**Goal:** Close the feedback loop cleanly.

**Checklist:**
- [ ] All Must-Fix items resolved (implemented or discussed with evidence)
- [ ] All Evaluate items resolved (adopted, declined with reasoning, or discussed)
- [ ] All Preference items addressed (accepted or convention-cited)
- [ ] Tests pass after all changes
- [ ] No unrelated changes mixed into fix commits
- [ ] Summary comment posted listing what was changed and what was discussed

**Summary comment template:**
```
Changes made:
- [Must-Fix] Fixed [issue] — added regression test (commit abc123)
- [Evaluate] Adopted [suggestion] for [reason] (commit def456)
- [Preference] Updated [items] (commit ghi789)

Discussed (no change):
- [item]: [brief reason with evidence link]

Ready for re-review.
```

---

## Disagreement Protocol

When you believe the reviewer is wrong, follow this escalation:

### Step 1: Lead with Evidence

```
Bad:  "I disagree with this suggestion."
Good: "I tested with [input] and it passes. The null case can't reach
       this code path because [caller] validates at line 42. Here's the test: [link]."
```

### Step 2: Acknowledge the Tradeoff

```
Bad:  "My approach is better."
Good: "Your approach has [advantage]. Mine has [advantage]. In this context,
       [mine/yours] fits better because [specific reason]."
```

### Step 3: Offer Alternatives

```
Bad:  "No, I won't change this."
Good: "Instead of [their suggestion], what about [alternative] which
       addresses your concern about [X] while preserving [Y]?"
```

### Step 4: Escalate Appropriately

If you cannot reach agreement after evidence exchange:
- Tag a third reviewer for a tiebreaker
- Reference project conventions or architectural decisions
- Accept and document: "Implementing as requested. Noting that [tradeoff] for future reference."

### When to Accept Despite Disagreement

- Reviewer has project-specific context you lack (institutional knowledge)
- The difference is genuinely marginal and not worth the discussion cost
- Project convention sides with the reviewer (convention trumps preference)
- You've been going back and forth for 3+ rounds (diminishing returns)

---

## Anti-Sycophancy Guide

### Prohibited Responses

| Don't Say | Why It's Harmful |
|-----------|-----------------|
| "Great catch! Fixing now." (without verifying) | You don't know if it's actually a catch |
| "You're absolutely right, I should have caught that." | You're performing contrition, not engineering |
| "Sounds good, will update." (without reading code) | Agreeing to changes you haven't evaluated |
| "Thanks for the thorough review!" (as the only response) | Politeness is not a substitute for engagement |
| "I'll fix all of these." (batch-agreeing) | Each comment needs individual evaluation |

### Anti-Patterns

| Anti-Pattern | What Happens | Instead |
|-------------|-------------|---------|
| **Apologetic capitulation** | "You're right, sorry" → implement unverified change | Verify first, then respond with evidence |
| **Scope creep acceptance** | "While you're at it, also refactor X" → silent addition | Acknowledge, create separate issue/PR |
| **Authority-driven compliance** | Senior said it → must be right → implement blindly | Seniors deserve evidence-based responses too |
| **Fix-then-justify** | Implement first, rationalize after | Evaluate BEFORE implementing |
| **Cherry-picking easy wins** | Fix trivial items, ignore hard critical feedback | Process Must-Fix items FIRST |
| **Silent disagreement** | Disagree privately, implement anyway | State your concern on the review thread |
| **Over-verification stalling** | "I need to verify" as excuse to avoid valid feedback | Preference items don't need verification |
| **Conflating preference with defect** | Treating style feedback as a bug fix | Classify correctly, respond accordingly |
| **Performative agreement** | Agreeing enthusiastically to avoid conflict | Evidence determines response, not comfort |

---

## Red Flags — STOP

These thoughts mean you are about to violate the Iron Law:

| Thought | Reality |
|---------|---------|
| "I'll just fix it, it's faster" | Faster than what? You haven't verified it's broken. |
| "The reviewer is senior, they must be right" | Seniority is not evidence. Verify. |
| "It's just a small change, no need to verify" | Small unverified changes compound into big problems. |
| "I don't want to seem argumentative" | Evidence-based responses are not arguments. |
| "They clearly know more about this" | They might. Verify and find out. |
| "I'll verify later after implementing" | That's fix-then-justify. Evaluate BEFORE implementing. |
| "All their other comments were valid, so this one must be too" | Each comment stands on its own evidence. |
| "Pushing back will delay the PR" | Implementing wrong changes delays it more. |

## Common Rationalizations

| Rationalization | Counter |
|----------------|---------|
| "Verifying takes too long" | Implementing a wrong fix takes longer. Reverting takes even longer. |
| "I trust this reviewer" | Trust is not a verification method. Even trusted reviewers make mistakes. |
| "It's not worth the discussion" | If it's not worth discussing, it's not worth implementing either. |
| "The reviewer will be annoyed if I push back" | Professional reviewers respect evidence-based responses. |
| "I already know they're right" | Then verification will be quick. Do it anyway. |
| "This is just bikeshedding" | If so, classify as Preference and handle accordingly. |

---

## Handling Edge Cases

### Conflicting Reviews

When multiple reviewers give contradictory feedback:
1. Surface the conflict explicitly in a comment tagging both reviewers
2. Present both positions with your analysis
3. Do NOT silently pick one — let the reviewers resolve the conflict
4. If unresolved, defer to project convention or escalate to tech lead

### Vague Feedback

When feedback lacks specifics ("this feels wrong", "not clean enough"):
1. Do NOT guess what the reviewer means
2. Ask a specific clarifying question: "Could you point to the specific part that concerns you? Is it the [data flow / naming / structure]?"
3. Wait for clarification before acting

### Feedback on Framework-Mandated Code

When the reviewer suggests changing code required by the framework:
1. Explain the constraint: "This pattern is required by [framework] — see [docs link]"
2. Offer alternatives within the framework's constraints if they exist

### Review of Test Code

Apply higher scrutiny to suggestions that weaken tests:
- Removing edge case tests → challenge firmly with coverage data
- Simplifying assertions → verify the simplified version still catches regressions
- "This test is unnecessary" → check if it covers a unique code path

---

## Related Skills

- **`pr-review`** — For conducting reviews (the giving side of this skill)
- **`systematic-debugging`** — For investigating issues found during verification
- **`test-driven-development`** — For writing verification tests in Phase 2
- **`writing-plans`** — For re-planning when architectural review feedback requires redesign
