# CodingBuddy Plugin "Wow" Experience Design

## Problem

4.5.0 -> 5.0.0에서 89개 기능을 추가했지만, 사용자가 체감하는 변화가 부족하다.

- postinstall: 텍스트 한 줄
- session-start: 조용히 hook 설치
- 작업 중: 에이전트 협력이 보이지 않는 인프라로만 작동

**핵심 문제**: buddy라는 이름과 달리, 친구처럼 느껴지지 않는다.

## Success Criteria

설치 후 첫 세션에서 사용자가:

1. **"이거 살아있네!"** - 버디가 인사하고, 프로젝트를 분석하고, 뭘 도와줄 수 있는지 먼저 알려줌
2. **"와 이쁘다!"** - 비주얼이 남다르고, 다른 플러그인과 확연히 다른 미적 경험
3. **"벌써 뭔가 해줬네?"** - 설치 직후 프로젝트를 자동 분석하고 유용한 인사이트 제공

## Approach: Hybrid (Hook + System Prompt + MCP + Companion TUI)

### 채널 구조

| 채널 | 대상 | 역할 |
|------|------|------|
| **Plugin Hooks** | Claude Code 사용자 | 즉각적 임팩트 (설치, 세션 시작/종료) |
| **Companion TUI** | Claude Code 사용자 | 실시간 에이전트 시각화 (tmux split) |
| **System Prompt** | Claude Code 사용자 | Claude 응답 포맷 가이드 |
| **MCP visual 데이터** | 모든 AI 도구 사용자 | 시각화 데이터의 Single Source |

### MCP vs Plugin 사용자 경험

- **Plugin (Claude Code)**: hook 출력 + Companion TUI + Claude 응답 포맷 + MCP
- **MCP Only (Cursor, Codex, Q, Kiro)**: MCP 응답의 visual 데이터를 AI가 렌더링

---

## Design

### 1. Buddy Identity & Personality

#### 마스코트 캐릭터

```
    ╭━━━╮
    ┃ ◕‿◕ ┃  ← 기본 표정 (반가움)
    ╰━┳━╯
   ╭──┻──╮
   │ CB  │   ← CodingBuddy 약자
   ╰─────╯
```

상태별 표정:

| 표정 | 의미 |
|------|------|
| ◕‿◕ | 기본/인사 |
| ◕_◕ | 분석 중 |
| ◕⌄◕ | 성공/완료 |
| ◕︵◕ | 에러 발견 |
| ◕ω◕ | 칭찬/잘했어 |
| ◕⁀◕ | 기다리는 중 |

#### 성격 원칙

| 원칙 | 예시 |
|------|------|
| 친구처럼 | "야, 이 프로젝트 NestJS 쓰네! 내가 잘 아는 거다" |
| 유머 | "테스트 커버리지 23%... 용감한 프로젝트군" |
| 프로액티브 | "package.json 보니까 보안 취약점 2개 있어. 볼래?" |
| 응원 | "TDD 완벽하게 따라갔네! 진짜 잘한다" |

#### 톤 레벨 설정

`codingbuddy.config.json`의 `tone` 필드로 제어:

| 톤 | 설명 | 예시 (ko) |
|-----|------|-----------|
| `casual` (기본) | 친구 반말 | "야, 이거 봐봐" |
| `formal` | 존댓말 전문가 | "이 부분을 확인해보시겠어요?" |

언어별 적용 (`language`에 따라):
- **ko**: casual=반말 / formal=존댓말
- **en**: casual=buddy tone / formal=professional tone
- **ja**: casual=タメ口 / formal=敬語

### 2. Agent Character System

35개 에이전트 각각이 **고유 캐릭터 (모양 + 색상)**를 가짐.

#### 도메인 그룹별 시각 매핑

| 그룹 | ANSI 색상 | 에이전트 | 눈 심볼 |
|------|-----------|----------|---------|
| 워크플로우 | Blue | Plan, Act, Eval, Auto | ◇ ◆ ◈ ◊ |
| 아키텍처 | Magenta | Architecture, Solution, Planner | ⬡ ⬢ ⎔ |
| 품질 | Green | Code Quality, Test Eng, Test Strategy | ● ◉ ⊙ |
| 보안/인프라 | Red | Security, DevOps, Platform | ◮ ▲ ▼ |
| 프론트/UX | Yellow | Frontend, UI/UX, A11y, SEO | ★ ☆ ✦ |
| 백엔드/데이터 | Cyan | Backend, Data Eng, Data Sci | ◐ ◑ ◒ |
| 통합/운영 | White | Integration, Observability, i18n | ○ ◌ ◎ |
| 전문분야 | Bright | Mobile, AI/ML, Event Arch, Migration | ✧ ✶ ✴ |

#### 에이전트 캐릭터 구조

```
    ╭━━━╮
    ┃ ⬡‿⬡ ┃   ← 도메인별 눈 심볼 + 상태별 입
    ╰━┳━╯
   Architecture   ← 에이전트 이름
```

### 3. Companion TUI (핵심 시각 표면)

Claude Code 옆에 tmux split으로 자동 실행되는 에이전트 대시보드.

#### TUI 활성화 설정

`codingbuddy.config.json`의 `tui` 필드로 제어:

```json
{
  "tui": true
}
```

| 설정 | 동작 |
|------|------|
| `tui: true` (기본) | session-start 시 자동으로 Companion TUI 실행 |
| `tui: false` | TUI 비활성화, Claude 응답 내 시각화만 사용 |

#### 자동 시작 흐름

```
session-start hook
    │
    ├─ tui 설정 확인
    │   └─ tui: false → TUI 건너뜀, hook 출력만
    │
    ├─ tmux 세션 감지
    │   ├─ tmux 안: 오른쪽에 pane split
    │   └─ tmux 밖: fallback (아래 참조)
    │
    └─ CodingBuddy TUI 실행
```

#### tmux 없는 환경 Fallback

| 환경 | 동작 |
|------|------|
| tmux 안 | 오른쪽 pane split (기본) |
| tmux 밖 + tmux 설치됨 | 새 tmux 세션 생성 + split |
| tmux 미설치 | TUI 없이 동작. session-start hook이 직접 ASCII 출력 + system prompt로 Claude 응답 내 시각화. 첫 세션에서 tmux 설치 안내 |

**Graceful degradation 원칙**: TUI가 없어도 핵심 경험(버디 인사, 프로젝트 스캔, 세션 요약)은 hook stdout으로 제공. TUI는 "추가 보너스".

#### TUI 레이아웃

```
┌─ Claude Code ──────────────┬─ CodingBuddy TUI ─────────────┐
│                            │                                │
│  (일반 Claude Code 사용)    │  [버디 상태]                    │
│                            │  [소집된 에이전트 목록]          │
│                            │  [에이전트 토론]                │
│                            │  [진행률]                      │
│                            │                                │
└────────────────────────────┴────────────────────────────────┘
```

#### 모드별 TUI 표시

**세션 시작 (프로젝트 스캔)**:

```
╭━━━╮
┃ ◕‿◕ ┃ 안녕! 프로젝트 봐볼게

━━ my-awesome-app ━━━━━━━━━━━━━
⚡ Next.js 15 + TypeScript
🧪 커버리지: 67%
📁 42개 파일
🔗 3개 API 엔드포인트

━━ 오늘의 버디 추천 ━━━━━━━━━━━
🟡 ★‿★ Frontend  "Server Component 전환 기회 3곳"
🟢 ●‿● Test Eng. "커버리지 80% 가능, 유틸 5개 미테스트"
🔴 ◮‿◮ Security  "API 인증 누락 1곳"
```

**PLAN 모드 (에이전트 토론)**:

```
◇‿◇ PLAN 모드 시작!

━━ 소집된 에이전트 ━━━━━━━━━━━━
🟣 ⬡‿⬡ Architecture  분석 중
🔴 ◮‿◮ Security     분석 중
🟢 ●‿● Test Strategy 분석 중

━━ 토론 ━━━━━━━━━━━━━━━━━━━━━━

🟣 ⬡‿⬡ "JWT + refresh token 추천"
     │
🔴 ◮_◮ "⚠️ httpOnly cookie 필수"
     │
🟣 ⬡‿⬡ "동의. 수정"
     │
🟢 ●‿● "통합테스트 우선"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 합의: JWT + httpOnly + 통합테스트
```

**ACT 모드 (진행률)**:

```
◆‿◆ ACT 모드 실행 중

━━ 진행률 ━━━━━━━━━━━━━━━━━━━━

Step 1 🟠 ◐‿◐ Backend
JWT 토큰 서비스
🧪 RED   ██████████ ✅ FAIL
🔨 GREEN ██████░░░░ 60%
♻️  REFAC ░░░░░░░░░░ 대기

Step 2 🔴 ◮⁀◮ Security      ⏳
Step 3 🟠 ◐⁀◐ Backend       ⏳
Step 4 🟢 ●⁀● Test Eng.     ⏳

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
전체: ████░░░░░░░░ 1/4 (25%)
```

**EVAL 모드 (리뷰 결과)**:

```
◈‿◈ EVAL 모드! 리뷰 시작

🔴 ◮‿◮ Security     ████████████████ 완료
│  ✅ XSS 방어 OK
│  ⚠️ rate limiting 미적용 (Medium)

🟢 ●‿● Code Quality ████████████████ 완료
│  ✅ SOLID 준수
│  💡 token.service.ts 분리 추천

⚡ ✦‿✦ Performance   ████████████████ 완료
│  ✅ 토큰 검증 < 5ms

━━ 종합 ━━━━━━━━━━━━━━━━━━━━━━
🔒 Security: 8/10  📏 Quality: 9/10
⚡ Perf: 10/10     🧪 Test: 9/10

◈ω◈ "평균 9.0! 훌륭해!"
```

#### 데이터 흐름

```
Claude Code → MCP tool 호출 → MCP Server
                                   │
                                   ▼
                             Event Bridge
                           (file-based IPC)
                                   │
                                   ▼
                           CodingBuddy TUI
                          (tmux 오른쪽 pane)
```

기존 인프라 활용:
- `event_bridge.py`: Plugin→TUI 이벤트 전달 (존재)
- `apps/mcp-server/src/tui/ipc/`: IPC 서버/클라이언트 (존재)
- `history_db.py`: 세션 데이터 (존재)

### 4. Installation Wow Moments

#### Phase 1: postinstall (npm install 직후)

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│                                              │
│           ╭━━━╮                              │
│           ┃ ◕‿◕ ┃  Hey! I'm CodingBuddy!     │
│           ╰━┳━╯                              │
│          ╭──┻──╮   Your new coding buddy.    │
│          │ CB  │                              │
│          ╰─────╯   v5.x.x                   │
│                                              │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                              │
│   35 specialist agents ready                 │
│   PLAN → ACT → EVAL workflow                 │
│   TDD-first development                     │
│                                              │
│   Start a session and I'll introduce myself! │
│                                              │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

#### Phase 2: 첫 session-start

버디 인사 + 프로젝트 자동 스캔 + Companion TUI 자동 실행.

#### Phase 3: 재방문 session-start

이전 세션 맥락 기반 인사 + 미완료 작업 안내.

### 5. Session End (Stop Hook)

```
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
│                                              │
│  ◕⌄◕  오늘 수고했어! 정리할게                  │
│                                              │
│  ━━ 세션 요약 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ⏱  32분 │ 🔧 도구 47회 │ 📝 파일 8개 수정    │
│                                              │
│  ━━ 활약한 에이전트 ━━━━━━━━━━━━━━━━━━━━━━━━  │
│  🟠 ◐ω◐ Backend     JWT 서비스 + Auth Guard  │
│  🔴 ◮⌄◮ Security    XSS/CSRF 방어 검증       │
│  🟢 ●⌄● Test Eng.   테스트 12개 추가          │
│                                              │
│  ━━ 성과 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📊 커버리지 67% → 82%  ⬆ +15%               │
│  🔒 보안 이슈 1개 → 0개  ✅                    │
│  📋 PLAN 3/4 완료 (Step 4 남음)               │
│                                              │
│  ◕‿◕  다음에 또 보자!                         │
│                                              │
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
```

### 6. Eco Mode

`codingbuddy.config.json` 전체 설정:

```json
{
  "eco": true,
  "tui": true,
  "tone": "casual",
  "language": "ko"
}
```

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `eco` | `true` | 토큰 절약 모드. false면 Claude 응답에 풀 비주얼 |
| `tui` | `true` | Companion TUI 자동 실행 여부 |
| `tone` | `"casual"` | 버디 톤 (casual/formal) |
| `language` | 시스템 감지 | 언어 설정 (ko/en/ja/zh/es) |

| 설정 | Claude Code (왼쪽) | TUI (오른쪽) |
|------|-------------------|-------------|
| `eco: true` (기본) | 간결한 텍스트만, 토큰 절약 | 풀 비주얼 (항상) |
| `eco: false` | 마크다운 리치 포맷 + 에이전트 토론 | 풀 비주얼 (항상) |

핵심: TUI는 토큰과 무관하므로 항상 풍부하게 표시. eco 모드는 Claude Code 쪽 토큰만 제어.

### 7. MCP Visual Data (Single Source)

`parse_mode` 응답에 시각화 필드 추가:

```json
{
  "mode": "PLAN",
  "visual": {
    "banner": "╭━━━╮\n┃ ◇‿◇ ┃ PLAN 모드!\n╰━┳━╯",
    "agents": [
      { "name": "Architecture", "face": "⬡‿⬡", "color": "magenta", "status": "분석 중" },
      { "name": "Security", "face": "◮‿◮", "color": "red", "status": "대기" }
    ],
    "collaboration": {
      "format": "discussion",
      "renderHint": "에이전트 캐릭터로 토론 형식 출력"
    }
  }
}
```

Plugin은 이 데이터를 TUI로 전달, MCP Only 사용자는 AI가 직접 렌더링.

---

## Architecture Summary

```
╭─ codingbuddy.config.json ─────────────────────────────────╮
│  { "eco": true, "tui": true, "tone": "casual", "language": "ko" } │
╰──────────────┬────────────────────────────────────────────╯
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌─ Plugin ─────┐   ┌─ MCP Server ──────────┐
│ (Claude Code) │   │ (모든 AI 도구 공용)    │
│               │   │                       │
│ postinstall   │   │ visual 데이터 생성     │
│ SessionStart ─┼──→│  • banner ASCII       │
│  • 버디 인사   │   │  • agent characters   │
│  • TUI 자동실행│   │  • collaboration hint  │
│ System Prompt │   │                       │
│  • 포맷 가이드 │   │ eco 모드 분기          │
│ statusMessage │   │                       │
│  • 한 줄 상태  │   │ parse_mode            │
│ Stop          │   │ dispatch_agents       │
│  • 세션 요약   │   │ update_context        │
│               │   │                       │
│ Companion TUI │   │                       │
│  (tmux split) │◀──┤ Event Bridge (IPC)    │
│  • 에이전트 대시│   │                       │
│  • 실시간 토론 │   │                       │
│  • 진행률      │   │                       │
└───────────────┘   └───────────────────────┘
```

---

## Implementation Priority

| 순위 | 항목 | 임팩트 | 난이도 |
|------|------|--------|--------|
| P0 | 에이전트 캐릭터 시스템 (35개 정의, agents/ JSON 확장) | 모든 시각화의 기반 | 낮음 |
| P0 | config 설정 추가 (eco, tui, tone, language) | 전체 경험 제어 | 낮음 |
| P1 | postinstall 환영 배너 | 첫인상, 사용자 최초 접점 | 낮음 |
| P1 | session-start 리뉴얼 (버디 인사 + 프로젝트 스캔) | 첫 세션 "와!" | 중간 |
| P1 | parse_mode visual 데이터 추가 | 모드 진입 경험 | 중간 |
| P2 | Companion TUI 자동 실행 (tmux split) | 핵심 시각 표면 | 높음 |
| P2 | system prompt 포맷 가이드 | Claude 응답 포맷 | 중간 |
| P2 | stop hook 세션 요약 | 마무리 경험 | 중간 |
| P3 | TUI 모드별 화면 (PLAN/ACT/EVAL) | 작업 중 경험 | 높음 |
| P3 | statusMessage 에이전트 상태 | 도구 호출 중 | 낮음 |
| P3 | 재방문 session-start (이전 세션 맥락) | 충성도 | 중간 |

---

## Project Scan (session-start 프로젝트 분석)

session-start hook이 15초 timeout 내에 수행하는 분석:

| 항목 | 소스 | 예상 시간 |
|------|------|----------|
| 프로젝트 이름/버전 | `package.json` name, version | <100ms |
| 프레임워크 감지 | `package.json` dependencies | <100ms |
| 파일 수 | `find src/ -type f \| wc -l` (캐시) | <500ms |
| 테스트 커버리지 | 최근 coverage report (존재 시) | <200ms |
| API 엔드포인트 수 | `src/app/api/` 또는 `src/routes/` glob | <300ms |

**timeout 보장 전략:**
- 각 항목에 개별 timeout (1초). 실패 시 "스캔 중..." 표시 후 건너뜀
- 결과를 `.codingbuddy/scan-cache.json`에 캐시, 다음 세션에서 재활용
- TUI 실행은 별도 프로세스로 비동기 시작 (hook timeout과 독립)

## Agent Character Data Model

에이전트 캐릭터 정의는 기존 `packages/rules/.ai-rules/agents/` JSON에 `visual` 필드를 추가:

```json
{
  "name": "Architecture Specialist",
  "visual": {
    "eye": "⬡",
    "eyeFallback": "o",
    "color": "magenta",
    "group": "architecture"
  }
}
```

| 필드 | 설명 |
|------|------|
| `eye` | 유니코드 눈 심볼 |
| `eyeFallback` | 유니코드 미지원 터미널용 ASCII 폴백 |
| `color` | ANSI 색상 이름 (red, green, blue, magenta, cyan, yellow, white, bright) |
| `group` | 도메인 그룹 (워크플로우, 아키텍처, 품질, 보안, 프론트, 백엔드, 통합, 전문) |

## Unicode Fallback

유니코드 미지원 터미널 감지 시 폴백:

| 유니코드 | ASCII 폴백 | 비고 |
|---------|-----------|------|
| ◕‿◕ | o_o | 버디 기본 |
| ⬡‿⬡ | O_O | 아키텍처 |
| ◮‿◮ | A_A | 보안 |
| ●‿● | *_* | 품질 |
| ★‿★ | +_+ | 프론트 |
| ╭━━━╮ | +---+ | 박스 |
| ██████ | ###### | 진행률 바 |

감지 방법: `$TERM`, `$LANG` 환경변수 + 터미널 유니코드 폭 테스트.

## Error Handling & Edge Cases

### TUI 크래시 복구

```
TUI 프로세스 종료 감지 (Event Bridge heartbeat)
    │
    ├─ 자동 재시작 시도 (최대 3회)
    │   └─ 성공 → 마지막 상태 복원
    │
    └─ 3회 실패 → graceful degradation
        └─ Claude 응답 내 시각화로 전환
        └─ "TUI 문제 발생. Claude 응답으로 시각화합니다" 안내
```

### 다중 세션

| 시나리오 | 동작 |
|---------|------|
| Claude Code 2개 + tmux | 각각 별도 pane에 TUI 실행, session_id로 구분 |
| Claude Code 2개 + tmux 없음 | 각각 독립적으로 hook 출력만 |
| 같은 프로젝트 2개 세션 | scan-cache 공유, TUI는 독립 |

### 터미널 너비

| 너비 | 동작 |
|------|------|
| >= 160 cols | tmux split (Claude Code 60% + TUI 40%) |
| 120-159 cols | tmux split (Claude Code 70% + TUI 30%), TUI 컴팩트 모드 |
| < 120 cols | TUI 비활성화, hook 출력 + Claude 응답 내 시각화 |

### TUI 종료 처리

| 이벤트 | 동작 |
|--------|------|
| Claude Code 세션 종료 (Stop hook) | TUI pane 자동 닫기 |
| 사용자가 TUI pane 수동 닫기 | graceful degradation, 재시작 안내 |
| tmux 세션 전체 종료 | 모두 종료 (정상) |

## Constraints

- Claude Code 내부 UI는 제어 불가 → Companion TUI로 해결
- Pre/PostToolUse hook 출력은 사용자에게 직접 안 보임 → system-reminder로 Claude 가이드 + TUI로 직접 표시
- hook timeout 제약 (5-15초) → 프로젝트 스캔은 항목별 개별 timeout + 캐시
- 터미널 유니코드/ANSI 호환성 → eyeFallback 필드로 ASCII 폴백 제공
- tmux 미설치 환경 → hook 출력 + Claude 응답 내 시각화로 graceful degradation
