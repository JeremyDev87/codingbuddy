# fix(rules): core.md blocker rule conflicts with Error Recovery policy

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `core.md:549`의 무조건 PLAN 복귀 규칙을 recoverable/unrecoverable 구분으로 교체하여 Error Recovery 정책과의 충돌을 해소한다.

**Architecture:** `core.md`과 `act.md` 두 파일에 동일한 문제 라인이 존재. 이슈에서 제안한 recoverable/unrecoverable 구분을 적용하여, 복구 가능한 에러는 즉시 대안을 시도하고 복구 불가능한 blocker만 PLAN으로 복귀하도록 변경한다.

**Tech Stack:** Markdown (규칙 파일)

**관련 이슈:** https://github.com/JeremyDev87/codingbuddy/issues/688

---

## 분석

### 충돌 요약

| 위치 | 현재 규칙 | 문제 |
|------|-----------|------|
| `core.md:549` | "Stop and return to PLAN if blockers encountered" | 모든 에러를 blocker로 취급, CLI 에러에도 중단 |
| `CLAUDE.md:103-106` | "자동 복구, 대안 시도, 워크플로우 중단 금지" | recoverable 에러는 즉시 복구해야 함 |
| `act.md:165` | `core.md:549`와 동일 | `core.md` 변경 시 함께 수정 필요 |

### 실제 사례 (이슈에서 보고)

`cd apps/mcp-server` 후 `git add apps/mcp-server/src/...` 실행 → 이중 경로 에러 → AI가 "blocker"로 판단하고 중단 → 사용자가 수동으로 `continue` 입력해야 재개

---

## Task 1: `core.md` blocker 규칙 수정

**Files:**
- Modify: `packages/rules/.ai-rules/rules/core.md:549`

**Step 1: 현재 라인 확인**

Run: `grep -n "Stop and return to PLAN if blockers encountered" packages/rules/.ai-rules/rules/core.md`
Expected: `549:- Stop and return to PLAN if blockers encountered`

**Step 2: 라인 교체**

현재:
```markdown
- Stop and return to PLAN if blockers encountered
```

변경:
```markdown
- On recoverable errors (file not found, command failure, path issues), try alternatives immediately
- Only return to PLAN on unrecoverable blockers (missing dependencies, architectural conflicts)
```

**Step 3: 변경 확인**

Run: `grep -n -A1 "recoverable" packages/rules/.ai-rules/rules/core.md`
Expected: 두 라인이 올바르게 삽입됨

**Step 4: Commit**

```bash
git add packages/rules/.ai-rules/rules/core.md
git commit -m "fix(rules): replace blanket blocker rule with recoverable/unrecoverable distinction

Resolves conflict between core.md ACT mode blocker rule and
CLAUDE.md Error Recovery policy.

- Recoverable errors (file not found, command failure, path issues):
  try alternatives immediately
- Unrecoverable blockers (missing dependencies, architectural conflicts):
  return to PLAN

Fixes #688"
```

---

## Task 2: `act.md` blocker 규칙 동기화

**Files:**
- Modify: `packages/claude-code-plugin/commands/act.md:165`

**Step 1: 현재 라인 확인**

Run: `grep -n "Stop and return to PLAN if blockers encountered" packages/claude-code-plugin/commands/act.md`
Expected: `165:- Stop and return to PLAN if blockers encountered`

**Step 2: 라인 교체**

현재:
```markdown
- Stop and return to PLAN if blockers encountered
```

변경:
```markdown
- On recoverable errors (file not found, command failure, path issues), try alternatives immediately
- Only return to PLAN on unrecoverable blockers (missing dependencies, architectural conflicts)
```

**Step 3: 변경 확인**

Run: `grep -n -A1 "recoverable" packages/claude-code-plugin/commands/act.md`
Expected: 두 라인이 올바르게 삽입됨

**Step 4: Commit**

```bash
git add packages/claude-code-plugin/commands/act.md
git commit -m "fix(rules): sync act.md blocker rule with core.md update

Apply same recoverable/unrecoverable distinction to act.md.

Refs #688"
```

---

## 검증 체크리스트

- [ ] `core.md`에서 원래 라인("Stop and return to PLAN if blockers encountered")이 제거됨
- [ ] `act.md`에서 원래 라인이 제거됨
- [ ] 두 파일 모두 동일한 recoverable/unrecoverable 규칙이 적용됨
- [ ] `CLAUDE.md` Error Recovery 정책(103-106행)과 충돌 없음
- [ ] 다른 파일에 동일한 충돌 라인이 없음 (grep 확인 완료)
