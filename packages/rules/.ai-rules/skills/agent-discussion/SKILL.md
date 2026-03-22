---
name: agent-discussion
description: Use when rendering multi-agent debate, discussion, or review output in the terminal. Formats agent opinions with severity badges, colored identifiers, evidence blocks, and consensus indicators using box drawing characters.
user-invocable: false
---

# Agent Discussion Formatter

## Overview

When multiple specialist agents contribute opinions, findings, or recommendations, raw text output becomes unreadable. This skill defines a structured terminal format that makes agent debates scannable, severity-aware, and action-oriented.

**Core principle:** Every agent contribution must be visually distinct, severity-tagged, and traceable to evidence.

**Iron Law:**
```
NEVER MIX AGENT OUTPUTS INTO UNSTRUCTURED PROSE — ALWAYS USE THE BOX FORMAT
```

## When to Use

- Rendering output from parallel specialist agents (security, accessibility, performance, etc.)
- Displaying code review findings from multiple reviewers
- Presenting debate/discussion between agents with differing opinions
- Summarizing consensus or disagreement across agent recommendations
- EVAL mode consolidated output

**Use this ESPECIALLY when:**
- 3+ agents contribute findings on the same topic
- Agents disagree and the user needs to see both sides
- Severity levels vary across findings

## When NOT to Use

- Single agent output (no debate to format)
- Non-terminal output (HTML, JSON API responses)
- Log-style sequential output where ordering matters more than structure

## Format Specification

### Agent Contribution Block

Each agent's finding is rendered in a box with metadata:

```
┌─ {emoji} {agent-name} ─────────────────────────┐
│ {SEVERITY} [{LEVEL}]: {title}                   │
│ {description spanning multiple lines with       │
│ proper indentation and wrapping}                 │
│                                                  │
│ Evidence: {file:line — code or observation}       │
│ Recommendation: {actionable next step}           │
└──────────────────────────────────────────────────┘
```

### Agent Identifiers

Each agent type has a fixed emoji prefix for visual scanning:

| Agent | Emoji | Color Hint |
|-------|-------|------------|
| security-specialist | `🔒` | Red |
| accessibility-specialist | `♿` | Blue |
| performance-specialist | `⚡` | Yellow |
| code-quality-specialist | `📏` | Green |
| architecture-specialist | `🏛️` | Purple |
| test-strategy-specialist | `🧪` | Cyan |
| event-architecture-specialist | `📨` | Orange |
| integration-specialist | `🔗` | Teal |
| observability-specialist | `📊` | Gray |
| migration-specialist | `🔄` | Magenta |
| seo-specialist | `🔍` | Lime |
| ui-ux-design-specialist | `🎨` | Pink |
| documentation-specialist | `📝` | White |
| code-reviewer | `👀` | Indigo |

### Severity Badges

Severity levels with visual indicators:

| Level | Badge | Meaning |
|-------|-------|---------|
| CRITICAL | `🔴 CRITICAL` | Must fix before merge — security vulnerability, data loss risk |
| HIGH | `🟠 HIGH` | Should fix before merge — significant quality or correctness issue |
| MEDIUM | `🟡 MEDIUM` | Should fix soon — maintainability, performance, or minor risk |
| LOW | `🟢 LOW` | Nice to have — style, optimization, minor improvement |
| INFO | `ℹ️ INFO` | Observation — no action required, context for the team |

### Example: Single Finding

```
┌─ 🔒 security-specialist ──────────────────────────┐
│ 🟠 HIGH: SQL injection risk in user input handling │
│                                                     │
│ Raw string concatenation used to build SQL query    │
│ without parameterization. User-controlled input     │
│ flows directly into the query string.               │
│                                                     │
│ Evidence: api/users.ts:42                           │
│   const q = `SELECT * FROM users WHERE id=${input}` │
│ Recommendation: Use parameterized queries           │
│   const q = `SELECT * FROM users WHERE id=$1`       │
└─────────────────────────────────────────────────────┘
```

### Example: Multiple Agents on Same Topic

```
┌─ 🔒 security-specialist ──────────────────────────┐
│ 🔴 CRITICAL: Unauthenticated endpoint exposed     │
│                                                     │
│ The /api/admin/users endpoint has no auth guard.    │
│ Any client can list all user records including PII. │
│                                                     │
│ Evidence: api/admin/users.ts:12 — no @UseGuards()  │
│ Recommendation: Add AuthGuard and RolesGuard       │
└─────────────────────────────────────────────────────┘

┌─ 📏 code-quality-specialist ───────────────────────┐
│ 🟡 MEDIUM: Missing input validation                │
│                                                     │
│ Query parameters parsed without validation.         │
│ Unexpected types could cause runtime errors.        │
│                                                     │
│ Evidence: api/admin/users.ts:18 — raw req.query     │
│ Recommendation: Add Zod/class-validator schema      │
└─────────────────────────────────────────────────────┘
```

## Consensus & Disagreement

### Consensus Indicator

When agents agree, show a consensus block:

```
╔══════════════════════════════════════════════════════╗
║ ✅ CONSENSUS (3/3 agents agree)                     ║
║                                                      ║
║ Auth guard must be added to /api/admin/* endpoints.  ║
║ Agents: 🔒 security, 📏 code-quality, 🏛️ architecture ║
╠══════════════════════════════════════════════════════╣
║ Priority: CRITICAL — unanimously recommended         ║
╚══════════════════════════════════════════════════════╝
```

### Disagreement Indicator

When agents disagree, show the split:

```
╔══════════════════════════════════════════════════════╗
║ ⚖️ SPLIT OPINION (2 vs 1)                           ║
║                                                      ║
║ Topic: Should we add request-level caching?          ║
║                                                      ║
║ FOR (2):                                             ║
║   ⚡ performance — reduces DB load by ~40%           ║
║   🏛️ architecture — fits existing cache layer        ║
║                                                      ║
║ AGAINST (1):                                         ║
║   🔒 security — cache invalidation risks stale       ║
║              auth state for permission changes       ║
║                                                      ║
║ Recommendation: Proceed with cache, add TTL < 60s    ║
╚══════════════════════════════════════════════════════╝
```

## Summary Block

At the end of a multi-agent discussion, render a summary:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📋 DISCUSSION SUMMARY                             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ Agents: 4 participated                             ┃
┃ Findings: 7 total                                  ┃
┃   🔴 CRITICAL: 1                                   ┃
┃   🟠 HIGH:     2                                   ┃
┃   🟡 MEDIUM:   3                                   ┃
┃   🟢 LOW:      1                                   ┃
┃ Consensus: 2 items agreed                          ┃
┃ Disputes:  1 split opinion                         ┃
┃                                                    ┃
┃ Action required: Fix 1 CRITICAL + 2 HIGH before    ┃
┃ merge. Review 1 split opinion with team.           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Rendering Rules

1. **Box width** — Adapt to terminal width, minimum 50 characters
2. **Text wrapping** — Wrap long lines inside box boundaries with proper indentation
3. **Ordering** — Sort findings by severity: CRITICAL > HIGH > MEDIUM > LOW > INFO
4. **Grouping** — Group by topic when multiple agents comment on the same code location
5. **Deduplication** — If two agents report the same issue, merge into one block with both agent names
6. **Evidence format** — Always include `file:line` reference when available
7. **Spacing** — One blank line between agent blocks, two blank lines before consensus/summary blocks
