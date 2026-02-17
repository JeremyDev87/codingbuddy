# TUI Neon/Cyberpunk Visual Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** TUI 대시보드를 네온/사이버펑크 스타일로 전면 재설계하여 시각적 풍부함과 정보 밀도를 대폭 개선

**Approach:** 하이브리드 — FlowMap은 ColorBuffer(신규), 나머지는 Ink-Native 컴포넌트

**Tech Stack:** React Ink 6.x, React 19.x, TypeScript strict, vitest, ink-testing-library

**References:**
- btop, lazygit, k9s 스타일 TUI
- 기존 compact design: `docs/plans/2026-02-14-tui-compact-design.md`

---

## Color Palette

| Role | Color | Ink Attribute | Target |
|------|-------|---------------|--------|
| Primary accent | Cyan | `color="cyan" bold` | Titles, active borders, section headers |
| Secondary accent | Magenta | `color="magenta"` | Progress bars, highlights, edge labels |
| Running | Green | `color="green" bold` | `●` icon, active node borders |
| Warning | Yellow | `color="yellow"` | `⏸` blocked status |
| Error | Red | `color="red" bold` | `!` error, failed nodes |
| Done | Green | `color="green"` | `✓` completed |
| Inactive | Gray | `dimColor` | Inactive elements, timestamps |
| Content | White | default | Body text |

## Border Styles

- **Header/Footer**: `borderStyle="double"` + `borderColor="cyan"` (Ink Box)
- **FlowMap/FocusedPanel**: `borderStyle="single"` + `borderColor="cyan"` (Ink Box) or ColorBuffer equivalent
- **Section dividers**: `─── Title ──────` in magenta (pure text)

---

## Target Layout (wide >= 120 cols)

```
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  ⟨⟩ CODINGBUDDY AGENT DASHBOARD       PLAN → [ACT] → EVAL → AUTO     ● RUNNING    workspace   sess:a3f2  ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
┌─── FLOW MAP ─────────────────────────────────────┐┌─── FOCUSED AGENT ───────────────────────────────────┐
│                                                   ││ ● solution-architect       RUNNING  ACT    [75%]    │
│    PLAN             ACT             EVAL          ││ █████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│   ┌────────────┐  ┌────────────┐                  ││                                                     │
│   │ ○ plan-mode│─>│ ● sol-arch │                  ││ ─── Objective ─────────────────────────────────     │
│   └────────────┘  └────────────┘                  ││ - Design auth feature architecture                  │
│                         │                         ││                                                     │
│                         ▼ delegates                ││ ─── Checklist ─────────────────────────────────     │
│                   ┌────────────┐                  ││ [x] Analyze requirements                            │
│                   │ ○ sec-spec │                  ││ [ ] Design component structure                      │
│                   └────────────┘                  ││                                                     │
│                                                   ││ ─── Tools / IO ────────────────────────────────     │
│                                                   ││ Glob / Read / Grep   IN: src/auth  OUT: files(3)   │
│                                                   ││                                                     │
│  ● running  ○ idle  ⏸ blocked  ! err  ✓ done     ││ ─── Event Log ─────────────────────────────────     │
│                                                   ││ 15:10  agent:activated solution-architect            │
│                                                   ││ 15:11  tool:invoked Glob src/auth/**                │
└───────────────────────────────────────────────────┘└─────────────────────────────────────────────────────┘
╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║  PLAN: idle  │  ACT: ● 1 running  │  EVAL: idle                  ⚡ Bottlenecks: none         tokens: 12k ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Component Architecture

### 1. ColorBuffer (New Utility)

Replaces CharBuffer. Stores per-cell character + color metadata.

```typescript
interface CellStyle {
  fg?: 'cyan' | 'magenta' | 'green' | 'yellow' | 'red' | 'white' | 'gray';
  bold?: boolean;
  dim?: boolean;
}

interface ColorCell {
  char: string;
  style: CellStyle;
}

class ColorBuffer {
  constructor(width: number, height: number);
  setChar(x: number, y: number, ch: string, style?: CellStyle): void;
  getCell(x: number, y: number): ColorCell;
  writeText(x: number, y: number, text: string, style?: CellStyle): void;
  drawBox(x: number, y: number, w: number, h: number, style?: CellStyle): void;
  drawHLine(x: number, y: number, length: number, ch?: string, style?: CellStyle): void;
  drawVLine(x: number, y: number, length: number, ch?: string, style?: CellStyle): void;
  toLines(): ColorCell[][];  // Row-major array for Ink rendering
}
```

**Rendering strategy**: `toLines()` returns `ColorCell[][]`. The FlowMap React component iterates rows and groups consecutive cells with the same style into `<Text>` spans:

```tsx
// Conceptual rendering in FlowMap.tsx
{buffer.toLines().map((row, y) => (
  <Box key={y}>
    {groupByStyle(row).map((segment, i) => (
      <Text key={i} color={segment.style.fg} bold={segment.style.bold} dimColor={segment.style.dim}>
        {segment.text}
      </Text>
    ))}
  </Box>
))}
```

### 2. HeaderBar (Ink-Native Redesign)

**Before:** Plain text lines via `formatHeaderBar()` pure function
**After:** Ink `<Box borderStyle="double" borderColor="cyan">` with colored content

- Title: `⟨⟩ CODINGBUDDY AGENT DASHBOARD` in bold cyan
- Mode pipeline: Active mode in `[brackets]` + bold cyan, others dimColor
- State icon: colored by state (green=RUNNING, dim=IDLE, red=ERROR)
- Workspace/Session: dimColor, right-aligned

### 3. FlowMap (ColorBuffer-based)

**Before:** CharBuffer → `toString()` → single `<Text>`
**After:** ColorBuffer → `toLines()` → row-by-row colored `<Text>` spans

Color rules:
- Stage labels: PLAN=cyan, ACT=magenta, EVAL=yellow, AUTO=green (bold)
- Node borders: status-colored (running=green, idle=dimCyan, blocked=yellow, error=red)
- Node text: running=white bold, others=dim
- Edge paths: dim cyan
- Arrow tips: magenta bold
- Edge labels: magenta
- Legend: dim gray

The `flow-map.pure.ts` functions (`renderFlowMap`, etc.) will be refactored to use ColorBuffer instead of CharBuffer and return `ColorCell[][]` instead of `string`.

### 4. FocusedAgentPanel (Ink-Native Redesign)

**Before:** 5 stacked `<Box borderStyle="single">` boxes
**After:** Single `<Box borderStyle="single" borderColor="cyan">` with internal section dividers

Sections (inside single frame):
1. **Agent header**: `● name   STATUS  STAGE  [progress%]` — status-colored icon, bold name
2. **Progress bar**: `█` in magenta, `░` in dim gray
3. **Objective**: `─── Objective ───` (magenta divider) + bullet list
4. **Checklist**: `─── Checklist ───` + `[x]` green / `[ ]` default
5. **Tools/IO**: `─── Tools / IO ───` + compact inline
6. **Event Log**: `─── Event Log ───` + tail entries, timestamps dim, errors red

### 5. StageHealthBar (Ink-Native Redesign)

**Before:** Plain text lines via `formatStageHealthBar()` pure function
**After:** Ink `<Box borderStyle="double" borderColor="cyan">` with colored stats

- Stage names: colored (PLAN=cyan, ACT=magenta, EVAL=yellow)
- Stats: running=green, blocked=yellow, error=red
- Bottlenecks: red bold
- Token count: dim, right-aligned

---

## Responsive Breakpoints (Unchanged)

| Mode | Columns | Layout |
|------|---------|--------|
| wide | >= 120 | 2-column: FlowMap (45%) + FocusedAgent (55%) |
| medium | 80-119 | 2-column: FlowMap (40%) + FocusedAgent (60%) |
| narrow | < 80 | Single column: FocusedAgent → FlowMap (compact list) |

---

## Files to Change

### New Files
| File | Purpose |
|------|---------|
| `tui/utils/color-buffer.ts` | ColorBuffer class |
| `tui/utils/color-buffer.spec.ts` | ColorBuffer tests |
| `tui/utils/theme.ts` | Centralized color palette constants |
| `tui/utils/theme.spec.ts` | Theme tests |

### Modified Files
| File | Changes |
|------|---------|
| `tui/components/flow-map.pure.ts` | CharBuffer → ColorBuffer, return ColorCell[][] |
| `tui/components/flow-map.pure.spec.ts` | Update assertions for ColorCell[][] |
| `tui/components/FlowMap.tsx` | Render ColorCell rows with Ink <Text> spans |
| `tui/components/FlowMap.spec.tsx` | Update rendering assertions |
| `tui/components/header-bar.pure.ts` | Remove formatHeaderBar (logic moves to component) |
| `tui/components/header-bar.pure.spec.ts` | Update/remove pure function tests |
| `tui/components/HeaderBar.tsx` | Ink-native with borderStyle="double", colors |
| `tui/components/HeaderBar.spec.tsx` | Update rendering assertions |
| `tui/components/focused-agent.pure.ts` | Add section divider formatter, update formatters |
| `tui/components/focused-agent.pure.spec.ts` | Update assertions |
| `tui/components/FocusedAgentPanel.tsx` | Single-frame Ink layout with colored sections |
| `tui/components/FocusedAgentPanel.spec.tsx` | Update rendering assertions |
| `tui/components/stage-health.pure.ts` | Remove formatStageHealthBar (logic moves to component) |
| `tui/components/stage-health.pure.spec.ts` | Update/remove pure function tests |
| `tui/components/StageHealthBar.tsx` | Ink-native with borderStyle="double", colors |
| `tui/components/StageHealthBar.spec.tsx` | Update rendering assertions |
| `tui/components/index.ts` | Update exports |
| `tui/dashboard-app.tsx` | Minor layout adjustments if needed |

### Removable Files
| File | Reason |
|------|--------|
| `tui/utils/char-buffer.ts` | Replaced by ColorBuffer |
| `tui/utils/char-buffer.spec.ts` | Replaced by ColorBuffer tests |

---

## Design Decisions

1. **ColorBuffer over ANSI strings**: Using `ColorCell[][]` + Ink `<Text>` components instead of raw ANSI escape codes. This avoids Ink/ANSI conflicts and keeps rendering testable.

2. **Single frame for FocusedAgentPanel**: 5 nested boxes → 1 box with text dividers. Reduces visual noise and saves vertical space.

3. **Double-line borders for Header/Footer**: Visual hierarchy — header/footer frame the dashboard, inner panels use single-line.

4. **Theme constants centralized**: All color mappings in `theme.ts` for consistency and easy customization.

5. **Pure function preservation**: HeaderBar and StageHealthBar pure functions may be simplified but computation logic (computeStageHealth, detectBottlenecks, formatTime) is preserved.
