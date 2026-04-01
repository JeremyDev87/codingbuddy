# TUI 에이전트 모니터 문제 해결 가이드

이 가이드는 codingbuddy MCP 서버에서 TUI 에이전트 모니터를 실행할 때 발생하는 일반적인 문제를 해결하는 데 도움을 줍니다.

### "No running codingbuddy MCP server found" 오류

**증상:** `codingbuddy tui` 또는 `npx codingbuddy tui` 실행 시 이 오류가 표시됩니다.

**원인:** `~/.codingbuddy/instances.json`에 등록된 MCP 서버 인스턴스가 없습니다.

**진단:**

```bash
cat ~/.codingbuddy/instances.json
ps aux | grep codingbuddy
```

**해결 방법:**

- AI 도구(Claude Code, Cursor 등)가 codingbuddy MCP가 설정된 상태로 실행 중인지 확인합니다.
- `.mcp.json`에 codingbuddy 항목이 있는지 확인합니다.
- AI 도구를 재시작하여 MCP 서버 시작을 트리거합니다.

### "Failed to connect to any MCP server instance" 오류

**증상:** TUI는 인스턴스를 찾지만 연결할 수 없습니다.

**원인:** MCP 서버가 종료되었거나 소켓 파일이 오래된 상태입니다.

**해결 방법:**

- AI 도구를 재시작합니다.
- 오래된 항목 수동 정리: `~/.codingbuddy/instances.json` 삭제 후 재시작.
- 소켓 파일 존재 확인: `ls -la /tmp/codingbuddy-*.sock` (macOS: `$TMPDIR` 확인).

### TUI가 렌더링되지만 에이전트 활동이 없음

**증상:** TUI 대시보드가 표시되지만 모든 에이전트가 유휴/0 상태입니다.

**원인:** TUI는 IPC를 통해 연결되어 있지만 MCP 서버가 아직 도구 호출을 받지 못했습니다.

**해결 방법:** 아직 AI 도구 호출이 없는 경우 정상입니다. AI 도구와 상호작용하여 MCP 도구 호출을 트리거하면 TUI가 실시간으로 업데이트됩니다.

### "Failed to load TUI components" 오류

**증상:** TUI 번들을 찾을 수 없다는 오류 메시지가 표시됩니다.

**원인:** TUI ESM 번들(`tui-bundle.mjs`)이 빌드되지 않았습니다.

**해결 방법:**

- npx 사용자: 최신 배포 버전을 사용하고 있는지 확인합니다.
- 로컬 개발: `apps/mcp-server/`에서 `yarn build && yarn build:tui` 실행.

## 아이콘이 박스 또는 물음표로 표시됨

### 원인

터미널에 Nerd Font가 설정되지 않았지만 TUI가 Nerd Font 아이콘을 렌더링하려고 합니다.

### 해결 방법

**1단계: Nerd Font 설치**

```bash
# macOS (Homebrew)
brew install --cask font-jetbrains-mono-nerd-font
```

**2단계: 터미널에서 Nerd Font 설정**

- **iTerm2**: 환경설정 → 프로필 → 텍스트 → 폰트
- **Terminal.app**: 환경설정 → 프로필 → 폰트

**3단계: TUI에서 Nerd Font 활성화**

```bash
TERM_NERD_FONT=true yarn workspace codingbuddy start:dev -- --tui
```

## 색상이 올바르게 표시되지 않음

**색상 없음:** `NO_COLOR` 환경 변수가 설정된 경우 → `unset NO_COLOR`

**16가지 기본 색상만 표시:** `COLORTERM=truecolor yarn workspace codingbuddy start:dev -- --tui`

## TUI가 렌더링되지 않음

**`--tui` 플래그 누락:**

```bash
# 잘못된 방법 - TUI 비활성
yarn workspace codingbuddy start:dev

# 올바른 방법 - TUI 활성
yarn workspace codingbuddy start:dev -- --tui
```

**stderr가 TTY가 아닌 경우:** stderr가 파이프되거나 리디렉션된 경우 TUI가 비활성화됩니다. stderr를 터미널에 연결된 상태로 유지하세요.

## 디버그 로깅

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1
```

## 관련 문서

- [TUI 사용자 가이드](../tui-guide.md) - TUI 실행 및 설정 방법
- [TUI 아키텍처](../tui-architecture.md) - 내부 컴포넌트 구조 및 이벤트 흐름
