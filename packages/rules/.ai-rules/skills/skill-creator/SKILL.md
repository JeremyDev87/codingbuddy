---
name: skill-creator
description: >-
  Create new skills, modify and improve existing skills,
  and measure skill performance with eval pipeline.
  Use when creating a skill from scratch, editing or optimizing
  an existing skill, running evals to test a skill,
  or benchmarking skill performance.
disable-model-invocation: true
argument-hint: [create|eval|improve|benchmark] [skill-name]
---

# Skill Creator

## Overview

Skills are reusable workflows that encode expert processes into repeatable instructions. A well-crafted skill transforms inconsistent ad-hoc work into systematic, verifiable outcomes across any AI tool.

**Core principle:** A skill must change behavior. If an AI assistant produces the same output with and without the skill loaded, the skill has failed.

**Iron Law:**
```
EVERY SKILL MUST HAVE A MEASURABLE "DID BEHAVIOR CHANGE?" TEST
No eval = no confidence. Ship nothing you haven't measured.
```

## Modes

| Mode | Purpose | Input | Output |
|------|---------|-------|--------|
| **Create** | Build a new skill from scratch | Intent or problem statement | `SKILL.md` + scaffold |
| **Eval** | Test skill effectiveness | Skill + test cases | Graded scorecard |
| **Improve** | Refine based on eval results | Skill + eval data | Improved `SKILL.md` |
| **Benchmark** | Compare performance metrics | Skill + baseline | Performance report |

## When to Use

- Creating a new skill for `.ai-rules/skills/`
- Testing whether an existing skill produces correct behavior
- Optimizing a skill that underperforms on edge cases
- Comparing skill versions to select the best one
- Measuring skill quality before shipping

## When NOT to Use

- Writing one-off instructions (not reusable = not a skill)
- Creating rules (use `rule-authoring` skill)
- Designing agents (use `agent-design` skill)
- Process is too simple to warrant a workflow (< 3 steps)

---

## Create Mode

**Trigger:** `skill-creator create <skill-name>`

### Phase 1: Intent — Define What the Skill Does

Answer before writing anything:

```
1. What SPECIFIC problem does this skill solve?
   Bad:  "helps with testing"
   Good: "enforces Red-Green-Refactor TDD cycle with mandatory verification"

2. What behavior change should loading this skill cause?
   Without: "AI writes implementation first, tests after"
   With:    "AI writes failing test first, verifies failure, then implements"

3. Who consumes this skill?
   Which AI tools? (Claude Code, Cursor, Codex, Q, Kiro)
   What user skill level?

4. What is the boundary?
   What it handles vs. what it delegates to other skills
   Name 2-3 skills it does NOT overlap with
```

### Phase 2: Interview — Gather Domain Knowledge

Collect the expertise the skill will encode:

```
For each major workflow step:
  1. What is the step?
  2. What is the expected input/output?
  3. What are the most common mistakes?
  4. How do you verify correctness?
  5. What red flags should halt progress?
```

**Sources to consult:**
- Existing codebase patterns (search for conventions)
- Project documentation and ADRs
- Domain experts (ask the user)
- Related skills (check for reusable patterns)

### Phase 3: Write — Author the SKILL.md

**Required structure:**

```markdown
---
name: skill-name
description: "Use when... (max 500 chars)"
[optional frontmatter fields]
---

# Skill Title

## Overview
2-3 sentences. Core principle. Iron Law.

## When to Use
Bullet list of trigger scenarios.

## When NOT to Use (if applicable)

## Process / Phases
The actual workflow steps.

## Verification Checklist

## Red Flags — STOP
Table of rationalizations vs. reality.
```

**Writing rules:**

| Rule | Why |
|------|-----|
| Imperative mood ("Write the test") | Direct instructions produce consistent behavior |
| Concrete examples over abstractions | AI tools follow examples more reliably than rules |
| Good/Bad comparisons for ambiguous steps | Eliminates interpretation variance across tools |
| One responsibility per phase | Multi-purpose phases get half-completed |
| Max 500 lines total | Longer skills get truncated or ignored |

### Phase 4: Scaffold — Create Supporting Files

```bash
mkdir -p packages/rules/.ai-rules/skills/<skill-name>
# Write SKILL.md (from Phase 3)
# Optional supporting references:
#   <skill-name>/reference-guide.md
#   <skill-name>/examples.md
```

**Frontmatter field reference:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | `^[a-z0-9-]+$`, matches directory name |
| `description` | Yes | 1-500 chars, start with "Use when..." |
| `disable-model-invocation` | No | `true` if skill handles its own execution flow |
| `argument-hint` | No | Usage hint shown in skill listings |
| `allowed-tools` | No | Restrict available tools during execution |
| `context` | No | `fork` to run in isolated context |
| `agent` | No | Agent to activate with the skill |

### Phase 5: Test — Verify the Skill Works

```
- [ ] Frontmatter validates (name matches directory, description <= 500 chars)
- [ ] Skill loads without error in target tool (list_skills / get_skill)
- [ ] Following the skill produces different behavior than without it
- [ ] Every phase has a verifiable output
- [ ] Red flags table covers top 3 rationalizations for skipping
- [ ] No overlap with existing skills (check skills/README.md)
- [ ] Multi-tool compatible (no tool-specific syntax in core workflow)
```

---

## Eval Mode

**Trigger:** `skill-creator eval <skill-name>`

Measure whether a skill produces the intended behavior change.

### Phase 1: Define — Write Test Scenarios

Create scenarios exercising the skill's key behaviors:

```
Scenario: [descriptive name]
  Given: [initial state / context]
  When:  [skill is applied with this input]
  Then:  [expected behavior / output]
  Anti-pattern: [what happens WITHOUT the skill]
```

**Minimum scenarios:**
- 1 happy path (standard use case)
- 1 edge case (unusual but valid input)
- 1 adversarial case (input that tempts skipping the skill)

### Phase 2: Spawn — Execute Test Scenarios

Run each scenario against the skill:

```
For each scenario:
  1. Load the skill content
  2. Present the scenario input
  3. Capture the AI's response
  4. Save response for grading
```

**Execution options:**
- **Manual:** Paste skill + scenario, capture response
- **Automated:** Use subagent with skill loaded, capture output
- **Parallel:** Run via dispatching-parallel-agents skill

### Phase 3: Assert — Check Expected Behavior

Grade each response:

```
  PASS:    Response follows skill workflow
  PARTIAL: Some steps followed, others skipped
  FAIL:    Skill ignored or wrong behavior produced
```

Note which specific steps were followed/skipped.

### Phase 4: Grade — Assign Severity

| Severity | Definition | Action |
|----------|-----------|--------|
| **Critical** | Skill completely ignored | Must fix before shipping |
| **High** | Key phase skipped or verification missing | Must fix before shipping |
| **Medium** | Minor step deviation, output still usable | Fix in next iteration |
| **Low** | Style/formatting difference, behavior correct | Optional fix |

### Phase 5: Aggregate — Summarize Results

```
Skill: [name]
Scenarios: [total] | Pass: [n] | Partial: [n] | Fail: [n]

Critical: [count]  High: [count]  Medium: [count]  Low: [count]

Verdict:
  SHIP    = Critical=0 AND High=0
  ITERATE = Critical=0, High>0
  REWRITE = Critical>0
```

### Phase 6: View — Present Findings

```markdown
## Eval Report: [skill-name]

### Summary
[Aggregate from Phase 5]

### Scenario Results
| Scenario | Result | Issues |
|----------|--------|--------|
| ...      | PASS/PARTIAL/FAIL | ... |

### Recommendations
1. [Fix for highest-severity issue]
2. [Next fix]
```

---

## Improve Mode

**Trigger:** `skill-creator improve <skill-name>`

Refine an existing skill based on eval data or observed behavior gaps.

### Phase 1: Read — Understand Current State

```
1. Read the current SKILL.md
2. Read eval results (if available)
3. Identify the gap:
   - Which phases are being skipped?
   - Which instructions are ambiguous?
   - Where does behavior diverge across AI tools?
```

### Phase 2: Generalize — Find Patterns in Failures

```
Look for systemic issues:
- Same step skipped across scenarios → Step is unclear or seems optional
- Different behavior per AI tool   → Instructions use tool-specific syntax
- Partial compliance               → Steps too large, need decomposition
- Complete skip                    → Trigger conditions don't match use case
```

### Phase 3: Apply — Make Targeted Changes

| Issue Type | Fix Strategy |
|-----------|-------------|
| Step skipped | Add "MANDATORY" marker + red flag for skipping |
| Ambiguous instruction | Replace with concrete Good/Bad example |
| Tool-specific behavior | Remove tool-specific syntax, use universal patterns |
| Steps too large | Decompose into sub-steps with verification |
| Missing edge case | Add scenario to When to Use section |

**Rules for changes:**
- One targeted change per identified issue
- Do not rewrite the entire skill (preserve what works)
- Add examples where instructions were misinterpreted
- Strengthen red flags for commonly skipped steps

### Phase 4: Re-run — Eval the Improved Version

Run the same eval scenarios against the modified skill:

```
Compare original vs. improved:
  - Did the targeted fix resolve the issue?
  - Did the fix introduce new issues?
  - Is overall pass rate higher?
```

### Phase 5: Compare — Side-by-Side Analysis

```markdown
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Pass rate | X% | Y% | +/-Z% |
| Critical issues | N | M | +/-D |
| High issues | N | M | +/-D |
| Avg. steps followed | X/Y | X/Y | +/-D |
```

### Phase 6: Analyze — Document Learnings

```
1. Which fix strategy was most effective?
2. Which issues persisted despite changes?
3. Are there structural problems requiring a rewrite?
4. What patterns should inform future skill authoring?
```

---

## Benchmark Mode

**Trigger:** `skill-creator benchmark <skill-name>`

Measure skill performance across dimensions and optimize weak spots.

### Phase 1: Generate — Create Benchmark Suite

Design a comprehensive test suite:

```
Dimensions:
  1. Compliance:   Does the AI follow every step?
  2. Consistency:  Same input → same behavior across runs?
  3. Portability:  Works across Claude Code, Cursor, Codex, Q, Kiro?
  4. Robustness:   Handles edge cases without breaking?
  5. Efficiency:   Does the skill add unnecessary overhead?
```

- Minimum 2 cases per dimension
- Mix of simple and complex inputs
- At least 1 adversarial case per dimension

### Phase 2: Review — Analyze Benchmark Results

```
For each dimension:
  Score: [0-100]
  Weakest case: [description]
  Root cause: [why this dimension scored low]
```

| Score | Meaning |
|-------|---------|
| 90-100 | Excellent — production-ready |
| 70-89 | Good — minor improvements needed |
| 50-69 | Fair — significant gaps in at least one dimension |
| 0-49 | Poor — needs major rework |

### Phase 3: Optimize — Target Weak Dimensions

Focus on the lowest-scoring dimension first:

```
For each dimension scoring < 70:
  1. Identify the specific instruction causing the gap
  2. Apply the appropriate fix from Improve Mode Phase 3
  3. Re-run that dimension's cases only
  4. Verify improvement without regression in other dimensions
```

### Phase 4: Apply — Finalize and Document

```
1. Update SKILL.md with optimized content
2. Update skills/README.md if category or description changed
3. Record benchmark baseline:

   Benchmark: [skill-name] @ [date]
   Compliance:  [score]
   Consistency: [score]
   Portability: [score]
   Robustness:  [score]
   Efficiency:  [score]
   Overall:     [weighted average]
```

---

## Additional Resources

### Related Skills

| Skill | Relationship |
|-------|-------------|
| `rule-authoring` | Rules constrain behavior; skills define workflows. Complementary. |
| `agent-design` | Agents are personas; skills are processes. Non-overlapping. |
| `prompt-engineering` | Prompt techniques apply within skill instructions. Supporting. |
| `writing-plans` | Plans are one-time; skills are reusable. Different lifecycle. |

### Agent Support

| Agent | When to Involve |
|-------|----------------|
| Code Quality Specialist | Reviewing skill structure and clarity |
| Test Engineer | Designing eval scenarios |
| Architecture Specialist | Skill decomposition and boundary design |

### Multi-Tool Compatibility

Skills must work across all supported AI tools:

| Tool | How Skills Load | Key Consideration |
|------|----------------|-------------------|
| Claude Code | `get_skill` MCP tool | Full markdown + frontmatter parsed |
| Cursor | `@file` reference | Inline loading, no frontmatter processing |
| Codex / Copilot | `cat` file content | Plain text only, examples critical |
| Amazon Q | `.q/rules/` reference | Rule-style integration |
| Kiro | `.kiro/` reference | Spec-based integration |

**Portability rules:**
- No tool-specific syntax in core workflow
- Examples in generic markdown, not tool-specific blocks
- Phases described as actions, not tool commands
- Test with at least 2 different tools before shipping

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "This skill is obvious, no need to eval" | Obvious skills still get ignored. Eval proves they work. |
| "I'll test it manually later" | Manual tests are forgotten. Eval now. |
| "One scenario is enough" | One is anecdote. Three is pattern. |
| "It works in Claude Code, ship it" | Cursor/Codex may ignore the same instructions. Test portability. |
| "Small change, no need to re-eval" | Small changes cause cascading behavior shifts. Re-eval. |
| "The skill is too long but everything is needed" | Max 500 lines. Cut or decompose into reference files. |
| "I'll add examples later" | Skills without examples produce inconsistent behavior. Add now. |
