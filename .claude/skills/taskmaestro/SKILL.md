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

- `start [--repo <path>] [--base <branch>] [--panes <1,2,3>]`
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
  "status": "success | failure | error",
  "issue": "#767",
  "pr_number": 123,
  "pr_url": "https://github.com/org/repo/pull/123",
  "timestamp": "2026-03-22T01:13:00.000Z",
  "cost": "$0.45",
  "error": null
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | `"success" \| "failure" \| "error"` | ✅ | 작업 결과. `success`: 정상 완료, `failure`: 작업 실패 (테스트 실패 등), `error`: 예기치 못한 오류 |
| `issue` | `string \| null` | ❌ | 관련 이슈 번호 (예: `"#767"`) |
| `pr_number` | `number \| null` | ❌ | 생성된 PR 번호 |
| `pr_url` | `string \| null` | ❌ | 생성된 PR URL |
| `timestamp` | `string` | ✅ | ISO 8601 완료 시각 |
| `cost` | `string \| null` | ❌ | 세션 비용 (예: `"$0.45"`) |
| `error` | `string \| null` | ❌ | 에러 메시지 (`status`가 `"error"`일 때) |

### 파일 경로 규칙

- 위치: `<repo>/.taskmaestro/wt-<N>/RESULT.json` (각 워커의 worktree 루트)
- 워커는 작업 완료 **직전** (커밋/PR 생성 후, 세션 종료 전)에 이 파일을 작성한다
- 지휘자는 이 파일의 존재 여부로 워커 완료를 감지한다

---

## Subcommand: start

`/taskmaestro start [--repo <path>] [--base <branch>] [--panes <1,2,3>]`

현재 세션의 기존 패널들에 worktree + Claude Code를 세팅한다.

### Step 1: 인수 파싱 및 기본값 설정

- `--repo`: 대상 레포 경로 (기본값: 현재 작업 디렉토리)
- `--base`: 베이스 브랜치 (기본값: 현재 브랜치)
- `--panes`: 사용할 패널 번호 목록 (기본값: 지휘자 패널을 제외한 모든 패널)

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

# 각 워커 패널에 대해 worktree 생성
for PANE_IDX in $WORKER_PANES; do
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

### Step 5: 각 패널에 Claude Code 실행

```bash
for PANE_IDX in $WORKER_PANES; do
  tmux -L "$SOCKET_NAME" send-keys -t "$SESSION:$WIN_IDX.$PANE_IDX" \
    "unset CLAUDECODE && cd $DIR/.taskmaestro/wt-$PANE_IDX && claude --dangerously-skip-permissions" Enter
done
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
  "repo": "절대경로",
  "base_branch": "브랜치",
  "created_at": "ISO timestamp",
  "watch_cron_id": null,
  "panes": [
    {"index": 1, "worktree": "절대경로/.taskmaestro/wt-1", "branch": "taskmaestro/ts/pane-1", "task": null, "status": "idle", "result": null},
    {"index": 2, "worktree": "절대경로/.taskmaestro/wt-2", "branch": "taskmaestro/ts/pane-2", "task": null, "status": "idle", "result": null},
    {"index": 3, "worktree": "절대경로/.taskmaestro/wt-3", "branch": "taskmaestro/ts/pane-3", "task": null, "status": "idle", "result": null}
  ]
}
```

### Step 8: watch 자동 시작

CronCreate로 30초 주기 cron job을 생성하여 watch 모드를 자동 시작한다.
생성된 cron job ID를 상태 파일의 `watch_cron_id`에 기록한다.

프롬프트: 각 워커 패널에 대해 **1차: RESULT.json 파일 확인 → 2차: capture-pane fallback** 순서로 상태를 감지한다. 완료/에러 상태 패널이 있으면 사용자에게 보고한다.

### Step 9: 결과 보고

사용자에게 보고:
```
TaskMaestro 시작 완료!

  세션: workspace-1
  레포: /path/to/repo
  지휘자: 패널 0
  워커: 패널 1, 2, 3
  베이스: main

/taskmaestro assign <번호> "작업" 으로 작업을 배정하세요.
/taskmaestro status 로 상태를 확인하세요.
```

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
    cat "$RESULT_FILE"
    # → 해당 패널 상태: "done" + RESULT.json 내용으로 결과 표시
  fi
done
```

RESULT.json이 존재하는 패널은 완료로 판단하고, 파일 내용에서 status/issue/pr_url 등을 추출하여 표시한다.

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

  패널 1: ✅ done - "API 엔드포인트 구현" → PR #42 (success)
  패널 2: 🔄 working - "테스트 작성"
  패널 3: ❌ error - "모듈을 찾을 수 없음"
```

- `done` 패널: RESULT.json에서 status, pr_url, cost 등을 함께 표시
- `error`/`crashed` 패널: capture-pane 내용 마지막 10줄도 함께 표시

---

## Subcommand: watch

`/taskmaestro watch`

주기적 감시 모드를 토글한다 (시작/중지).

### 감지 전략 (2단계)

watch 모드는 **RESULT.json 파일 기반 감지**를 1차 수단으로 사용하고, **capture-pane을 fallback**으로만 사용한다.

#### 1차: RESULT.json 파일 감지 (빠르고 정확)

```bash
for PANE_IDX in $WORKER_PANES; do
  RESULT_FILE="$REPO/.taskmaestro/wt-$PANE_IDX/RESULT.json"
  if [ -f "$RESULT_FILE" ]; then
    # 워커 완료 감지! RESULT.json 파싱
    cat "$RESULT_FILE"
    # → 상태 파일 업데이트: status를 "done"으로, result 필드에 RESULT.json 내용 저장
  fi
done
```

- RESULT.json이 존재하면: 워커가 완료된 것으로 판단. 파일 내용을 파싱하여 상태 파일을 업데이트하고 사용자에게 보고한다.
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
   - 프롬프트: 각 워커 패널에 대해 **1차: RESULT.json 확인 → 2차: capture-pane fallback** 순서로 상태를 감지한다. 완료/에러 상태 패널이 있으면 사용자에게 보고한다. Claude Code가 비정상 종료된 패널이 있으면 재시작 여부를 사용자에게 질문한다.
3. cron job ID를 상태 파일의 `watch_cron_id`에 기록
4. 보고: "Watch 모드를 시작합니다 (30초 주기). 중지하려면 `/taskmaestro watch`를 다시 실행하세요."

### 중지 (watch_cron_id가 존재하는 경우)

1. 상태 파일에서 `watch_cron_id` 확인
2. CronDelete로 해당 cron job 제거
3. `watch_cron_id`를 null로 업데이트
4. 보고: "Watch 모드를 중지했습니다."

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
