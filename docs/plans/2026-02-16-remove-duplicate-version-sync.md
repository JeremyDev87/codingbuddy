# [#418] Plugin: 중복 버전 동기화 로직 제거 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `build.ts`와 `sync-version.js`에 중복된 `syncVersion()` 로직을 제거하여, 빌드 시 버전 동기화가 한 번만 실행되도록 한다.

**Architecture:** `prebuild` 훅(`sync-version.js`)이 버전 동기화의 유일한 진입점으로 유지된다. `build.ts`에서 `syncVersion()`을 제거하고 README 생성만 담당하도록 변경한다.

**Tech Stack:** TypeScript, Node.js, Vitest

---

## 현재 상태 분석

**문제:** `yarn build` 실행 시 버전 동기화가 2번 실행됨

```
yarn build
  → prebuild: node scripts/sync-version.js  (1차 동기화)
  → ts-node scripts/build.ts                (2차 동기화 - 중복!)
```

**영향 파일:**
- `packages/claude-code-plugin/scripts/build.ts` (lines 34-102: `syncVersion()`)
- `packages/claude-code-plugin/scripts/sync-version.js` (lines 22-72: `syncVersion()`)
- `packages/claude-code-plugin/scripts/build.spec.ts` (테스트 업데이트 필요)

**해결 방향:** Option 1 채택 - `build.ts`에서 `syncVersion()` 제거, `sync-version.js`를 유일한 동기화 스크립트로 유지

---

## Task 1: `build.ts`에서 `syncVersion()` 제거

**Files:**
- Modify: `packages/claude-code-plugin/scripts/build.ts:34-102` (syncVersion 함수 삭제)
- Modify: `packages/claude-code-plugin/scripts/build.ts:211-266` (main 함수 업데이트)

**Step 1: `syncVersion()` 함수 전체 삭제**

`build.ts`에서 `syncVersion()` 함수(lines 34-102)를 삭제한다.

**Step 2: `main()` 함수에서 syncVersion 호출 및 스텝 번호 업데이트**

```typescript
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CodingBuddy Claude Code Plugin Builder             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('ℹ️  Version sync handled by prebuild script (sync-version.js)');
  console.log('');

  const results: BuildResult[] = [];

  // Step 1: Generate README
  console.log('📖 Step 1: Generating README...');
  results.push(createReadme());

  // Summary
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('Build Summary');
  console.log('════════════════════════════════════════════════════════════\n');

  let allSuccess = true;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.step}`);

    for (const detail of result.details) {
      console.log(`   ${detail}`);
    }
    for (const error of result.errors) {
      console.log(`   ❗ ${error}`);
    }

    if (!result.success) {
      allSuccess = false;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  if (allSuccess) {
    console.log('✨ Build completed successfully!');
    console.log(`\nOutput directory: ${ROOT_DIR}`);
    console.log('  ├── .claude-plugin/  (plugin manifest)');
    console.log('  ├── .mcp.json        (MCP server configuration)');
    console.log('  └── README.md        (plugin documentation)');
    console.log(
      '\nNote: Agents, commands, and skills are provided by MCP server',
    );
    console.log(
      '      from packages/rules/.ai-rules/ (single source of truth)',
    );
  } else {
    console.log('❌ Build completed with errors');
    process.exit(1);
  }
}
```

**Step 3: 사용되지 않는 MCP_SERVER_DIR 상수 확인 후 삭제 (다른 곳에서 미사용 시)**

`MCP_SERVER_DIR`이 `syncVersion()`에서만 사용되는지 확인하고, 다른 곳에서 참조하지 않으면 삭제한다.

**Step 4: 테스트 실행하여 기존 테스트 통과 확인**

Run: `yarn workspace codingbuddy-claude-plugin test`
Expected: 일부 테스트는 아직 실패 가능 (Task 2에서 테스트 업데이트 예정)

**Step 5: Commit**

```bash
git add packages/claude-code-plugin/scripts/build.ts
git commit -m "refactor(plugin): remove duplicate syncVersion from build.ts (#418)"
```

---

## Task 2: `build.spec.ts` 테스트 업데이트

**Files:**
- Modify: `packages/claude-code-plugin/scripts/build.spec.ts`

**Step 1: `BuildResult` "Version Sync" shape 테스트 제거**

`BuildResult interface consistency` describe 블록에서 "has correct shape for version sync" 테스트를 삭제한다. `build.ts`에서 더 이상 Version Sync 단계가 없으므로 해당 테스트는 불필요하다.

또한 "captures errors correctly" 테스트에서 'Version Sync'를 참조하는 부분을 'README Generation'으로 변경한다.

**Step 2: `peerDependencies sync logic` 테스트를 새 파일로 이동 준비**

이 테스트들은 `sync-version.js`의 로직을 검증하므로, `build.spec.ts`에서 제거하고 Task 3에서 `sync-version.spec.ts`에 추가한다.

**Step 3: 테스트 실행**

Run: `yarn workspace codingbuddy-claude-plugin test`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/claude-code-plugin/scripts/build.spec.ts
git commit -m "test(plugin): update build.spec.ts after syncVersion removal (#418)"
```

---

## Task 3: `sync-version.spec.ts` 테스트 작성

**Files:**
- Create: `packages/claude-code-plugin/scripts/sync-version.spec.ts`

**Step 1: 실패하는 테스트 작성**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('sync-version script', () => {
  describe('peerDependencies computation logic', () => {
    function computeExpectedPeer(version: string): string {
      const [major, minor] = version.split('.');
      return `^${major}.${minor}.0`;
    }

    it('computes correct peerDependencies from version', () => {
      expect(computeExpectedPeer('4.0.1')).toBe('^4.0.0');
      expect(computeExpectedPeer('4.1.0')).toBe('^4.1.0');
      expect(computeExpectedPeer('5.2.3')).toBe('^5.2.0');
    });

    it('detects peerDependencies mismatch when version already matches', () => {
      const currentVersion = '4.0.1';
      const stalePeer = '^3.0.0';
      const expectedPeer = computeExpectedPeer(currentVersion);

      expect(stalePeer).not.toBe(expectedPeer);
      expect(expectedPeer).toBe('^4.0.0');
    });
  });

  describe('syncVersion integration', () => {
    // sync-version.js를 child_process로 실행하여 동작 검증
    // 파일 시스템 mock을 사용한 통합 테스트
  });
});
```

**Step 2: 테스트 실행하여 통과 확인**

Run: `yarn workspace codingbuddy-claude-plugin test`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/claude-code-plugin/scripts/sync-version.spec.ts
git commit -m "test(plugin): add sync-version.spec.ts with peerDeps logic tests (#418)"
```

---

## Task 4: 빌드 검증 (수동)

**Step 1: `yarn build` 실행하여 동기화가 한 번만 실행되는지 확인**

Run: `yarn workspace codingbuddy-claude-plugin build`
Expected:
- `[sync-version]` 로그가 **prebuild 단계에서 1번만** 출력
- `build.ts`에서 `Version Sync` 단계 로그 없음
- README.md 정상 생성

**Step 2: 동기화된 버전이 정확한지 확인**

```bash
# MCP server 버전과 plugin 버전이 일치하는지 확인
node -e "
  const mcp = require('./apps/mcp-server/package.json');
  const plugin = require('./packages/claude-code-plugin/package.json');
  console.log('MCP:', mcp.version);
  console.log('Plugin:', plugin.version);
  console.log('Match:', mcp.version === plugin.version);
"
```

**Step 3: 전체 테스트 스위트 실행**

Run: `yarn workspace codingbuddy-claude-plugin test`
Expected: ALL PASS

---

## 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `scripts/build.ts` | `syncVersion()` 함수 삭제, `main()` 스텝 번호 변경, `MCP_SERVER_DIR` 삭제 |
| `scripts/build.spec.ts` | "Version Sync" shape 테스트 제거, peerDeps 로직 테스트 제거 |
| `scripts/sync-version.spec.ts` | 신규 생성 - peerDeps 계산 로직 테스트 |
| `package.json` | 변경 없음 (`prebuild` 스크립트 유지) |

## 실행 후 확인

- [ ] `yarn build`에서 버전 동기화가 1번만 실행됨
- [ ] 동기화된 버전이 MCP server와 일치함
- [ ] 모든 테스트 통과
- [ ] lint/typecheck 통과
