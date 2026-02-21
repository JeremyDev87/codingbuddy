---
name: prompt-engineering
description: Use when writing prompts for AI tools, optimizing agent system prompts, or designing AI-readable instructions. Covers prompt structure, meta-prompting, chain-of-thought, and tool-specific optimization.
---

# Prompt Engineering

## Overview

A prompt is an API contract with an AI system. Precision matters. Ambiguous prompts produce inconsistent results; clear prompts produce consistent, predictable behavior.

**Core principle:** Prompts are executable specifications. Write them like you write tests: with clear inputs, expected behavior, and success criteria.

**Iron Law:**
```
TEST YOUR PROMPT WITH AT LEAST 3 DIFFERENT INPUTS BEFORE USING IN PRODUCTION
One input is anecdote. Three is pattern. Ten is confidence.
```

## When to Use

- Writing system prompts for codingbuddy agents
- Creating CLAUDE.md / .cursorrules instructions
- Designing tool descriptions for MCP servers
- Optimizing prompts that produce inconsistent results
- Building prompt chains for multi-step workflows

## Prompt Anatomy

Every effective prompt has these components:

```
┌─────────────────────────────────────────┐
│ ROLE        Who/what is the AI?         │
│ CONTEXT     What situation are we in?   │
│ TASK        What specifically to do?    │
│ CONSTRAINTS What rules must be obeyed?  │
│ FORMAT      How to structure output?    │
│ EXAMPLES    Show, don't just tell       │
└─────────────────────────────────────────┘
```

Not every prompt needs all components, but most production prompts need most of them.

## Prompt Patterns

### Pattern 1: Role + Task (Basic)

```
You are a [specific role].

Your task: [specific action] for [specific context].
```

**Example:**
```
You are a TypeScript code reviewer specializing in security.

Your task: Review the authentication module below for OWASP Top 10 vulnerabilities.
Output a list of findings ordered by severity (Critical → High → Medium → Low).
```

### Pattern 2: Chain-of-Thought (Complex Reasoning)

Force step-by-step reasoning before conclusions:

```
Before answering, think through:
1. [First consideration]
2. [Second consideration]
3. [Third consideration]

Then provide your conclusion.
```

**Example:**
```
Before suggesting a fix, think through:
1. What is the root cause of this bug?
2. What are the possible fix approaches?
3. What are the trade-offs of each approach?
4. Which approach has the least risk?

Then provide your recommendation with rationale.
```

### Pattern 3: Few-Shot (Examples)

Show the AI what good output looks like:

```
[Task description]

Examples:

Input: [example input 1]
Output: [example output 1]

Input: [example input 2]
Output: [example output 2]

Now complete:
Input: [actual input]
Output:
```

**Example (agent expertise):**
```
Format agent expertise as specific, actionable skills.

Examples:

Input: security
Output: "OWASP Top 10 Vulnerability Assessment", "JWT Authentication Design", "SQL Injection Prevention"

Input: databases
Output: "PostgreSQL Query Optimization", "Zero-Downtime Schema Migrations", "Connection Pool Tuning"

Now complete:
Input: frontend
Output:
```

### Pattern 4: Constraint-First

Lead with what NOT to do (especially useful for restrictive behaviors):

```
NEVER [prohibited action].
ALWAYS [required action].
If [edge case], then [specific handling].

Your task: [task description]
```

**Example:**
```
NEVER include markdown formatting in your output — plain text only.
ALWAYS include the file path in references (e.g., src/app.ts:42).
If you are uncertain, say "I'm not sure" rather than guessing.

Your task: Analyze the build error below and identify the root cause.
```

### Pattern 5: Meta-Prompting

Prompt the AI to generate or improve prompts:

```
I need a prompt for [purpose].

The prompt should:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Generate 3 prompt variations ranked from most to least structured.
```

## System Prompt Design (codingbuddy Agents)

Agent system prompts follow a specific structure:

```markdown
# [Agent Display Name]

You are a [role] specialist focused on [narrow domain].

## Your Expertise

You excel at:
- [Specific skill 1 — concrete, not vague]
- [Specific skill 2]
- [Specific skill 3]

## Your Approach

When activated:
1. [First action — what you always do first]
2. [Analysis approach]
3. [Output structure]

## What You Do NOT Handle

Redirect to appropriate specialists for:
- [Out-of-scope 1] → use [other-agent-name]
- [Out-of-scope 2] → use [other-agent-name]

## Output Format

Structure all responses as:
### Findings
[Severity: Critical/High/Medium/Low] — [Description]

### Recommendations
[Prioritized list]
```

## MCP Tool Description Design

Tool descriptions are prompts read by AI to decide when and how to use a tool:

```typescript
{
  name: 'search_rules',
  // ❌ Bad: vague
  description: 'Search rules',

  // ✅ Good: specific use case + when to use
  description: 'Search AI coding rules by keyword or topic. Use this when looking for specific guidelines about coding practices, TDD, security, or workflow modes. Returns matching rules with their content.',

  inputSchema: {
    properties: {
      query: {
        type: 'string',
        // ❌ Bad: no guidance
        description: 'Query string',

        // ✅ Good: what makes a good query
        description: 'Search term such as "TDD", "security", "TypeScript strict", or a question like "how to handle migrations"',
      }
    }
  }
}
```

## Prompt Testing

### Test Matrix

For each prompt, test these dimensions:

| Dimension | Test Cases |
|-----------|-----------|
| Happy path | Ideal input, expected output |
| Edge cases | Empty input, very long input, unusual characters |
| Adversarial | Input designed to break the constraint |
| Ambiguous | Input that could be interpreted multiple ways |

### Evaluation Criteria

```markdown
## Prompt Evaluation Rubric

**Accuracy:** Does output match expected behavior? (1-5)
**Consistency:** Same input → same output across runs? (1-5)
**Format compliance:** Does output match requested format? (1-5)
**Boundary respect:** Does it honor constraints? (1-5)
**Efficiency:** Is it unnecessarily verbose? (1-5)

Total: 20 points. Target: ≥ 16 for production use.
```

## Tool-Specific Optimization

### Claude Code (CLAUDE.md)

```markdown
## Best practices for Claude Code instructions:

- Use ## headers to organize sections
- Bold critical rules: **NEVER do X**
- Use code blocks for exact command examples
- Include trigger conditions: "When user types PLAN..."
- Reference other files: "See .claude/rules/tool-priority.md"
```

### Cursor (.cursorrules)

```markdown
## Best practices for Cursor rules:

- One rule per line for reliable parsing
- Start each rule with the trigger: "When writing TypeScript..."
- Avoid multi-paragraph rules (Cursor truncates)
- Use concrete examples, not abstract principles
```

### GitHub Copilot (.github/copilot-instructions.md)

```markdown
## Best practices for Copilot instructions:

- Lead with task-oriented rules
- Examples are more effective than descriptions
- Copilot follows "do X" more reliably than "don't do Y"
- Keep total instructions under 8000 characters
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Vague task ("be helpful") | Specific task ("list 3 alternatives with trade-offs") |
| No format specification | Add explicit format: "Respond as JSON: {field: value}" |
| Contradictory constraints | Test for conflicts before deploying |
| No examples for complex tasks | Add 2-3 few-shot examples |
| Testing with one input | Test with at least 3 diverse inputs |
| Long monolithic prompt | Break into focused sections with headers |

## Quick Reference

```
Prompt Length Guidelines:
──────────────────────────
Simple instruction    → 50-100 tokens
Structured prompt     → 100-500 tokens
Agent system prompt   → 500-2000 tokens
Complex workflow      → 2000-4000 tokens
(>4000 = consider splitting into sub-prompts)

Reliability Ranking (most to least reliable):
──────────────────────────────────────────────
1. Explicit format + examples (highest)
2. Explicit format, no examples
3. Implicit format with examples
4. Implicit format, no examples (lowest)
```
