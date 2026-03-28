---
name: taskmaestro
description: Use when orchestrating parallel Claude Code instances across tmux panes with git worktree isolation — managing multiple concurrent development tasks visually
argument-hint: <start|assign|status|watch|send|stop> [args...]
user-invocable: true
---

# TaskMaestro — tmux 패널 오케스트레이터

현재 tmux 세션의 기존 패널들에서 Claude Code를 병렬로 실행하고, 이 패널(지휘자)에서 제어한다.
각 패널은 독립된 git worktree에서 작업하며, 지휘자가 작업 지시, 상태 감시를 수행한다.

**전제 조건:** 지휘자(이 Claude Code)가 tmux 패널 중 하나에서 실행 중이어야 하며, 나머지 패널들이 이미 열려있어야 한다.

## Arguments 파싱

`$ARGUMENTS`를 파싱하여 서브커맨드와 인수를 분리한다:

- `start [--repo <path>] [--base <branch>] [--panes <1,2,3>] [--review-pane]`
- `assign <패널번호> "<작업 지시>"`
- `status`
- `watch`
- `send <패널번호> "<텍스트>"`
- `stop [패널번호|all]`

서브커맨드에 해당하는 섹션으로 이동한다.

## 현재 tmux 환경 감지

모든 서브커맨드에서 먼저 실행:

```bash
# 현재 tmux 소켓, 세션, 윈도우 정보를 자동 감지
TMUX_SOCKET=$(tmux display-message -p '#{socket_path}')
# 소켓 이름 추출 (경로에서 마지막 부분)
SOCKET_NAME=$(basename "$TMUX_SOCKET")
SESSION=$(tmux display-message -p '#{session_name}')
WIN_IDX=$(tmux display-message -p '#{window_index}')
MY_PANE=$(tmux display-message -p '#{pane_index}')
```

> tmux 명령어에서 `-L` 플래그는 소켓 이름을 사용한다. `tmux -L "$SOCKET_NAME" send-keys ...` 형태로 사용.

---

## Worker Completion Signaling (RESULT.json)

워커가 작업을 완료하면 `.taskmaestro/wt-N/RESULT.json` 파일을 생성하여 지휘자에게 결과를 알린다.
이 파일은 watch 모드의 **1차 감지 수단**이며, capture-pane은 fallback으로만 사용한다.

### RESULT.json 스키마

```json
{
  "status": "success | failure | error | review_pending | review_addressed | approved",
  "issue": "#767",
  "pr_number": 123,
  "pr_url": "https://github.com/org/repo/pull/123",
  "timestamp": "2026-03-22T01:13:00.000Z",
  "cost": "$0.45",
  "error": null,
  "review_cycle": 0,
  "review_comments": []
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | `"success" \| "failure" \| "error" \| "review_pending" \| "review_addressed" \| "approved"` | ✅ | 작업 결과. `success`: PR 생성 완료 (리뷰 대기), `failure`: 작업 실패 (테스트 실패 등), `error`: 예기치 못한 오류, `review_pending`: 지휘자 리뷰 코멘트 작성 완료 (워커 응답 대기), `review_addressed`: 워커가 리뷰 반영 완료 (재리뷰 대기), `approved`: 지휘자 최종 승인 (진짜 완료) |
| `issue` | `string \| null` | ❌ | 관련 이슈 번호 (예: `"#767"`) |
| `pr_number` | `number \| null` | ❌ | 생성된 PR 번호 |
| `pr_url` | `string \| null` | ❌ | 생성된 PR URL |
| `timestamp` | `string` | ✅ | ISO 8601 완료 시각 |
| `cost` | `string \| null` | ❌ | 세션 비용 (예: `"$0.45"`) |
| `error` | `string \| null` | ❌ | 에러 메시지 (`status`가 `"error"`일 때) |
| `review_cycle` | `number` | ❌ | 현재 리뷰 사이클 횟수 (기본값: 0) |
| `review_comments` | `string[]` | ❌ | 지휘자가 남긴 리뷰 코멘트 요약 목록 |

### 파일 경로 규칙

- 위치: `<repo>/.taskmaestro/wt-<N>/RESULT.json` (각 워커의 worktree 루트)
- 워커는 작업 완료 **직전** (커밋/PR 생성 후, 세션 종료 전)에 이 파일을 작성한다
- 지휘자는 이 파일의 존재 여부로 워커 완료를 감지한다


## Review Cycle Protocol

워커가 PR을 생성하고 RESULT.json에 `status: "success"`를 기록하면, 리뷰 사이클을 시작한다.
`status: "approved"`가 될 때까지 반복하며, 승인 시점이 "진짜 완료"가 된다.

> **리뷰 에이전트 패널이 설정된 경우:** 지휘자가 직접 리뷰하지 않고, 리뷰 에이전트 패널에 리뷰를 위임한다.
> 아래 [Review Agent Protocol](#review-agent-protocol) 섹션을 참조한다.
> 리뷰 에이전트가 없는 경우에만 지휘자가 직접 리뷰를 수행한다 (아래 Fallback 참조).

### Trigger

Watch 모드가 RESULT.json을 감지했을 때:
- `status: "success"` → **리뷰 사이클 시작** (기존처럼 "done"으로 보고하지 않음)
- `status: "failure"` / `"error"` → 사용자에게 보고 (기존 동작 유지)
- `status: "review_pending"` → 워커 응답 대기 중 (지휘자 대기)
- `status: "review_addressed"` → 재리뷰 시작
- `status: "approved"` → 진짜 완료 ✅

### Review Routing

`status: "success"` 또는 `status: "review_addressed"` 감지 시:

1. **상태 파일에서 `review_pane` 확인**
2. `review_pane`이 존재하면 → **Review Agent Protocol** 실행 (리뷰 에이전트에 위임)
3. `review_pane`이 없으면 → **Conductor Fallback Review** 실행 (지휘자 직접 리뷰)

### Conductor Fallback Review (리뷰 에이전트 없을 때)

리뷰 에이전트 패널이 설정되지 않은 경우, 지휘자가 직접 리뷰를 수행한다:

1. **PR diff 읽기**
   ```bash
   gh pr diff <PR_NUMBER>
   ```

2. **체크리스트 생성**
   codingbuddy `generate_checklist` MCP 도구로 변경 파일 기반 도메인별 체크리스트를 생성한다.

3. **리뷰 코멘트 작성**
   변경 내용 + 체크리스트를 기반으로 리뷰를 수행하고 PR에 코멘트를 작성한다:
   ```bash
   gh pr review <PR_NUMBER> --comment --body "<리뷰 내용>"
   ```

4. **RESULT.json 업데이트**
   지휘자가 RESULT.json을 업데이트한다:
   ```json
   {
     "status": "review_pending",
     "review_cycle": 1,
     "review_comments": ["unused import 'FileChangeStats'", "missing error handling", "..."]
   }
   ```

5. **워커에게 리뷰 반영 지시**
   ```bash
   tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" \
     "PR #<PR_NUMBER>에 리뷰 코멘트가 달렸다. gh pr view <PR_NUMBER> --comments 로 확인하고, 수용할 부분은 코드 수정 후 push하고, 거부할 부분은 PR에 반박 코멘트를 남겨라. 완료 후 RESULT.json의 status를 \"review_addressed\"로 업데이트해라." Enter
   ```

6. **워커 응답**
   워커가 리뷰에 대응한다:
   - 수용: 코드 수정 → push
   - 거부: PR에 반박 코멘트 작성 (사유 포함)
   - 각 코멘트에 "Resolved: [수행한 작업]" 형태로 회신
   - 완료 후 RESULT.json 업데이트: `status: "review_addressed"`

7. **재리뷰**
   지휘자가 `status: "review_addressed"`를 감지하면:
   - `gh pr diff <PR_NUMBER>` 재확인
   - 미해결 코멘트 확인
   - 충분히 개선됐으면 → **승인** (Step 8)
   - 아직 부족하면 → Step 3부터 반복

8. **최종 승인**
   ```bash
   # 자신의 PR이 아닌 경우
   gh pr review <PR_NUMBER> --approve --body "LGTM - all review comments addressed"
   # 자신의 PR인 경우 (approve 불가) — 코멘트로 대체
   gh pr review <PR_NUMBER> --comment --body "✅ Review complete - all comments addressed"
   ```
   RESULT.json 업데이트: `status: "approved"`

### Max Review Cycles

- **최대 3회** 리뷰 사이클 (무한 루프 방지)
- 3회 초과 시 사용자에게 보고:
  ```
  ⚠️ 패널 N: 3회 리뷰 후에도 미해결 이슈가 있습니다.
  PR: #<PR_NUMBER>
  미해결 코멘트: [목록]
  사용자 판단이 필요합니다.
  ```
- 이후 지휘자는 해당 패널의 리뷰를 중단하고 사용자 지시를 대기한다.

### Quality Criteria for Approval

approve할 조건:
- CI 전체 통과 (`gh pr checks <PR_NUMBER>`)
- 미사용 변수/import 없음
- 새 코드에 적절한 테스트 존재
- 기존 테스트 깨지지 않음
- 코드 스타일 일관성 유지

---

## Review Agent Protocol

리뷰 에이전트 패널이 설정된 경우, 워커 PR 리뷰를 전담한다.
지휘자는 오케스트레이션만 담당하고, 코드 리뷰는 리뷰 에이전트가 수행한다.

```
기존: Worker PR → Conductor 리뷰 (품질 낮음)
변경: Worker PR → Review Agent 리뷰 → Conductor는 결과만 전달
```

### Trigger

지휘자가 워커의 RESULT.json에서 `status: "success"` 또는 `status: "review_addressed"`를 감지하면,
리뷰 에이전트 패널에 리뷰 프롬프트를 전송한다.

### Review Agent Checklist (MANDATORY ORDER)

리뷰 에이전트는 반드시 아래 순서대로 수행한다:

1. **CI Gate (MUST)**: `gh pr checks <PR_NUMBER>` — ALL checks must pass. If any fail, STOP and report failure with logs. DO NOT proceed to code review.
2. **Local Verification**: PR 브랜치에서 `yarn lint` 및 `yarn type-check` 실행하여 CI와 동일한 이슈를 로컬에서 포착
3. **Code Quality Scan**: `gh pr diff <PR_NUMBER>` — 다음을 검사:
   - Unused imports/variables
   - `any` types
   - Missing error handling
   - Dead code
4. **Spec Compliance**: issue 요구사항(`gh issue view <ISSUE_NUMBER>`)과 실제 구현을 대조
5. **Test Coverage**: 새 코드에 적절한 테스트가 있는지 확인
6. **Write Review**: `gh pr review --comment`로 구조화된 리뷰 코멘트를 PR에 작성

### Review Agent Prompt Template

지휘자가 리뷰 에이전트 패널에 전송하는 프롬프트:

```
Review PR #<PR_NUMBER> for issue #<ISSUE_NUMBER>.

MANDATORY REVIEW CHECKLIST (follow in order):

1. CI CHECK (BLOCKING):
   gh pr checks <PR_NUMBER>
   If ANY check fails → STOP. Report: "CI FAILED: <job_name> — <log_url>"
   DO NOT proceed to code review if CI fails.

2. LOCAL VERIFICATION:
   git fetch origin && git checkout <branch>
   yarn lint
   yarn type-check
   Report any errors.

3. CODE QUALITY (gh pr diff <PR_NUMBER>):
   - Unused imports/variables?
   - any types?
   - Missing error handling?
   - Dead code?

4. SPEC COMPLIANCE:
   gh issue view <ISSUE_NUMBER>
   Compare requirements with implementation. List any gaps.

5. TEST COVERAGE:
   Are new functions/features tested?
   Are edge cases covered?

6. WRITE REVIEW:
   gh pr review <PR_NUMBER> --comment --body "<structured review>"

Format your review as:
## Review: [APPROVE | CHANGES_REQUESTED]
### CI Status: [PASS | FAIL]
### Issues Found:
- [critical/high/medium/low]: description
### Recommendation: [APPROVE | REQUEST_CHANGES]

After posting review, write RESULT.json with:
{
  "status": "success",
  "review_result": "approve | changes_requested",
  "issues_found": <number>,
  "critical_count": <number>,
  "high_count": <number>
}
```

전송 방식:
```bash
tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$REVIEW_PANE" \
  "$REVIEW_PROMPT" Enter
```

> **참고:** 프롬프트가 길어 send-keys로 직접 전송 시 잘릴 수 있다. 이 경우 프롬프트를 TASK.md 파일에 저장하고 `send-keys`로 파일 경로를 참조하여 전송한다.

### Review Agent RESULT.json

리뷰 에이전트의 결과 파일은 리뷰 에이전트 패널의 worktree에 기록된다:
`<repo>/.taskmaestro/wt-<review_pane_idx>/RESULT.json`

```json
{
  "status": "success",
  "review_result": "approve | changes_requested",
  "issues_found": 3,
  "critical_count": 0,
  "high_count": 1
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | `"success" \| "error"` | ✅ | 리뷰 작업 자체의 성공/실패 |
| `review_result` | `"approve" \| "changes_requested"` | ✅ | 리뷰 판정 결과 |
| `issues_found` | `number` | ✅ | 발견된 총 이슈 수 |
| `critical_count` | `number` | ✅ | Critical severity 이슈 수 |
| `high_count` | `number` | ✅ | High severity 이슈 수 |

### Conductor Handling of Review Agent Result

지휘자가 리뷰 에이전트의 RESULT.json을 감지하면:

1. **`review_result: "approve"`인 경우:**
   - 워커의 RESULT.json을 `status: "approved"`로 업데이트
   - 최종 승인 코멘트를 PR에 작성:
     ```bash
     gh pr review <PR_NUMBER> --approve --body "LGTM - review agent approved"
     # 자신의 PR인 경우:
     gh pr review <PR_NUMBER> --comment --body "✅ Review complete - review agent approved"
     ```
   - 사용자에게 완료 보고

2. **`review_result: "changes_requested"`인 경우:**
   - 워커의 RESULT.json을 `status: "review_pending"`으로 업데이트 (review_cycle 증가)
   - 워커에게 리뷰 반영 지시:
     ```bash
     tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$WORKER_PANE" \
       "PR #<PR_NUMBER>에 리뷰 코멘트가 달렸다. gh pr view <PR_NUMBER> --comments 로 확인하고, 수용할 부분은 코드 수정 후 push하고, 거부할 부분은 PR에 반박 코멘트를 남겨라. 완료 후 RESULT.json의 status를 \"review_addressed\"로 업데이트해라." Enter
     ```

3. **리뷰 에이전트 초기화:**
   - 리뷰 에이전트의 RESULT.json 삭제 (다음 리뷰를 위한 준비):
     ```bash
     rm -f "$REPO/.taskmaestro/wt-$REVIEW_PANE/RESULT.json"
     ```
   - 리뷰 에이전트 패널의 상태를 `"idle"`로 업데이트

### Review Cycle State in taskmaestro-state.json

리뷰 사이클 중 각 패널의 상태 파일 필드:
```json
{
  "index": 1,
  "role": "worker",
  "worktree": "...",
  "branch": "...",
  "task": "...",
  "status": "review_pending",
  "result": { "...RESULT.json 내용..." },
  "review_cycle": 1,
  "pr_number": 42
}
```

리뷰 에이전트 패널의 상태:
```json
{
  "index": 3,
  "role": "reviewer",
  "worktree": "...",
  "branch": "...",
  "task": "Reviewing PR #42 for issue #767",
  "status": "reviewing",
  "result": null
}
```

`status` 값 매핑:
- `"working"` → 워커 작업 중
- `"reviewing"` → 리뷰 에이전트가 PR 리뷰 중 (리뷰어 패널 전용)
- `"review_pending"` → 리뷰 코멘트 작성 완료, 워커 응답 대기
- `"review_addressed"` → 워커 리뷰 반영 완료, 재리뷰 대기
- `"approved"` → 최종 승인 완료 (진짜 done)
- `"done"` → 리뷰 없이 완료 (failure/error 포함)

---

## Merge Policy (MANDATORY)

**The conductor MUST NEVER merge PRs or modify the master/main branch.**

Prohibited commands:
- `gh pr merge` (all flags: --squash, --merge, --rebase, --admin, --auto)
- `git merge`
- `git pull origin master` / `git pull origin main` (includes merge)
- Any command that modifies the remote default branch

Allowed:
- `git fetch origin` (read-only)
- `gh pr create` (create PR, not merge)
- `gh pr view` (read-only)

**Protocol:**
1. Worker creates PR via `/ship` → reports PR URL
2. Conductor reports PR URL to user
3. User merges PR at their discretion
4. User notifies conductor: "머지했음" / "merged"
5. Conductor runs `git fetch origin` to verify, then proceeds

**Wave transition:**
- After all workers in a wave create PRs, report to user: "Wave N complete. PRs: #X, #Y, #Z. 머지 후 알려주세요."
- Wait for user confirmation before creating next wave's worktrees

---

## Wave Analysis: Shared File Prediction

Before assigning issues to a wave, predict the FULL file footprint per issue:

1. **Explicit files**: Listed in issue body
2. **Implicit shared files** (always check):
   - `package.json` — dependency changes
   - `config.schema.ts` / `*.config.*` — schema/config updates
   - `index.ts` / barrel exports — new module exports
   - `README.md` — documentation updates
   - `.gitignore` — new artifacts
3. **MCP server issues**: Always flag `config.schema.ts` as potential overlap

**Overlap check:**
```
For each pair of issues in the wave:
  shared_files = issue_A.files ∩ issue_B.files
  if shared_files is not empty:
    → Move one issue to next wave OR make sequential in same pane
```

**Reference incident:** Wave A PR #876/#879 — config.schema.ts modified by two issues not listed in issue body, causing merge conflict.

---

## Shell Script Safety Rules

### Array Indexing Ban

**NEVER use array indexing in monitoring/watch scripts.** zsh is 1-indexed, bash is 0-indexed. This causes wrong issue mapping.

```bash
# ❌ BANNED — index mismatch between shells
EXPECTED=("#888" "#811")
echo ${EXPECTED[$IDX]}

# ✅ REQUIRED — explicit key:value mapping
for PANE_INFO in "1:#888" "2:#811" "3:#813"; do
  N="${PANE_INFO%%:*}"
  EXP="${PANE_INFO##*:}"
done
```

**Reference incident:** zsh 1-based indexing caused pane 3 and 4's valid RESULT.json to be deleted.

---

## Session Management

### Compact Cadence

For long taskMaestro sessions (multiple waves):
- **Compact after every 2 waves** to prevent context degradation
- **Compact before starting a new batch** of waves
- **Save critical state** to `docs/codingbuddy/context.md` before compact (via `update_context`)
- **After compact**: re-read taskmaestro-state.json to restore wave context

Recommended flow:
```
Wave 1 → Wave 2 → compact → Wave 3 → Wave 4 → compact → ...
```

**Warning signs** that compact is needed:
- Session cost exceeds $2
- Context usage exceeds 50%
- Response quality noticeably degrading
- Session duration exceeds 2 hours

---

## Subcommand: start

`/taskmaestro start [--repo <path>] [--base <branch>] [--panes <1,2,3>] [--review-pane]`

현재 세션의 기존 패널들에 worktree + Claude Code를 세팅한다.

### Step 1: 인수 파싱 및 기본값 설정

- `--repo`: 대상 레포 경로 (기본값: 현재 작업 디렉토리)
- `--base`: 베이스 브랜치 (기본값: 현재 브랜치)
- `--panes`: 사용할 패널 번호 목록 (기본값: 지휘자 패널을 제외한 모든 패널)
- `--review-pane`: 리뷰 전용 패널 할당 (기본값: 활성화). 비활성화하려면 `--no-review-pane` 사용

### Step 2: 사전 검증

```bash
# repo가 git 레포인지 확인
git -C "$REPO" rev-parse --git-dir
```

에러 시 "대상 경로가 git 레포지토리가 아닙니다" 출력 후 중단.

```bash
# 사용 가능한 패널 목록 확인 (지휘자 패널 제외)
tmux -L "$SOCKET_NAME" list-panes -t "$SESSION:$WIN_IDX" -F '#{pane_index} #{pane_current_command}'
```

지휘자 패널($MY_PANE)을 제외한 패널들이 워커 대상이 된다. `--panes`로 지정하지 않으면 모든 비활성 패널을 사용한다.

**리뷰 패널 할당 (`--review-pane`, 기본 활성화):**
사용 가능한 패널 중 마지막 패널을 리뷰 에이전트 전용으로 할당한다.
`--no-review-pane` 플래그로 비활성화할 수 있다.

```bash
# 리뷰 패널 할당 (기본: 마지막 패널)
if [ "$REVIEW_PANE_ENABLED" = true ]; then
  REVIEW_PANE=$(echo "$AVAILABLE_PANES" | tail -1)
  WORKER_PANES=$(echo "$AVAILABLE_PANES" | head -n -1)

  # 워커 패널이 최소 1개는 있어야 함
  if [ -z "$WORKER_PANES" ]; then
    echo "ERROR: 리뷰 패널을 할당하면 워커 패널이 없습니다. --no-review-pane을 사용하거나 패널을 추가하세요."
    exit 1
  fi
else
  REVIEW_PANE=""
  WORKER_PANES="$AVAILABLE_PANES"
fi
```

> **최소 패널 요구:** `--review-pane` 사용 시 지휘자 + 워커 1개 + 리뷰어 1개 = 최소 3개 패널이 필요하다.

**워커 패널이 없는 경우:** 지휘자 패널만 존재하면, 첫 번째 숫자 인수(기본값 3)만큼 새 패널을 생성한다:

```bash
PANE_COUNT=${1:-3}  # 기본 3개
DIR=$(cd "$REPO" && pwd)

for ((i = 0; i < PANE_COUNT; i++)); do
  tmux -L "$SOCKET_NAME" split-window -t "$SESSION:$WIN_IDX" -c "$DIR"
  tmux -L "$SOCKET_NAME" select-layout -t "$SESSION:$WIN_IDX" tiled
done

# 지휘자 패널로 포커스 복귀
tmux -L "$SOCKET_NAME" select-pane -t "$SESSION:$WIN_IDX.$MY_PANE"
```

생성 후 다시 패널 목록을 조회하여 워커 패널을 결정한다.

### Step 3: 기존 상태 파일 확인

```bash
cat ~/.claude/taskmaestro-state.json 2>/dev/null
```

이미 활성 세션이 존재하면 AskUserQuestion으로 사용자에게 질문:
- "기존 세션에 연결" → 기존 세션 정보를 로드하고 종료
- "기존 세션 정리 후 새로 생성" → 기존 worktree/세션을 정리하고 계속 진행

### Step 4: worktree 생성

```bash
TIMESTAMP=$(date +%s)
DIR=$(cd "$REPO" && pwd)
BASE_BRANCH="${BASE:-$(git -C "$DIR" branch --show-current)}"

mkdir -p "$DIR/.taskmaestro"

# .gitignore에 .taskmaestro/ 추가
grep -qxF '.taskmaestro/' "$DIR/.gitignore" 2>/dev/null || echo '.taskmaestro/' >> "$DIR/.gitignore"

# 각 워커 패널 + 리뷰 패널에 대해 worktree 생성
ALL_PANES="$WORKER_PANES"
[ -n "$REVIEW_PANE" ] && ALL_PANES="$ALL_PANES $REVIEW_PANE"

for PANE_IDX in $ALL_PANES; do
  BRANCH="taskmaestro/$TIMESTAMP/pane-$PANE_IDX"
  WT_PATH="$DIR/.taskmaestro/wt-$PANE_IDX"
  if [ -d "$WT_PATH" ]; then
    if git -C "$DIR" worktree list | grep -q "$WT_PATH"; then
      git -C "$DIR" worktree remove "$WT_PATH" --force
    else
      rm -rf "$WT_PATH"
    fi
  fi
  git -C "$DIR" worktree add "$WT_PATH" -b "$BRANCH" "$BASE_BRANCH"
done
```

### Step 4.5: Worker Pre-Flight Verification

Before launching Claude Code, verify each worktree:

```bash
# 워커 + 리뷰 패널 모두 사전 검증
ALL_PANES="$WORKER_PANES"
[ -n "$REVIEW_PANE" ] && ALL_PANES="$ALL_PANES $REVIEW_PANE"

for PANE_IDX in $ALL_PANES; do
  WT_PATH="$DIR/.taskmaestro/wt-$PANE_IDX"

  # 1. Remove stale artifacts
  rm -f "$WT_PATH/RESULT.json" "$WT_PATH/TASK.md"

  # 2. Copy permission presets (#905)
  if [ -f "$REPO/.claude/settings.local.json" ]; then
    mkdir -p "$WT_PATH/.claude"
    cp "$REPO/.claude/settings.local.json" "$WT_PATH/.claude/settings.local.json"
  fi

  # 3. Install dependencies (CRITICAL — without this, yarn prettier/lint/test all fail)
  echo "Installing dependencies in wt-$PANE_IDX..."
  (cd "$WT_PATH" && yarn install --immutable 2>/dev/null) || echo "WARNING: yarn install failed in wt-$PANE_IDX"

  # 4. Verify git status clean
  if ! git -C "$WT_PATH" diff --quiet 2>/dev/null; then
    echo "WARNING: wt-$PANE_IDX has uncommitted changes"
  fi
done
```

This prevents:
- Stale RESULT.json from previous waves being detected as "completed"
- **Workers unable to run local CI checks due to missing node_modules** (root cause of repeated CI failures)
- Permission prompt interruptions blocking worker progress (#905)
- Dirty worktree state causing unexpected behavior

### Step 5: 각 패널에 Claude Code 실행

```bash
# 워커 패널에 Claude Code 실행
for PANE_IDX in $WORKER_PANES; do
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" \
    "unset CLAUDECODE && cd $DIR/.taskmaestro/wt-$PANE_IDX && claude --dangerously-skip-permissions" Enter
done

# 리뷰 패널에 Claude Code 실행
if [ -n "$REVIEW_PANE" ]; then
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$REVIEW_PANE" \
    "unset CLAUDECODE && cd $DIR/.taskmaestro/wt-$REVIEW_PANE && claude --dangerously-skip-permissions" Enter
fi
```

> **중요:** 지휘자 Claude Code 세션의 tmux 패널은 `CLAUDECODE` 환경변수를 상속받아 중첩 실행이 차단된다. `unset CLAUDECODE`로 해제해야 한다.

### Step 6: 초기 프롬프트 자동 처리

Claude Code 시작 시 trust 프롬프트와 약관 동의 프롬프트가 나타날 수 있다:

```bash
# 10초 대기 후 trust 프롬프트 승인 (Enter = "Yes, I trust")
sleep 10
for PANE_IDX in $WORKER_PANES; do
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" Enter
done

# 3초 대기 후 약관 동의 프롬프트 처리 (Down → "Yes, I accept" → Enter)
sleep 3
for PANE_IDX in $WORKER_PANES; do
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" Down
done
sleep 1
for PANE_IDX in $WORKER_PANES; do
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" Enter
done
```

> 이미 동의한 환경에서는 이 프롬프트가 나타나지 않을 수 있다. send-keys는 무해하게 무시된다.

10초 대기 후 각 패널의 Claude Code가 프롬프트(`❯`) 상태인지 capture-pane으로 확인한다.

### Step 7: 상태 파일 기록

`~/.claude/taskmaestro-state.json`에 세션 정보를 기록한다.

```json
{
  "socket_name": "workspace-1",
  "session": "workspace-1",
  "window_index": 0,
  "conductor_pane": 0,
  "review_pane": 3,
  "repo": "절대경로",
  "base_branch": "브랜치",
  "created_at": "ISO timestamp",
  "watch_cron_id": null,
  "panes": [
    {"index": 1, "role": "worker", "worktree": "절대경로/.taskmaestro/wt-1", "branch": "taskmaestro/ts/pane-1", "task": null, "status": "idle", "result": null},
    {"index": 2, "role": "worker", "worktree": "절대경로/.taskmaestro/wt-2", "branch": "taskmaestro/ts/pane-2", "task": null, "status": "idle", "result": null},
    {"index": 3, "role": "reviewer", "worktree": "절대경로/.taskmaestro/wt-3", "branch": "taskmaestro/ts/pane-3", "task": null, "status": "idle", "result": null}
  ]
}
```

- `review_pane`: 리뷰 에이전트 패널 인덱스. `--no-review-pane` 사용 시 `null`
- `role`: 각 패널의 역할. `"worker"` 또는 `"reviewer"`
- 리뷰 패널이 없는 경우(`review_pane: null`), 모든 패널의 `role`은 `"worker"`

### Step 8: watch 자동 시작

CronCreate로 30초 주기 cron job을 생성하여 watch 모드를 자동 시작한다.
생성된 cron job ID를 상태 파일의 `watch_cron_id`에 기록한다.

프롬프트: 각 워커 패널에 대해 **1차: RESULT.json 파일 확인 → 2차: capture-pane fallback** 순서로 상태를 감지한다. 워커의 `"success"` 감지 시 Review Routing (review_pane 존재 시 리뷰 에이전트에 위임). 리뷰 에이전트 패널의 RESULT.json도 확인하여 리뷰 결과 처리. 완료/에러 상태 패널이 있으면 사용자에게 보고한다.

### Step 9: 결과 보고

사용자에게 보고:
```
TaskMaestro 시작 완료!

  세션: workspace-1
  레포: /path/to/repo
  지휘자: 패널 0
  워커: 패널 1, 2
  리뷰어: 패널 3
  베이스: main

/taskmaestro assign <번호> "작업" 으로 작업을 배정하세요.
/taskmaestro status 로 상태를 확인하세요.
```

> **리뷰 패널이 없는 경우** (`--no-review-pane`): "리뷰어" 줄을 생략하고 모든 패널을 워커로 표시한다.

---

## Subcommand: assign

`/taskmaestro assign <패널 번호> "<작업 지시>"`

특정 패널의 Claude Code에 새 작업을 배정한다. 상태 파일의 task/status를 업데이트한다.

### Step 1: 상태 파일 로드 및 검증

```bash
cat ~/.claude/taskmaestro-state.json
```

소켓/세션/윈도우 정보를 가져온다.
패널 번호가 워커 패널 목록에 포함되는지 검증한다. 지휘자 패널이거나 존재하지 않는 패널이면 에러 출력 후 중단.

### Step 2: 작업 전송

워커에게 작업 지시와 함께 **RESULT.json 작성 지시**를 포함한 프롬프트를 전송한다.

프롬프트 템플릿:
```
<작업 지시>

---
[MANDATORY PRE-PUSH VERIFICATION]
Push 전에 반드시 아래 명령을 모두 실행하고, 실패 시 수정 후 재실행하세요.
하나라도 실패하면 절대 push하지 마세요:

1. yarn prettier --write .
2. yarn lint --fix
3. yarn type-check
4. yarn test

4개 모두 통과한 후에만 git push하세요. CI 실패는 허용되지 않습니다.

[TASKMAESTRO COMPLETION PROTOCOL]
작업이 완료되면 (성공/실패/에러 무관) 반드시 아래 파일을 작성하세요:

파일: RESULT.json (현재 worktree 루트, 즉 현재 디렉토리)

스키마:
{
  "status": "success | failure | error",
  "issue": "<이슈 번호 또는 null>",
  "pr_number": <PR 번호 또는 null>,
  "pr_url": "<PR URL 또는 null>",
  "timestamp": "<ISO 8601>",
  "cost": "<세션 비용 또는 null>",
  "error": "<에러 메시지 또는 null>"
}

- status: "success" (정상 완료), "failure" (테스트 실패 등), "error" (예기치 못한 오류)
- 커밋/PR 생성 후, 세션 종료 전에 이 파일을 작성하세요
- 이 파일은 지휘자가 완료 감지에 사용합니다

[CONTINUOUS EXECUTION DIRECTIVE]
DO NOT stop between steps. Complete ALL tasks without waiting for user input.
Only stop AFTER writing RESULT.json.
If you encounter an error, try to fix it yourself before stopping.
If you are truly blocked, write RESULT.json with status "error" and explain in the error field.
```

send-keys로 전송:
```bash
tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE" "$PROMPT_WITH_RESULT_PROTOCOL" Enter
```

> **참고:** 프롬프트가 길어 send-keys로 직접 전송 시 잘릴 수 있다. 이 경우 프롬프트를 임시 파일에 저장하고 `send-keys`로 파일 경로를 참조하거나, 여러 줄로 나누어 전송한다. 실제 구현 시 지휘자가 프롬프트 문자열을 조립하여 한 번에 전송한다.

### Step 3: 상태 파일 업데이트

해당 패널의 task와 status를 업데이트한다:
- `task`: 작업 지시 내용
- `status`: "working"

### Step 4: 결과 보고

```
패널 $PANE에 작업을 배정했습니다: "<작업 지시>"
```

---

## Subcommand: send

`/taskmaestro send <패널 번호> "<텍스트>"`

특정 패널에 텍스트를 직접 전송한다.
이미 진행 중인 작업에 후속 지시나 응답을 보낼 때 사용한다.
assign과 달리 상태 파일의 task/status를 변경하지 않는다.

### Step 1: 상태 파일 로드 및 검증

소켓/세션/윈도우 정보를 가져온다.
패널 번호 유효성 검증.

### Step 2: 텍스트 전송

```bash
tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE" "<텍스트>" Enter
```

### Step 3: 결과 보고

```
패널 $PANE에 전송 완료: "<텍스트>"
```

---

## Subcommand: status

`/taskmaestro status`

모든 워커 패널의 현재 상태를 수집하여 요약 보고한다.

### Step 1: 상태 파일 로드

```bash
cat ~/.claude/taskmaestro-state.json
```

### Step 2: RESULT.json 확인 (1차 감지)

각 워커 패널의 worktree에서 RESULT.json 존재 여부를 먼저 확인한다:

```bash
for PANE_IDX in $WORKER_PANES; do
  RESULT_FILE="$REPO/.taskmaestro/wt-$PANE_IDX/RESULT.json"
  if [ -f "$RESULT_FILE" ]; then
    STATUS=$(cat "$RESULT_FILE" | jq -r '.status')
    PR_NUMBER=$(cat "$RESULT_FILE" | jq -r '.pr_number // empty')
    REVIEW_CYCLE=$(cat "$RESULT_FILE" | jq -r '.review_cycle // 0')
    # → status 값에 따라 적절한 상태 아이콘과 메시지 표시
  fi
done
```

RESULT.json이 존재하는 패널은 status 값에 따라 분기하여 표시한다:
- `"success"` → 리뷰 대기 (PR 생성 완료)
- `"review_pending"` → 리뷰 코멘트 작성 완료, 워커 응답 대기
- `"review_addressed"` → 워커 리뷰 반영 완료, 재리뷰 대기
- `"approved"` → 최종 승인 완료 (진짜 done)
- `"failure"` / `"error"` → 실패/에러 (기존 동작)

### Step 3: capture-pane fallback (2차 감지)

RESULT.json이 없는 패널에 대해서만 capture-pane으로 상태를 확인한다:

```bash
for PANE_IDX in $NO_RESULT_PANES; do
  tmux -L "$SOCKET_NAME" capture-pane -t "$SESSION:$WIN_IDX.$PANE_IDX" -p -S -30 | tail -15
done
```

캡처된 내용을 분석:
- 마지막 줄에 Claude Code 프롬프트 (`❯` 또는 `>` 로 시작하는 입력 대기) → "idle"
- 도구 실행 중 (스피너, 코드 출력 진행 중) → "working"
- 에러 패턴 (`Error`, `error`, `failed`, `FAIL`) → "error"
- 프로세스 없음 (zsh 프롬프트만 보임) → "crashed"

### Step 4: 요약 보고

상태 파일의 task 정보와 결합하여 테이블로 출력:
```
TaskMaestro 상태 (workspace-1):

  패널 1: ✅ approved - "API 엔드포인트 구현" → PR #42 (review complete) (worker)
  패널 2: 🔍 reviewing - PR #43 (reviewer)
  패널 3: 📝 review_addressed - "모듈 리팩토링" → PR #44 (awaiting re-review) (worker)
  패널 4: 🔄 working - "인증 기능 추가" (worker)
  패널 5: ⏳ review_pending - "캐시 레이어" → PR #45 (awaiting worker response) (worker)
  패널 6: ❌ error - "모듈을 찾을 수 없음" (worker)
```

**상태별 아이콘:**
| status | 아이콘 | 설명 |
|--------|--------|------|
| `approved` | ✅ | 최종 승인 완료 (진짜 done) |
| `success` (리뷰 시작 전) | 🔍 | 리뷰 사이클 진행 중 |
| `reviewing` | 🔍 | 리뷰 에이전트가 PR 리뷰 중 (reviewer 패널 전용) |
| `review_pending` | ⏳ | 리뷰 완료, 워커 응답 대기 |
| `review_addressed` | 📝 | 워커 반영 완료, 재리뷰 대기 |
| `working` | 🔄 | 작업 중 |
| `failure` | ❌ | 작업 실패 |
| `error` | ❌ | 예기치 못한 오류 |

- `approved` 패널: RESULT.json에서 pr_url, cost, review_cycle 등을 함께 표시
- 리뷰 진행 중 패널: PR 번호와 현재 리뷰 사이클 횟수 (N/3) 표시
- `error`/`crashed` 패널: capture-pane 내용 마지막 10줄도 함께 표시

### Status Report Format (with evidence)

Every status line MUST include parenthetical evidence:

```
패널 1: ✅ approved - "task" → PR #N (RESULT.json: approved, review cycles: 2, pane idle ✓) (worker)
패널 2: 🔄 working - "task" (active: ✽ Implementing… · ↓ 5.3k tokens) (worker)
패널 3: 🔍 reviewing - PR #N (RESULT.json: reviewing PR #N for #M, pane active ✓) (reviewer)
패널 4: ⏳ review_pending - "task" → PR #N (RESULT.json: review_pending, cycle 1/3, awaiting worker) (worker)
패널 5: 📝 review_addressed - "task" → PR #N (RESULT.json: review_addressed, cycle 2/3, awaiting re-review) (worker)
패널 6: ⚠️ uncertain - "task" (RESULT.json exists BUT pane still active — cross-verify needed) (worker)
패널 7: ❌ error - "task" (error in last 10 lines: "ModuleNotFoundError") (worker)
```

**Rules:**
- Never report bare ✅ without evidence
- RESULT.json `approved` + pane idle = confirmed done
- RESULT.json `success` = start review cycle (NOT done)
- RESULT.json `review_pending` = awaiting worker response
- RESULT.json `review_addressed` = awaiting conductor re-review
- RESULT.json + pane active = UNCERTAIN (investigate)
- No RESULT.json + pane idle = needs nudge
- Active spinner (… + ↓ tokens) = confirmed working
- "thinking" alone ≠ working — check token count changes

---

## Subcommand: watch

`/taskmaestro watch`

주기적 감시 모드를 토글한다 (시작/중지).

### 감지 전략 (2단계)

watch 모드는 **RESULT.json 파일 기반 감지**를 1차 수단으로 사용하고, **capture-pane을 fallback**으로만 사용한다.

#### 1차: RESULT.json 파일 감지 (빠르고 정확)

```bash
# 1차: 워커 패널의 RESULT.json 확인
for PANE_IDX in $WORKER_PANES; do
  RESULT_FILE="$REPO/.taskmaestro/wt-$PANE_IDX/RESULT.json"
  if [ -f "$RESULT_FILE" ]; then
    STATUS=$(cat "$RESULT_FILE" | jq -r '.status')
    case "$STATUS" in
      "success")
        # → Review Routing: review_pane 존재 시 리뷰 에이전트에 위임, 없으면 직접 리뷰
        # Review Cycle Protocol 참조
        ;;
      "failure"|"error")
        # → 사용자에게 에러/실패 보고 (기존 동작 유지)
        ;;
      "review_pending")
        # → 워커 응답 대기 중. 지휘자는 대기한다
        ;;
      "review_addressed")
        # → Review Routing: review_pane 존재 시 리뷰 에이전트에 재리뷰 위임, 없으면 직접 재리뷰
        ;;
      "approved")
        # → 진짜 완료 ✅. 상태를 "done"으로 업데이트하고 사용자에게 보고
        ;;
    esac
  fi
done

# 2차: 리뷰 에이전트 패널의 RESULT.json 확인
if [ -n "$REVIEW_PANE" ]; then
  REVIEW_RESULT_FILE="$REPO/.taskmaestro/wt-$REVIEW_PANE/RESULT.json"
  if [ -f "$REVIEW_RESULT_FILE" ]; then
    REVIEW_STATUS=$(cat "$REVIEW_RESULT_FILE" | jq -r '.status')
    REVIEW_RESULT=$(cat "$REVIEW_RESULT_FILE" | jq -r '.review_result')
    if [ "$REVIEW_STATUS" = "success" ]; then
      # → Conductor Handling of Review Agent Result 참조
      # review_result에 따라 워커 PR approve 또는 changes_requested 처리
      # 처리 후 리뷰 에이전트의 RESULT.json 삭제 (다음 리뷰 준비)
      rm -f "$REVIEW_RESULT_FILE"
    fi
  fi
fi
```

**RESULT.json status 매핑:**
| status | watch 동작 |
|--------|-----------|
| `"success"` | 리뷰 사이클 시작 ("done"이 아님) |
| `"failure"` / `"error"` | 사용자에게 보고 (기존 동작 유지) |
| `"review_pending"` | 워커 응답 대기 중 |
| `"review_addressed"` | 지휘자 재리뷰 시작 |
| `"approved"` | 진짜 완료 ✅ |

- RESULT.json이 존재하면: status 값에 따라 위 매핑대로 분기한다.
- RESULT.json이 없으면: 아직 작업 중이거나 파일 미작성. fallback으로 진행한다.

#### 2차 (fallback): capture-pane 기반 감지

RESULT.json이 없는 패널에 대해서만 capture-pane으로 상태를 확인한다:

```bash
for PANE_IDX in $NO_RESULT_PANES; do
  CAPTURED=$(tmux -L "$SOCKET_NAME" capture-pane -t "$SESSION:$WIN_IDX.$PANE_IDX" -p -S -30 | tail -15)
  # 캡처 내용 분석:
  # - 프롬프트 대기 (❯) → "idle" (작업 완료했으나 RESULT.json 미작성)
  # - 도구 실행 중 → "working"
  # - 에러 패턴 → "error"
  # - 프로세스 없음 → "crashed"
done
```

### 시작 (watch_cron_id가 null인 경우)

1. 상태 파일에서 정보 로드
2. CronCreate로 30초 주기 cron job 생성:
   - 프롬프트: 각 워커 패널에 대해 **1차: RESULT.json 확인 → 2차: capture-pane fallback** 순서로 상태를 감지한다. RESULT.json의 status에 따라 분기한다: `"success"` → Review Routing (review_pane 존재 시 리뷰 에이전트에 위임, 없으면 직접 리뷰), `"review_addressed"` → Review Routing으로 재리뷰, `"approved"` → 진짜 완료 보고, `"failure"`/`"error"` → 사용자에게 에러 보고. **리뷰 에이전트 패널의 RESULT.json도 확인한다**: `review_result: "approve"` → 워커 PR 승인, `"changes_requested"` → 워커에 수정 지시. Claude Code가 비정상 종료된 패널이 있으면 재시작 여부를 사용자에게 질문한다.
3. cron job ID를 상태 파일의 `watch_cron_id`에 기록
4. 보고: "Watch 모드를 시작합니다 (30초 주기). 중지하려면 `/taskmaestro watch`를 다시 실행하세요."

### 중지 (watch_cron_id가 존재하는 경우)

1. 상태 파일에서 `watch_cron_id` 확인
2. CronDelete로 해당 cron job 제거
3. `watch_cron_id`를 null로 업데이트
4. 보고: "Watch 모드를 중지했습니다."

### Auto-Nudge Protocol

When a pane is detected as idle (❯ prompt visible) but its task status is "working":

1. **First idle detection**: Send `tmux send-keys "continue" Enter`
2. **Second consecutive idle**: Send `tmux send-keys "continue with the next incomplete task" Enter`
3. **Third consecutive idle**: Send explicit instruction with task context
4. **Track nudge count** per pane in the watch report

Include in watch cron prompt:
```
If pane is idle (❯ visible) and status is "working":
  nudge_count[pane] += 1
  if nudge_count <= 1: send "continue"
  elif nudge_count == 2: send "continue with the next incomplete task"
  else: send explicit instruction
  Report: "Pane N: IDLE → auto-nudged (#count)"
```

### 제한 사항

CronCreate job은 현재 Claude Code 세션에 종속되며, 7일 후 자동 만료된다.
세션이 종료되거나 만료 시 watch도 중단된다. 재시작하려면 `/taskmaestro watch`를 다시 실행한다.

---

## Subcommand: stop

`/taskmaestro stop [패널 번호|all]`

Claude Code를 종료하고 worktree를 정리한다.

### 인수 파싱

- 인수 없음 또는 `all`: 모든 워커 패널 종료
- 숫자: 해당 패널만 종료

### 단일 패널 종료

1. 패널 번호가 워커 패널인지 검증. 아니면 에러 출력 후 중단.
2. 해당 패널에 Claude Code 종료 전송:
   ```bash
   tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE" "/exit" Enter
   ```
3. 5초 대기 후 worktree 정리:
   ```bash
   # uncommitted changes 확인
   if git -C "$WORKTREE_PATH" diff --quiet && git -C "$WORKTREE_PATH" diff --cached --quiet; then
     git -C "$REPO" worktree remove "$WORKTREE_PATH"
   else
     # AskUserQuestion으로 사용자에게 알림
     # "패널 N의 worktree에 커밋되지 않은 변경사항이 있습니다. 강제 삭제할까요?"
     # Yes → git worktree remove --force
     # No → worktree 보존, 경로 안내
   fi
   ```
4. 패널 닫기:
   ```bash
   tmux -L "$SOCKET_NAME" kill-pane -t "$SESSION:$WIN_IDX.$PANE"
   ```
5. 상태 파일에서 해당 패널 정보 제거
6. 보고: `패널 N을 종료했습니다. (브랜치 taskmaestro/xxx/pane-N 유지됨)`

### 전체 종료 (all)

1. watch cron 중지 (활성 상태인 경우 CronDelete)
2. 각 워커 패널에 `/exit` 전송
3. 5초 대기
4. 각 worktree 정리 (uncommitted changes 확인 포함)
5. 워커 패널들 닫기 (역순으로):
   ```bash
   for PANE_IDX in $(echo "$WORKER_PANES" | sort -rn); do
     tmux -L "$SOCKET_NAME" kill-pane -t "$SESSION:$WIN_IDX.$PANE_IDX"
   done
   ```
6. `.taskmaestro/` 디렉토리가 비었으면 삭제:
   ```bash
   rmdir "$REPO/.taskmaestro" 2>/dev/null
   ```
7. 상태 파일 초기화
8. 보고:
   ```
   TaskMaestro 종료 완료.
     정리된 워커: N개
     유지된 브랜치: taskmaestro/xxx/pane-1, pane-2, ...
   ```

> **주의:** `stop all`은 tmux 세션을 종료하지 않는다. 패널들은 그대로 남아있으며 zsh 상태로 돌아간다.
