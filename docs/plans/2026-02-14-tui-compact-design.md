# TUI Compact Design Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 24-line 터미널에 TUI 전체가 한 화면에 표시되도록 컴팩트 디자인으로 리팩토링 (현재 54~83줄 → 목표 17~21줄)

**Architecture:** Bottom-up 접근. pure 함수 먼저 수정 → React 컴포넌트 업데이트 → 테스트 갱신. 기존 pure/impure 분리 패턴 유지. 각 섹션(AgentCard, AgentTree, AgentMiniCard/CategoryRow, AgentGrid, StatusBar)은 독립적으로 작업 가능.

**Tech Stack:** React Ink 6.7.0, React 19.x, TypeScript strict, vitest, ink-testing-library

**Issue:** https://github.com/JeremyDev87/codingbuddy/issues/381

---

## Line Budget

```
Header:      1 line  (변경 없음)
AgentTree:   5-7 lines  (현재 10-16 → 목표 5-7)
AgentGrid:   10-12 lines (현재 40-63 → 목표 10-12)
StatusBar:   1 line  (현재 3 → 목표 1)
─────────────────
Total:       17-21 lines
```

---

## Task 1: agent-card.pure.ts — 인라인 카드 빌더 추가

현재 AgentCard는 `borderStyle="round"` 박스로 5~6줄을 차지. 1줄 인라인 포맷으로 변경.

**Files:**
- Modify: `apps/mcp-server/src/tui/components/agent-card.pure.ts`
- Test: `apps/mcp-server/src/tui/components/agent-card.pure.spec.ts`

### Step 1: 실패하는 테스트 작성

`agent-card.pure.spec.ts`에 `buildInlineCard` 테스트 추가:

```typescript
describe('buildInlineCard', () => {
  it('should build single-line format with icon, name, progress bar, percentage, and status', () => {
    const result = buildInlineCard('🤖', 'solution-architect', 50, 'Running');
    expect(result).toBe('🤖 solution-architect     ▓▓▓▓▓░░░░░ 50%  Running');
  });

  it('should pad name to NAME_COL_WIDTH characters', () => {
    const result = buildInlineCard('🧪', 'test', 20, 'Running');
    // 'test' padded to 22 chars
    expect(result).toContain('🧪 test');
    expect(result).toContain('20%');
    expect(result).toContain('Running');
  });

  it('should truncate long names with ellipsis', () => {
    const result = buildInlineCard('🔒', 'very-long-agent-name-that-exceeds', 10, 'Running');
    expect(result).toContain('…');
  });

  it('should show 100% for completed status', () => {
    const result = buildInlineCard('✓', 'agent', 100, 'Done');
    expect(result).toContain('100%');
    expect(result).toContain('Done');
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/agent-card.pure.spec.ts
```

Expected: FAIL — `buildInlineCard is not a function`

### Step 3: 최소 구현

`agent-card.pure.ts`에 추가:

```typescript
export const INLINE_NAME_COL_WIDTH = 22;
const INLINE_BAR_WIDTH = 10;
const INLINE_FILLED = '▓';
const INLINE_EMPTY = '░';

export function buildInlineCard(
  icon: string,
  name: string,
  progress: number,
  statusLabel: string,
): string {
  const displayName = abbreviateName(name, INLINE_NAME_COL_WIDTH).padEnd(INLINE_NAME_COL_WIDTH);
  const bar = buildProgressBar(progress, INLINE_BAR_WIDTH, INLINE_FILLED, INLINE_EMPTY);
  const pct = `${progress}%`.padStart(4);
  return `${icon} ${displayName} ${bar} ${pct}  ${statusLabel}`;
}
```

Note: `buildProgressBar`를 `progress-bar.pure`에서 import 필요.

### Step 4: 테스트 통과 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/agent-card.pure.spec.ts
```

Expected: PASS

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/agent-card.pure.ts apps/mcp-server/src/tui/components/agent-card.pure.spec.ts
git commit -m "feat(tui): add buildInlineCard pure function for compact agent display"
```

---

## Task 2: AgentCard.tsx — 인라인 렌더링으로 전환

**Files:**
- Modify: `apps/mcp-server/src/tui/components/AgentCard.tsx`
- Modify: `apps/mcp-server/src/tui/components/AgentCard.spec.tsx`

### Step 1: 컴포넌트 테스트 업데이트

`AgentCard.spec.tsx`에서 기존 테스트를 인라인 출력 기대값으로 수정:

```typescript
it('should render inline format without border', () => {
  const agent = createDefaultAgentState({
    id: '1', name: 'test-agent', role: 'specialist',
    status: 'running', progress: 50,
  });
  const { lastFrame } = render(<AgentCard agent={agent} />);
  const output = lastFrame() ?? '';
  // 한 줄에 이름, 프로그레스바, 퍼센트, 상태가 모두 포함
  expect(output).toContain('test-agent');
  expect(output).toContain('50%');
  expect(output).toContain('Running');
  // 보더 없음
  expect(output).not.toContain('╭');
  expect(output).not.toContain('╰');
});
```

### Step 2: 테스트 실패 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/AgentCard.spec.tsx
```

### Step 3: AgentCard.tsx 수정

```typescript
import React from 'react';
import { Text } from 'ink';
import type { AgentState } from '../types';
import { getAgentIcon } from '../utils/icons';
import {
  resolveProgress,
  buildStatusLabel,
  resolveIcon,
  buildInlineCard,
} from './agent-card.pure';

export interface AgentCardProps {
  agent: AgentState;
}

export function AgentCard({ agent }: AgentCardProps): React.ReactElement {
  const icon = getAgentIcon(agent.name);
  const displayIcon = resolveIcon(agent.status, icon);
  const progress = resolveProgress(agent.status, agent.progress);
  const statusLabel = buildStatusLabel(agent.status);
  const line = buildInlineCard(displayIcon, agent.name, progress, statusLabel);
  const color = agent.status === 'running' ? 'cyan' : agent.status === 'completed' ? 'green' : agent.status === 'failed' ? 'red' : 'gray';

  return <Text color={color}>{line}</Text>;
}
```

- `<Box borderStyle="round">` 제거 → 단일 `<Text>` 라인
- `ProgressBar` 컴포넌트 import 제거 (순수 함수 사용)
- `CARD_WIDTH`, `abbreviateName`, `getCardBorderColor` import 더 이상 불필요

### Step 4: 테스트 통과 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/AgentCard.spec.tsx
```

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/AgentCard.tsx apps/mcp-server/src/tui/components/AgentCard.spec.tsx
git commit -m "feat(tui): convert AgentCard from bordered box to inline single-line format"
```

---

## Task 3: agent-tree.pure.ts — 텍스트 기반 트리 커넥터

현재: 개별 AgentCard 박스 + ASCII 트리 연결선 (10-16줄)
목표: `┌├│└` 텍스트 트리 (5-7줄)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/agent-tree.pure.ts`
- Test: `apps/mcp-server/src/tui/components/agent-tree.pure.spec.ts`

### Step 1: 실패하는 테스트 작성

```typescript
describe('buildCompactTree', () => {
  it('should return primary-only line when no parallel agents', () => {
    const result = buildCompactTree(
      { icon: '🤖', name: 'architect', progress: 50, statusLabel: 'Running' },
      [],
    );
    expect(result).toEqual(['┌ Primary', '└ 🤖 architect              ▓▓▓▓▓░░░░░ 50%  Running']);
  });

  it('should build tree with parallel agents', () => {
    const result = buildCompactTree(
      { icon: '🤖', name: 'architect', progress: 50, statusLabel: 'Running' },
      [
        { icon: '🧪', name: 'test-strategy', progress: 20, statusLabel: 'Running' },
        { icon: '🔒', name: 'security', progress: 10, statusLabel: 'Running' },
      ],
    );
    expect(result[0]).toBe('┌ Primary');
    expect(result[1]).toContain('🤖 architect');
    expect(result[2]).toBe('├─ Parallel');
    expect(result[3]).toContain('🧪 test-strategy');
    expect(result[4]).toContain('🔒 security');
    expect(result[5]).toBe('└');
  });
});
```

### Step 2: 테스트 실패 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/agent-tree.pure.spec.ts
```

### Step 3: 구현

`agent-tree.pure.ts`에 추가:

```typescript
import { buildInlineCard } from './agent-card.pure';

export interface CompactAgentLine {
  icon: string;
  name: string;
  progress: number;
  statusLabel: string;
}

export function buildCompactTree(
  primary: CompactAgentLine,
  parallel: CompactAgentLine[],
): string[] {
  const lines: string[] = [];
  const primaryCard = buildInlineCard(primary.icon, primary.name, primary.progress, primary.statusLabel);

  if (parallel.length === 0) {
    lines.push('┌ Primary');
    lines.push(`└ ${primaryCard}`);
    return lines;
  }

  lines.push('┌ Primary');
  lines.push(`│ ${primaryCard}`);
  lines.push('├─ Parallel');
  for (const agent of parallel) {
    const card = buildInlineCard(agent.icon, agent.name, agent.progress, agent.statusLabel);
    lines.push(`│  ${card}`);
  }
  lines.push('└');
  return lines;
}
```

### Step 4: 테스트 통과 확인

```bash
cd apps/mcp-server && npx vitest run src/tui/components/agent-tree.pure.spec.ts
```

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/agent-tree.pure.ts apps/mcp-server/src/tui/components/agent-tree.pure.spec.ts
git commit -m "feat(tui): add buildCompactTree for text-based tree connectors"
```

---

## Task 4: AgentTree.tsx — 컴팩트 트리 렌더링

**Files:**
- Modify: `apps/mcp-server/src/tui/components/AgentTree.tsx`
- Modify: `apps/mcp-server/src/tui/components/AgentTree.spec.tsx`

### Step 1: 컴포넌트 테스트 업데이트

```typescript
it('should render compact tree lines instead of bordered cards', () => {
  const primary = createDefaultAgentState({
    id: '1', name: 'architect', role: 'primary',
    status: 'running', progress: 50, isPrimary: true,
  });
  const parallel = [
    createDefaultAgentState({
      id: '2', name: 'test-strategy', role: 'specialist',
      status: 'running', progress: 20,
    }),
  ];
  const { lastFrame } = render(
    <AgentTree primaryAgent={primary} parallelAgents={parallel} />,
  );
  const output = lastFrame() ?? '';
  expect(output).toContain('┌ Primary');
  expect(output).toContain('├─ Parallel');
  expect(output).toContain('└');
  // 보더 없어야 함
  expect(output).not.toContain('╭');
});
```

### Step 2: 테스트 실패 확인

### Step 3: AgentTree.tsx 수정

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../types';
import { getAgentIcon } from '../utils/icons';
import { resolveProgress, buildStatusLabel, resolveIcon } from './agent-card.pure';
import { shouldRenderTree, buildCompactTree, type CompactAgentLine } from './agent-tree.pure';

function toCompactLine(agent: AgentState): CompactAgentLine {
  const icon = resolveIcon(agent.status, getAgentIcon(agent.name));
  return {
    icon,
    name: agent.name,
    progress: resolveProgress(agent.status, agent.progress),
    statusLabel: buildStatusLabel(agent.status),
  };
}

export function AgentTree({
  primaryAgent,
  parallelAgents,
}: AgentTreeProps): React.ReactElement | null {
  if (!shouldRenderTree(primaryAgent)) return null;

  const lines = buildCompactTree(
    toCompactLine(primaryAgent),
    parallelAgents.map(toCompactLine),
  );

  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
}
```

- `<AgentCard>` import 제거
- `buildBranchLine`, `buildDropLines`, `buildVerticalConnector` import 제거
- `CARD_WIDTH` import 제거

### Step 4: 테스트 통과 확인

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/AgentTree.tsx apps/mcp-server/src/tui/components/AgentTree.spec.tsx
git commit -m "feat(tui): convert AgentTree to compact text-based tree layout"
```

---

## Task 5: agent-mini-card.pure.ts — 인라인 태그 포맷

현재: `borderStyle="single"` 박스 (3줄/카드)
목표: `·` 구분자로 이어진 텍스트 (1줄)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/agent-mini-card.pure.ts`
- Test: `apps/mcp-server/src/tui/components/agent-mini-card.pure.spec.ts`

### Step 1: 실패하는 테스트 작성

```typescript
describe('buildInlineAgentTag', () => {
  it('should return agent name as-is when short enough', () => {
    expect(buildInlineAgentTag('security')).toBe('security');
  });

  it('should truncate long names with ellipsis', () => {
    expect(buildInlineAgentTag('very-long-agent-specialist-name')).toContain('…');
  });
});

describe('joinAgentTags', () => {
  it('should join names with middle dot separator', () => {
    expect(joinAgentTags(['agent-a', 'agent-b'])).toBe('agent-a · agent-b');
  });

  it('should handle single agent', () => {
    expect(joinAgentTags(['solo-agent'])).toBe('solo-agent');
  });

  it('should handle empty array', () => {
    expect(joinAgentTags([])).toBe('');
  });
});
```

### Step 2: 테스트 실패 확인

### Step 3: 구현

```typescript
const TAG_NAME_MAX = 20;
const TAG_SEPARATOR = ' · ';
const ELLIPSIS = '\u2026';

export function buildInlineAgentTag(name: string): string {
  if (name.length <= TAG_NAME_MAX) return name;
  return name.slice(0, TAG_NAME_MAX - 1) + ELLIPSIS;
}

export function joinAgentTags(names: string[]): string {
  return names.map(buildInlineAgentTag).join(TAG_SEPARATOR);
}
```

### Step 4: 테스트 통과 확인

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/agent-mini-card.pure.ts apps/mcp-server/src/tui/components/agent-mini-card.pure.spec.ts
git commit -m "feat(tui): add inline agent tag functions for compact grid display"
```

---

## Task 6: category-row.pure.ts — 한 줄 카테고리 빌더

현재: 카테고리 라벨 + MiniCard 박스 여러 줄
목표: `🏛️ Architecture   agent-a · agent-b · agent-c…` 한 줄

**Files:**
- Modify: `apps/mcp-server/src/tui/components/category-row.pure.ts`
- Test: `apps/mcp-server/src/tui/components/category-row.pure.spec.ts`

### Step 1: 실패하는 테스트 작성

```typescript
describe('buildCompactCategoryRow', () => {
  it('should build single-line row with label and agent tags', () => {
    const result = buildCompactCategoryRow('🏛️', 'Architecture', ['solution-architect', 'agent-architect']);
    expect(result).toContain('🏛️ Architecture');
    expect(result).toContain('solution-architect · agent-architect');
  });

  it('should truncate agent list to fit maxWidth', () => {
    const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5', 'agent-6'];
    const result = buildCompactCategoryRow('🧪', 'Testing', agents, 60);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result).toContain('…');
  });

  it('should pad category label to LABEL_WIDTH', () => {
    const result = buildCompactCategoryRow('🔒', 'Security', ['sec-agent']);
    // 라벨 부분이 고정 너비
    expect(result.startsWith('🔒 Security')).toBe(true);
  });
});
```

### Step 2: 테스트 실패 확인

### Step 3: 구현

```typescript
import { joinAgentTags } from './agent-mini-card.pure';

export const LABEL_WIDTH = 18;
const ELLIPSIS = '\u2026';

export function buildCompactCategoryRow(
  icon: string,
  categoryName: string,
  agentNames: string[],
  maxWidth: number = 80,
): string {
  const label = `${icon} ${categoryName}`.padEnd(LABEL_WIDTH);
  const remainingWidth = maxWidth - LABEL_WIDTH - 1; // 1 for space
  const fullTags = joinAgentTags(agentNames);
  const tags = fullTags.length <= remainingWidth
    ? fullTags
    : fullTags.slice(0, remainingWidth - 1) + ELLIPSIS;
  return `${label} ${tags}`;
}
```

### Step 4: 테스트 통과 확인

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/category-row.pure.ts apps/mcp-server/src/tui/components/category-row.pure.spec.ts
git commit -m "feat(tui): add buildCompactCategoryRow for single-line category display"
```

---

## Task 7: CategoryRow.tsx + AgentMiniCard.tsx — 인라인 렌더링

**Files:**
- Modify: `apps/mcp-server/src/tui/components/CategoryRow.tsx`
- Modify: `apps/mcp-server/src/tui/components/CategoryRow.spec.tsx`
- Modify: `apps/mcp-server/src/tui/components/AgentMiniCard.tsx`
- Modify: `apps/mcp-server/src/tui/components/AgentMiniCard.spec.tsx`

### Step 1: CategoryRow 테스트 업데이트

```typescript
it('should render single-line category with inline agent tags', () => {
  const agents = [
    { id: '1', name: 'sec-1', category: 'Security', icon: '🔒', ... },
    { id: '2', name: 'sec-2', category: 'Security', icon: '🔒', ... },
  ];
  const { lastFrame } = render(
    <CategoryRow category="Security" agents={agents} activeAgentIds={new Set(['1'])} icon="🔒" />,
  );
  const output = lastFrame() ?? '';
  expect(output).toContain('🔒 Security');
  expect(output).toContain('sec-1');
  expect(output).toContain('·');
  // 보더 없어야 함
  expect(output).not.toContain('┌');
  expect(output).not.toContain('└');
});
```

### Step 2: 테스트 실패 확인

### Step 3: CategoryRow.tsx 수정

```typescript
import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { AgentMetadata, AgentCategory } from '../events';
import { buildCompactCategoryRow } from './category-row.pure';

export function CategoryRow({
  category,
  agents,
  activeAgentIds,
  icon,
}: CategoryRowProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const agentNames = agents.map(a => a.name);
  const line = buildCompactCategoryRow(icon, category, agentNames, terminalWidth);
  const hasActive = agents.some(a => activeAgentIds.has(a.id));

  return (
    <Text bold={hasActive} dimColor={!hasActive}>{line}</Text>
  );
}
```

- `<AgentMiniCard>` import 제거
- `<Box flexDirection="row" flexWrap="wrap">` 구조 제거 → 단일 `<Text>`

### Step 4: AgentMiniCard.tsx는 더 이상 CategoryRow에서 사용하지 않지만, 다른 곳에서 사용될 수 있으므로 기존 코드는 유지 (dead code는 이후 정리)

### Step 5: 테스트 통과 확인

### Step 6: 커밋

```bash
git add apps/mcp-server/src/tui/components/CategoryRow.tsx apps/mcp-server/src/tui/components/CategoryRow.spec.tsx
git commit -m "feat(tui): convert CategoryRow to single-line inline format"
```

---

## Task 8: AgentGrid.tsx — marginTop 제거 + 빈 카테고리 숨김

**Files:**
- Modify: `apps/mcp-server/src/tui/components/AgentGrid.tsx`
- Modify: `apps/mcp-server/src/tui/components/AgentGrid.spec.tsx`
- Modify: `apps/mcp-server/src/tui/components/agent-grid.pure.ts`
- Modify: `apps/mcp-server/src/tui/components/agent-grid.pure.spec.ts`

### Step 1: 테스트 업데이트

`AgentGrid.spec.tsx` — `marginTop` 없이 렌더링 확인.
`agent-grid.pure.spec.ts` — `computeColumns`, `computeCardWidth` 테스트 제거 (더 이상 그리드 레이아웃 불필요).

### Step 2: AgentGrid.tsx 수정

```typescript
export function AgentGrid({
  allAgents,
  activeAgentIds,
  terminalWidth: _terminalWidth,
}: AgentGridProps): React.ReactElement | null {
  // ... useMemo 유지
  if (allAgents.length === 0) return null;

  return (
    <Box flexDirection="column">  {/* marginTop={1} 제거 */}
      {sortedCategories.map(category => (
        <CategoryRow
          key={category}
          category={category}
          agents={agentsByCategory.get(category) ?? []}
          activeAgentIds={activeAgentIds}
          icon={AGENT_ICONS[category]}
        />
      ))}
    </Box>
  );
}
```

### Step 3: agent-grid.pure.ts — `computeColumns`, `computeCardWidth` 제거 (미사용)

`BREAKPOINTS` 상수, `computeColumns`, `computeCardWidth` 제거.

### Step 4: 테스트 통과 확인

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/AgentGrid.tsx apps/mcp-server/src/tui/components/AgentGrid.spec.tsx apps/mcp-server/src/tui/components/agent-grid.pure.ts apps/mcp-server/src/tui/components/agent-grid.pure.spec.ts
git commit -m "feat(tui): remove AgentGrid margins and unused breakpoint logic"
```

---

## Task 9: status-bar.pure.ts — 컴팩트 상태 라인 빌더

현재: `borderStyle="single"` 박스 (3줄)
목표: `─── 🤖 2 active │ 🎹 frontend │ ▓▓▓░░░░ 30% │ ⚡ Parallel ───` (1줄)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/status-bar.pure.ts`
- Test: `apps/mcp-server/src/tui/components/status-bar.pure.spec.ts`

### Step 1: 실패하는 테스트 작성

```typescript
describe('buildCompactStatusLine', () => {
  it('should build single-line status with separators', () => {
    const result = buildCompactStatusLine(2, 'brainstorming, tdd', 45, 'Parallel', 60);
    expect(result).toContain('🤖 2 active');
    expect(result).toContain('│');
    expect(result).toContain('🎹 brainstorming, tdd');
    expect(result).toContain('45%');
    expect(result).toContain('⚡ Parallel');
    expect(result).toContain('───');
  });

  it('should show Waiting phase with 0 active', () => {
    const result = buildCompactStatusLine(0, '-', 0, 'Waiting', 80);
    expect(result).toContain('🤖 0 active');
    expect(result).toContain('⚡ Waiting');
  });
});
```

### Step 2: 테스트 실패 확인

### Step 3: 구현

```typescript
const DIVIDER_CHAR = '─';
const SEPARATOR = ' │ ';
const COMPACT_FILLED = '▓';
const COMPACT_EMPTY = '░';

export function buildCompactStatusLine(
  activeCount: number,
  skillsText: string,
  progress: number,
  phase: Phase,
  terminalWidth: number,
): string {
  const bar = buildProgressBar(progress, 7, COMPACT_FILLED, COMPACT_EMPTY);
  const content = `🤖 ${activeCount} active${SEPARATOR}🎹 ${skillsText}${SEPARATOR}${bar} ${progress}%${SEPARATOR}⚡ ${phase}`;
  const remaining = Math.max(0, terminalWidth - content.length - 6); // 6 for ─── on each side
  const sideLen = Math.floor(remaining / 2);
  const leftDivider = DIVIDER_CHAR.repeat(Math.max(3, sideLen));
  const rightDivider = DIVIDER_CHAR.repeat(Math.max(3, sideLen));
  return `${leftDivider} ${content} ${rightDivider}`;
}
```

### Step 4: 테스트 통과 확인

### Step 5: 커밋

```bash
git add apps/mcp-server/src/tui/components/status-bar.pure.ts apps/mcp-server/src/tui/components/status-bar.pure.spec.ts
git commit -m "feat(tui): add buildCompactStatusLine for single-line status display"
```

---

## Task 10: StatusBar.tsx — 보더리스 1줄 렌더링

**Files:**
- Modify: `apps/mcp-server/src/tui/components/StatusBar.tsx`
- Modify: `apps/mcp-server/src/tui/components/StatusBar.spec.tsx`

### Step 1: 테스트 업데이트

```typescript
it('should render single-line status without border', () => {
  const agents = [createDefaultAgentState({
    id: '1', name: 'agent', role: 'r', status: 'running', progress: 50,
  })];
  const { lastFrame } = render(<StatusBar agents={agents} skills={[]} />);
  const output = lastFrame() ?? '';
  expect(output).toContain('───');
  expect(output).toContain('🤖 1 active');
  expect(output).not.toContain('┌');
  expect(output).not.toContain('└');
});
```

### Step 2: StatusBar.tsx 수정

```typescript
import React from 'react';
import { Text, useStdout } from 'ink';
import type { AgentState } from '../types';
import type { SkillRecommendedEvent } from '../events';
import {
  countActiveAgents,
  calculateOverallProgress,
  determinePhase,
  buildSkillsDisplay,
  buildCompactStatusLine,
} from './status-bar.pure';

export function StatusBar({ agents, skills }: StatusBarProps): React.ReactElement {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns ?? 80;
  const activeCount = countActiveAgents(agents);
  const progress = calculateOverallProgress(agents);
  const phase = determinePhase(agents);
  const skillsText = buildSkillsDisplay(skills);
  const line = buildCompactStatusLine(activeCount, skillsText, progress, phase, terminalWidth);

  return <Text dimColor>{line}</Text>;
}
```

- `<Box borderStyle="single">` 제거 → 단일 `<Text>`
- `PHASE_COLORS` 맵, `buildStatusProgressBar`, `PROGRESS_WIDTH` 제거

### Step 3: 테스트 통과 확인

### Step 4: 커밋

```bash
git add apps/mcp-server/src/tui/components/StatusBar.tsx apps/mcp-server/src/tui/components/StatusBar.spec.tsx
git commit -m "feat(tui): convert StatusBar from bordered box to single-line divider"
```

---

## Task 11: index.ts exports — 불필요한 export 정리

**Files:**
- Modify: `apps/mcp-server/src/tui/components/index.ts`

### Step 1: export 정리

제거할 export:
- `CARD_WIDTH` (더 이상 외부에서 사용하지 않음)
- `computeColumns`, `computeCardWidth` (삭제된 함수)

추가할 export:
- `buildInlineCard`, `INLINE_NAME_COL_WIDTH`
- `buildCompactTree`, `CompactAgentLine`
- `buildInlineAgentTag`, `joinAgentTags`
- `buildCompactCategoryRow`, `LABEL_WIDTH`
- `buildCompactStatusLine`

### Step 2: 커밋

```bash
git add apps/mcp-server/src/tui/components/index.ts
git commit -m "refactor(tui): update component index exports for compact design"
```

---

## Task 12: 통합 테스트 + 전체 테스트 실행

**Files:**
- Modify: `apps/mcp-server/src/tui/app.spec.tsx`
- Modify: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

### Step 1: app.spec.tsx 업데이트

기존 통합 테스트에서 보더 스타일 기대값 제거, 인라인 텍스트 기대값으로 변경.

### Step 2: 전체 TUI 테스트 실행

```bash
cd apps/mcp-server && npx vitest run src/tui/
```

Expected: ALL PASS

### Step 3: 빌드 확인

```bash
cd apps/mcp-server && yarn build
```

### Step 4: 최종 커밋

```bash
git add -A
git commit -m "test(tui): update integration tests for compact design"
```

---

## Task 13: 미사용 코드 정리 (Refactor)

모든 테스트 통과 후 정리:

### 정리 대상

| 파일 | 제거 대상 |
|------|-----------|
| `agent-card.pure.ts` | `CARD_WIDTH` export (사용처 없음 확인 후) |
| `agent-card.pure.ts` | `getCardBorderColor` (AgentCard에서 미사용 확인 후) |
| `agent-tree.pure.ts` | `buildBranchLine`, `buildDropLines`, `buildVerticalConnector` (미사용 확인 후) |
| `agent-mini-card.pure.ts` | `MINI_CARD_NAME_MAX`, `getMiniCardBorderColor`, `getMiniCardTextDimmed`, `abbreviateMiniName` (CategoryRow에서 미사용 확인 후) |
| `agent-grid.pure.ts` | `BREAKPOINTS`, `computeColumns`, `computeCardWidth` (Task 8에서 이미 제거) |

### 주의사항
- 각 함수를 제거하기 전 `grep`으로 사용처 확인 필수
- 테스트 파일의 해당 테스트도 함께 제거
- `index.ts` export도 업데이트

### 커밋

```bash
git add -A
git commit -m "refactor(tui): remove unused bordered-card functions and constants"
```

---

## Execution Summary

| Task | Section | 변경 유형 | 독립성 |
|------|---------|-----------|--------|
| 1 | agent-card.pure | pure 함수 추가 | 독립 |
| 2 | AgentCard.tsx | 컴포넌트 수정 | Task 1 의존 |
| 3 | agent-tree.pure | pure 함수 추가 | Task 1 의존 |
| 4 | AgentTree.tsx | 컴포넌트 수정 | Task 2,3 의존 |
| 5 | agent-mini-card.pure | pure 함수 추가 | 독립 |
| 6 | category-row.pure | pure 함수 추가 | Task 5 의존 |
| 7 | CategoryRow.tsx | 컴포넌트 수정 | Task 6 의존 |
| 8 | AgentGrid.tsx | 컴포넌트 수정 | Task 7 의존 |
| 9 | status-bar.pure | pure 함수 추가 | 독립 |
| 10 | StatusBar.tsx | 컴포넌트 수정 | Task 9 의존 |
| 11 | index.ts | export 정리 | Task 1-10 의존 |
| 12 | 통합 테스트 | 테스트 수정 | Task 1-11 의존 |
| 13 | 코드 정리 | 리팩토링 | Task 12 의존 |

### Parallel Execution Groups

- **Group A** (독립): Task 1 → Task 2,3 → Task 4
- **Group B** (독립): Task 5 → Task 6 → Task 7 → Task 8
- **Group C** (독립): Task 9 → Task 10
- **Final**: Task 11 → Task 12 → Task 13

Group A, B, C는 병렬 실행 가능.
