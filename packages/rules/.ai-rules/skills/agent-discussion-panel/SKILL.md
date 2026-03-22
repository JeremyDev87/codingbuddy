---
name: agent-discussion-panel
description: Use when rendering a multi-agent discussion as a TUI panel. Defines terminal panel layout, component architecture, real-time streaming behavior, and integration points for displaying AgentOpinion data with bordered boxes, severity badges, and consensus indicators.
user-invocable: false
---

# Agent Discussion Panel (TUI)

## Overview

The Agent Discussion Panel is a terminal UI component that renders multi-agent debates as a structured, scrollable panel. It consumes `DiscussionResult` data (from the AgentOpinion protocol) and renders it using the box-drawing format defined by the `agent-discussion` formatter skill.

**Core principle:** The panel is a _layout container_, not a formatter. It delegates all opinion rendering to the `agent-discussion` formatter and focuses on panel chrome, streaming lifecycle, and spatial arrangement.

**Iron Law:**
```
THE PANEL NEVER FORMATS OPINIONS — IT ARRANGES THEM
Formatting = agent-discussion skill. Layout = this skill.
```

## Relationship to Other Components

```
┌─────────────────────────────────────────────────┐
│ AgentOpinion Protocol (discussion.types.ts)      │
│   Defines: AgentOpinion, DiscussionResult        │
└──────────────────┬──────────────────────────────┘
                   │ data
                   ▼
┌─────────────────────────────────────────────────┐
│ agent-discussion (formatter skill)               │
│   Renders: box chars, severity badges, consensus │
└──────────────────┬──────────────────────────────┘
                   │ formatted blocks
                   ▼
┌─────────────────────────────────────────────────┐
│ agent-discussion-panel (THIS skill — TUI layout) │
│   Arranges: header, stream, consensus, summary   │
└─────────────────────────────────────────────────┘
```

## When to Use

- Building a TUI that displays multi-agent discussion output
- Implementing a codingbuddy terminal dashboard with agent debate panels
- Rendering streaming agent opinions in real time within a bounded panel region
- Displaying EVAL mode consolidated output in a structured panel

## When NOT to Use

- Formatting individual agent opinions (use `agent-discussion` formatter)
- Building web/HTML UIs (this is terminal-only)
- Rendering a single agent's output (no panel needed)
- Logging or piping output to files (panel chrome adds noise)

## Data Model Binding

The panel binds directly to the AgentOpinion protocol types:

```typescript
// Input: DiscussionResult from discussion.types.ts
interface DiscussionResult {
  topic: string;              // → Panel header title
  specialists: string[];      // → Header participant count
  opinions: AgentOpinion[];   // → Opinion stream (main content)
  consensus: ConsensusStatus; // → Consensus bar
  summary: string;            // → Summary footer
  maxSeverity: OpinionSeverity; // → Header severity indicator
}

// Each opinion maps to a formatter block
interface AgentOpinion {
  agent: string;          // → Box title (with emoji prefix)
  opinion: string;        // → Box body text
  severity: OpinionSeverity; // → Severity badge
  evidence: string[];     // → Evidence lines in box
  recommendation: string; // → Recommendation line in box
}
```

## Panel Architecture

### Full Panel Layout

```
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: {topic}                        ║
║ {specialist_count} agents | Max severity: {badge}    ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ ┌─ 🔒 security-specialist ────────────────────────┐  ║
║ │ 🔴 CRITICAL: {title}                            │  ║
║ │ {description}                                    │  ║
║ │ Evidence: {file:line}                            │  ║
║ │ Recommendation: {action}                         │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ ⚡ performance-specialist ─────────────────────┐  ║
║ │ 🟡 MEDIUM: {title}                              │  ║
║ │ {description}                                    │  ║
║ │ Evidence: {file:line}                            │  ║
║ │ Recommendation: {action}                         │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ 📏 code-quality-specialist ────────────────────┐  ║
║ │ 🟢 LOW: {title}                                 │  ║
║ │ {description}                                    │  ║
║ │ Evidence: {file:line}                            │  ║
║ │ Recommendation: {action}                         │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ ✅ CONSENSUS (3/3 agents agree)                      ║
║ Auth guard must be added to /api/admin/* endpoints.  ║
║ Priority: CRITICAL — unanimously recommended         ║
╠══════════════════════════════════════════════════════╣
║ 📋 SUMMARY | Findings: 3 | 🔴1 🟡1 🟢1             ║
║ Action: Fix 1 CRITICAL before merge                  ║
╚══════════════════════════════════════════════════════╝
```

### Component Breakdown

The panel consists of four vertical sections:

| Section | Box Style | Source | Content |
|---------|-----------|--------|---------|
| **Header** | `╔═╗║╚═╝` (double-line) | `DiscussionResult.topic`, `.specialists`, `.maxSeverity` | Title, participant count, max severity badge |
| **Opinion Stream** | `┌─┐│└─┘` (single-line, per opinion) | `DiscussionResult.opinions[]` | Agent opinion blocks (delegated to formatter) |
| **Consensus Bar** | `╔═╗║╚═╝` (double-line) | `DiscussionResult.consensus`, inferred from opinions | Consensus/split/disagreement indicator |
| **Summary Footer** | `╠═╣` separator + `╚═╝` close | `DiscussionResult.summary`, severity counts | Compact stats and action items |

## Component Specifications

### 1. Panel Header

Renders the discussion topic and metadata in a double-line bordered header.

```
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: {topic}                        ║
║ {n} agents | Max severity: {severity_badge}          ║
╠══════════════════════════════════════════════════════╣
```

**Rules:**
- Topic text wraps within panel width, truncated with `...` if exceeding 2 lines
- Agent count derived from `specialists.length`
- Max severity badge uses the formatter's badge format: `🔴 CRITICAL`, `🟠 HIGH`, `🟡 MEDIUM`, `🟢 LOW`, `ℹ️ INFO`
- `╠══╣` separator divides header from opinion stream

### 2. Opinion Stream

The scrollable main content area displaying individual agent opinion blocks.

**Rendering rules:**
- Each opinion is rendered by the `agent-discussion` formatter as a single-line bordered box
- Opinions are sorted by severity: CRITICAL > HIGH > MEDIUM > LOW > INFO
- One blank line separates consecutive opinion blocks
- The stream area has no outer border of its own — it lives inside the panel's `║` side borders
- If opinions exceed visible height, the panel supports vertical scrolling (implementation-dependent)

**Grouping:**
- When multiple agents comment on the same evidence location (`file:line`), group them visually with a shared topic label above the cluster:
```
║ 📍 api/admin/users.ts                                ║
║                                                      ║
║ ┌─ 🔒 security-specialist ────────────────────────┐  ║
║ │ ...                                              │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ 📏 code-quality-specialist ────────────────────┐  ║
║ │ ...                                              │  ║
║ └──────────────────────────────────────────────────┘  ║
```

**Deduplication:**
- If two agents report the same issue (identical `recommendation`), merge into a single block listing both agent names in the title: `┌─ 🔒 security + 📏 code-quality ─────┐`

### 3. Consensus Bar

Displays the discussion's consensus status using double-line borders.

**Rendering by `ConsensusStatus`:**

| Status | Display |
|--------|---------|
| `consensus` | `✅ CONSENSUS ({n}/{n} agents agree)` — green accent |
| `majority` | `📊 MAJORITY ({n}/{total} agents agree)` — yellow accent |
| `split` | `⚖️ SPLIT OPINION ({n} vs {m})` — orange accent, shows FOR/AGAINST lists |
| `disagreement` | `❌ NO CONSENSUS ({n} agents disagree)` — red accent, lists each position |

**Rules:**
- Always appears between opinion stream and summary, separated by `╠══╣` lines
- For `split` and `disagreement`, list each side with agent emoji + name + 1-line reason
- Consensus bar may be omitted if only 1 agent participated (no consensus to show)

### 4. Summary Footer

Compact statistics and action items at the panel bottom.

```
╠══════════════════════════════════════════════════════╣
║ 📋 SUMMARY | Agents: {n} | Findings: {total}        ║
║   🔴 {c} 🟠 {h} 🟡 {m} 🟢 {l} ℹ️ {i}               ║
║ Action: {action_summary}                             ║
╚══════════════════════════════════════════════════════╝
```

**Rules:**
- Severity counts derived from `opinions[].severity`
- Action summary derived from `DiscussionResult.summary`
- If no CRITICAL or HIGH findings, action line reads: `Action: No blocking issues found`
- `╚══╝` closes the entire panel

## Real-Time Streaming

The panel supports progressive rendering as agent opinions arrive one by one during parallel specialist execution.

### Streaming Lifecycle

```
Phase 1: INITIALIZING
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: {topic}                        ║
║ Waiting for agents... (0/{expected} responded)       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  ⏳ Collecting opinions...                           ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

Phase 2: STREAMING (opinions arriving)
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: {topic}                        ║
║ 2/{expected} agents responded | Max: 🟠 HIGH         ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ ┌─ 🔒 security-specialist ────────────────────────┐  ║
║ │ 🟠 HIGH: ...                                    │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ ⚡ performance-specialist ─────────────────────┐  ║
║ │ 🟡 MEDIUM: ...                                  │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║  ⏳ Waiting: 📏 code-quality, 🏛️ architecture       ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

Phase 3: COMPLETE (all opinions received)
[Full panel layout as shown in Panel Architecture]
```

### Streaming Rules

1. **Header updates live** — agent count and max severity refresh as each opinion arrives
2. **Opinions append** — new opinions are inserted in severity-sorted position, not appended at bottom
3. **Waiting indicator** — lists pending agent names with their emoji prefixes
4. **Consensus bar deferred** — only rendered when all opinions are received (cannot compute consensus from partial data)
5. **Summary footer deferred** — only rendered at Phase 3 (COMPLETE)
6. **No flicker** — use terminal cursor repositioning or buffered output to avoid visual tearing

### Streaming Data Events

```typescript
// Event types the panel listens for
type PanelEvent =
  | { type: 'discussion_start'; topic: string; expectedAgents: string[] }
  | { type: 'opinion_received'; opinion: AgentOpinion }
  | { type: 'discussion_complete'; result: DiscussionResult };
```

## Layout Constraints

### Terminal Width Adaptation

| Terminal Width | Behavior |
|---------------|----------|
| >= 80 cols | Full layout with evidence and recommendations inline |
| 60-79 cols | Compact: evidence truncated with `...`, recommendation on separate line |
| < 60 cols | Minimal: severity badge + title only, details collapsed; expand on focus |

### Minimum Dimensions

- **Width:** 50 columns minimum (matches formatter spec)
- **Height:** 10 rows minimum (header + 1 opinion + footer)

### Content Overflow

- **Horizontal:** Wrap text at panel inner width (panel width - 4 for border + padding)
- **Vertical:** Scroll within opinion stream area; header and footer remain pinned

## Integration Points

### codingbuddy TUI

If a codingbuddy TUI dashboard exists, the panel integrates as a widget:

```
┌─ codingbuddy dashboard ──────────────────────────────────────┐
│ ┌── Task Progress ──┐  ┌── Agent Discussion Panel ────────┐  │
│ │ [=====>    ] 60%   │  │ ╔═══════════════════════════════╗│  │
│ │ Step 3/5: Testing  │  │ ║ 🗣️ Auth Endpoint Review      ║│  │
│ │                    │  │ ╠═══════════════════════════════╣│  │
│ │ ✅ Step 1          │  │ ║ ┌─ 🔒 security ──────────┐  ║│  │
│ │ ✅ Step 2          │  │ ║ │ 🔴 CRITICAL: ...       │  ║│  │
│ │ 🔄 Step 3          │  │ ║ └────────────────────────┘  ║│  │
│ │ ⬜ Step 4          │  │ ║ ┌─ 📏 code-quality ─────┐  ║│  │
│ │ ⬜ Step 5          │  │ ║ │ 🟡 MEDIUM: ...        │  ║│  │
│ └────────────────────┘  │ ║ └────────────────────────┘  ║│  │
│                         │ ╚═══════════════════════════════╝│  │
│                         └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Widget API contract:**

```typescript
interface DiscussionPanelWidget {
  /** Render the panel into a bounded region */
  render(region: { x: number; y: number; width: number; height: number }): void;

  /** Feed a new opinion into the streaming panel */
  pushOpinion(opinion: AgentOpinion): void;

  /** Finalize the panel with complete discussion result */
  complete(result: DiscussionResult): void;

  /** Clear the panel content */
  reset(): void;
}
```

### Standalone Mode

When not embedded in a dashboard, the panel renders full-width to `stdout`:

```typescript
interface StandalonePanel {
  /** Render a complete discussion result to stdout */
  print(result: DiscussionResult): void;

  /** Start streaming mode, returns controller */
  startStreaming(topic: string, expectedAgents: string[]): StreamController;
}

interface StreamController {
  /** Add an opinion (re-renders panel) */
  addOpinion(opinion: AgentOpinion): void;

  /** Mark streaming complete, render final panel */
  finish(result: DiscussionResult): void;
}
```

## Rendering Examples

### Empty State (No Opinions Yet)

```
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: API Security Review            ║
║ Waiting for agents... (0/4 responded)                ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  ⏳ Collecting opinions from:                        ║
║     🔒 security  ⚡ performance                      ║
║     📏 code-quality  🏛️ architecture                 ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Single Agent Response

```
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: API Security Review            ║
║ 1/4 agents responded | Max: 🔴 CRITICAL              ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ ┌─ 🔒 security-specialist ────────────────────────┐  ║
║ │ 🔴 CRITICAL: Unauthenticated admin endpoint     │  ║
║ │                                                  │  ║
║ │ The /api/admin/users endpoint lacks auth guard.  │  ║
║ │ Any client can access user PII.                  │  ║
║ │                                                  │  ║
║ │ Evidence: api/admin/users.ts:12                  │  ║
║ │ Recommendation: Add AuthGuard + RolesGuard       │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║  ⏳ Waiting: ⚡ performance, 📏 code-quality,        ║
║     🏛️ architecture                                  ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

### Disagreement with Split Opinion

```
╔══════════════════════════════════════════════════════╗
║ 🗣️ AGENT DISCUSSION: Caching Strategy               ║
║ 3 agents | Max severity: 🟠 HIGH                     ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ ┌─ ⚡ performance-specialist ─────────────────────┐  ║
║ │ 🟠 HIGH: Add request-level caching              │  ║
║ │ DB query latency at p99 is 800ms. Cache would    │  ║
║ │ reduce to <50ms for repeated reads.              │  ║
║ │ Evidence: monitoring/latency-report.md:23        │  ║
║ │ Recommendation: Add Redis cache with 60s TTL     │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ 🏛️ architecture-specialist ────────────────────┐  ║
║ │ 🟡 MEDIUM: Cache fits existing layer            │  ║
║ │ The CacheModule is already wired. Adding a new   │  ║
║ │ cache key requires no architectural changes.     │  ║
║ │ Evidence: src/cache/cache.module.ts:1            │  ║
║ │ Recommendation: Use existing CacheModule.set()   │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
║ ┌─ 🔒 security-specialist ────────────────────────┐  ║
║ │ 🟠 HIGH: Cache invalidation risk                │  ║
║ │ Stale cache may serve outdated auth state after  │  ║
║ │ permission changes, creating privilege window.   │  ║
║ │ Evidence: src/auth/permissions.service.ts:45     │  ║
║ │ Recommendation: TTL < 30s + invalidate on       │  ║
║ │   permission change events                       │  ║
║ └──────────────────────────────────────────────────┘  ║
║                                                      ║
╠══════════════════════════════════════════════════════╣
║ ⚖️ SPLIT OPINION (2 vs 1)                            ║
║                                                      ║
║ FOR caching (2):                                     ║
║   ⚡ performance — reduces p99 latency by 94%        ║
║   🏛️ architecture — fits existing cache layer        ║
║                                                      ║
║ AGAINST as-is (1):                                   ║
║   🔒 security — stale auth state risk                ║
║                                                      ║
║ Recommendation: Proceed with TTL < 30s + event       ║
║   invalidation                                       ║
╠══════════════════════════════════════════════════════╣
║ 📋 SUMMARY | Agents: 3 | Findings: 3                ║
║   🔴 0  🟠 2  🟡 1  🟢 0  ℹ️ 0                       ║
║ Action: Resolve split opinion, then fix 2 HIGH       ║
╚══════════════════════════════════════════════════════╝
```
