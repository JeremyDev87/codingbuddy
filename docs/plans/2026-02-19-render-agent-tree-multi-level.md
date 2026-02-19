# renderAgentTree Multi-Level Subtree Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `renderAgentTree`가 depth=1에서만 렌더링하던 한계를 제거하고, 재귀적 서브트리 탐색으로 depth ≥ 2 에이전트도 올바르게 렌더링한다.

**Architecture:** 현재 flat loop 방식을 `renderSubtree` 재귀 헬퍼로 교체한다. `visited` Set으로 순환 엣지를 방지하고, `prefix` 문자열로 `│` continuation 라인을 정확히 그린다.

**Tech Stack:** TypeScript (strict), Vitest, 기존 `truncateToDisplayWidth` / `estimateDisplayWidth` 유틸

**Reference Issue:** https://github.com/JeremyDev87/codingbuddy/issues/557

---

## Task 1: 실패하는 테스트 3개 추가 (RED)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/activity-visualizer.pure.spec.ts`

**Step 1: 테스트 3개 추가**

`describe('renderAgentTree')` 블록 끝(line 174 `}`이전)에 아래 3개 테스트를 삽입한다.

```typescript
  it('shows grandchild agent (depth 2)', () => {
    const agents = new Map<string, DashboardNode>();
    agents.set('root', createDefaultDashboardNode({ id: 'root', name: 'root', stage: 'PLAN', status: 'running', isPrimary: true }));
    agents.set('child', createDefaultDashboardNode({ id: 'child', name: 'child', stage: 'PLAN', status: 'running' }));
    agents.set('grandchild', createDefaultDashboardNode({ id: 'grandchild', name: 'grandchild', stage: 'PLAN', status: 'idle' }));
    const edges: Edge[] = [
      { from: 'root', to: 'child', label: '', type: 'delegation' },
      { from: 'child', to: 'grandchild', label: '', type: 'delegation' },
    ];
    const lines = renderAgentTree(agents, edges, [], 80, 10);
    expect(lines.join('\n')).toContain('grandchild');
  });

  it('does not enter infinite loop on cyclic edges', () => {
    const agents = new Map<string, DashboardNode>();
    agents.set('a', createDefaultDashboardNode({ id: 'a', name: 'a', stage: 'PLAN', status: 'running', isPrimary: true }));
    agents.set('b', createDefaultDashboardNode({ id: 'b', name: 'b', stage: 'PLAN', status: 'running' }));
    const edges: Edge[] = [
      { from: 'a', to: 'b', label: '', type: 'delegation' },
      { from: 'b', to: 'a', label: '', type: 'delegation' }, // cycle
    ];
    expect(() => renderAgentTree(agents, edges, [], 80, 10)).not.toThrow();
  });

  it('indents grandchildren deeper than direct children', () => {
    const agents = new Map<string, DashboardNode>();
    agents.set('root', createDefaultDashboardNode({ id: 'root', name: 'root', stage: 'PLAN', status: 'running', isPrimary: true }));
    agents.set('child', createDefaultDashboardNode({ id: 'child', name: 'child', stage: 'PLAN', status: 'running' }));
    agents.set('grandchild', createDefaultDashboardNode({ id: 'grandchild', name: 'grandchild', stage: 'PLAN', status: 'idle' }));
    const edges: Edge[] = [
      { from: 'root', to: 'child', label: '', type: 'delegation' },
      { from: 'child', to: 'grandchild', label: '', type: 'delegation' },
    ];
    const lines = renderAgentTree(agents, edges, [], 80, 10);
    const childLine = lines.find(l => l.includes('child') && !l.includes('grandchild'))!;
    const grandchildLine = lines.find(l => l.includes('grandchild'))!;
    const childIndent = childLine.search(/\S/);
    const grandchildIndent = grandchildLine.search(/\S/);
    expect(grandchildIndent).toBeGreaterThan(childIndent);
  });
```

**Step 2: 테스트 실행 → RED 확인**

```bash
cd apps/mcp-server && yarn test --run src/tui/components/activity-visualizer.pure.spec.ts
```

Expected: 새 테스트 3개 FAIL (grandchild not shown), 기존 14개 PASS

---

## Task 2: `renderSubtree` 재귀 헬퍼 추가 및 `renderAgentTree` 수정 (GREEN)

**Files:**
- Modify: `apps/mcp-server/src/tui/components/activity-visualizer.pure.ts`

**Step 1: `TreeChild` 타입과 `renderAgentTree` 사이에 `renderSubtree` 헬퍼 추가**

`type TreeChild` 선언(line 22) 직후, `export function renderAgentTree` 직전에 삽입:

```typescript
function renderSubtree(
  nodeId: string,
  agents: Map<string, DashboardNode>,
  childrenOf: Map<string, string[]>,
  visited: Set<string>,
  prefix: string,
  isLast: boolean,
  lines: string[],
  height: number,
  width: number,
): void {
  if (lines.length >= height) return;
  if (visited.has(nodeId)) return; // cycle guard
  visited.add(nodeId);

  const node = agents.get(nodeId);
  if (!node) return;

  const connector = isLast ? '└' : '├';
  const icon = ACTIVITY_STATUS_ICONS[node.status] ?? '?';
  lines.push(truncateToDisplayWidth(`${prefix}${connector} ${icon} ${node.name}`, width));

  const childIds = (childrenOf.get(nodeId) ?? []).filter(id => agents.has(id));
  const nextPrefix = prefix + (isLast ? '   ' : '│  ');
  for (let i = 0; i < childIds.length; i++) {
    if (lines.length >= height) break;
    renderSubtree(
      childIds[i],
      agents,
      childrenOf,
      visited,
      nextPrefix,
      i === childIds.length - 1,
      lines,
      height,
      width,
    );
  }
}
```

**Step 2: `renderAgentTree`의 flat loop 부분 교체 (lines 55–75)**

기존 코드:
```typescript
  // Collect children: edge-based agents + activeSkills as leaf nodes
  const childIds = childrenOf.get(root.id) ?? [];
  const agentChildren: TreeChild[] = childIds
    .filter(id => agents.has(id))
    .map(id => ({ type: 'agent', node: agents.get(id)! }));
  const skillChildren: TreeChild[] = activeSkills.map(s => ({ type: 'skill', name: s }));
  const allChildren: TreeChild[] = [...agentChildren, ...skillChildren];

  for (let i = 0; i < allChildren.length; i++) {
    if (lines.length >= height) break;
    const isLast = i === allChildren.length - 1;
    const connector = isLast ? '└' : '├';
    const item = allChildren[i];

    if (item.type === 'agent') {
      const icon = ACTIVITY_STATUS_ICONS[item.node.status] ?? '?';
      lines.push(truncateToDisplayWidth(`  ${connector} ${icon} ${item.node.name}`, width));
    } else {
      lines.push(truncateToDisplayWidth(`  ${connector} ◉ ${item.name} (skill)`, width));
    }
  }
```

교체할 코드:
```typescript
  // Recursive subtree rendering with cycle detection
  const visited = new Set<string>([root.id]);
  const rootChildIds = (childrenOf.get(root.id) ?? []).filter(id => agents.has(id));
  const totalChildren = rootChildIds.length + activeSkills.length;

  for (let i = 0; i < rootChildIds.length; i++) {
    if (lines.length >= height) break;
    const isLast = i === totalChildren - 1;
    renderSubtree(rootChildIds[i], agents, childrenOf, visited, '  ', isLast, lines, height, width);
  }

  for (let i = 0; i < activeSkills.length; i++) {
    if (lines.length >= height) break;
    const isLast = rootChildIds.length + i === totalChildren - 1;
    const connector = isLast ? '└' : '├';
    lines.push(truncateToDisplayWidth(`  ${connector} ◉ ${activeSkills[i]} (skill)`, width));
  }
```

> **참고:** `TreeChild`, `AgentChild`, `SkillChild` 타입은 더 이상 사용되지 않으므로 삭제 가능 (선택 사항)

**Step 3: 테스트 실행 → GREEN 확인**

```bash
cd apps/mcp-server && yarn test --run src/tui/components/activity-visualizer.pure.spec.ts
```

Expected: 전체 17개 PASS

---

## Task 3: 전체 테스트 스위트 확인 (회귀 없음)

**Step 1: 전체 테스트 실행**

```bash
cd apps/mcp-server && yarn test --run
```

Expected: 모든 테스트 PASS, 실패 없음

---

## Task 4: TypeScript 타입 체크

**Step 1: tsc --noEmit 실행**

```bash
cd apps/mcp-server && yarn tsc --noEmit
```

Expected: 에러 없음

---

## Task 5: 사용하지 않는 타입 정리 (선택적 Refactor)

`AgentChild`, `SkillChild`, `TreeChild` 타입이 `renderSubtree` 도입 후 미사용 상태가 되면 삭제한다.

```bash
cd apps/mcp-server && yarn test --run && yarn tsc --noEmit
```

Expected: 여전히 모두 PASS

---

## Acceptance Criteria

- [ ] depth ≥ 2 에이전트가 edges를 통해 렌더링됨
- [ ] 순환 엣지가 무한 루프를 일으키지 않음 (visited Set)
- [ ] 각 depth 레벨이 부모보다 더 깊은 indentation을 가짐
- [ ] 비-마지막 조상에 `│` continuation 라인 표시
- [ ] `lines.length >= height` 조건이 모든 depth에서 유지됨
- [ ] `truncateToDisplayWidth`가 모든 라인에 적용됨
- [ ] activeSkills가 에이전트 서브트리 이후 leaf 노드로 렌더링됨
- [ ] 기존 14개 테스트 모두 통과
- [ ] 신규 3개 테스트 (grandchild, cycle, indentation) 통과
- [ ] TypeScript strict mode, `any` 없음
