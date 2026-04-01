# 변경 이력

이 프로젝트의 모든 주요 변경 사항을 이 파일에 문서화합니다.

이 문서는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며,
[Semantic Versioning](https://semver.org/lang/ko/spec/v2.0.0.html)을 준수합니다.

## [5.1.3] - 2026-04-01

### 추가됨
- **TUI 파일 브릿지**: `fs.watch` 기반 브릿지로 stdio 모드에서 TUI 사이드바 업데이트 지원 (#1104, #1105)
- **마켓플레이스 자동 업데이트**: session-start 훅에서 마켓플레이스 클론 자동 fetch (24시간 스로틀) (#1101, #1107)
- **MCP 자동 구성**: 세션 시작 시 `~/.claude/mcp.json` 자동 생성으로 MCP 연결 보장 (#1100, #1106)

### 수정됨
- **훅 lib/ 디렉토리**: session-start가 훅 파일과 함께 `lib/`을 복사하여 HUD 상태 업데이트 수정 (#1102, #1103)
- **mcp.json 누락**: 플러그인 설치 후 MCP 도구를 사용할 수 없는 문제 수정 (#1100, #1106)

## [5.1.2] - 2026-03-29

### 추가됨
- **StatusLine HUD**: Claude Code UI에 실시간 세션 지표 표시 (모드, 비용, 캐시율, 컨텍스트 사용량)
- **tmux 사이드바**: tmux 내에서 TUI 대시보드를 사이드바로 자동 설정
- **`validate_plugin_manifest` 도구**: Claude Code plugin.json을 스키마로 검증하고 수정 제안 제공
- **`pre_release_check` 도구**: 에코시스템 자동 감지 릴리즈 사전 검증 (Node.js, Python, Go, Rust, Java)
- **릴리즈 체크리스트 도메인**: 버전 일관성, 락파일 동기화, 매니페스트 검증, CI 품질 게이트 등 10개 항목
- **릴리즈 설정 스키마**: codingbuddy.config.json에 `release` 섹션 추가
- **EVAL 릴리즈 감지**: EVAL/AUTO 모드에서 버전 관련 키워드 감지 시 릴리즈 체크리스트 자동 포함
- **CI 스키마 검증**: dev 워크플로우에 plugin.json, marketplace.json JSON Schema 검증 추가
- **HUD 상태 모듈**: statusLine과 모드 감지를 위한 크로스-훅 상태 관리

### 수정됨
- `bump-version.sh`에서 `yarn install` 실행하여 peerDependencies 변경 후 락파일 드리프트 방지

### 변경됨
- `CODINGBUDDY_AUTO_TUI` 기본값 `0`으로 변경 — Claude Code 사용자를 위해 tmux 사이드바가 독립 TUI를 대체

## [4.4.0] - 2026-03-04

### 추가됨

- **모델**: Provider별 접두사를 지원하는 multi-provider 모델 지원 추가
- **MCP**: opencode/crush 및 cursor에 대한 클라이언트 타입 감지 및 플랫폼별 병렬 에이전트 힌트 추가
- **MCP**: `recommend_skills` 도구에 `get_skill` 체이닝 힌트 추가
- **MCP**: opencode 전용 순차 전문가 디스패치 힌트 추가
- **MCP**: `parse_mode`에 `projectRootWarning` 진단 추가
- **설정**: 프로젝트 루트 해석 소스 추적
- **스킬**: 12개 신규 스킬 정의 추가 (security-audit, documentation-generation, code-explanation, tech-debt, agent-design, rule-authoring, mcp-builder, context-management, deployment-checklist, error-analysis, legacy-modernization, prompt-engineering)
- **스킬**: 12개 스킬에 i18n 키워드 트리거 추가 (KO/JA/ZH/ES)

### 수정됨

- **스킬**: agent-design 스킬 JSON 예제를 `agent.schema.json`에 맞춤

### 테스트

- 클라이언트 타입 감지 및 힌트 분기 테스트 추가
- `recommend_skills` nextAction 및 체이닝 힌트 테스트 추가
- 12개 스킬 키워드 트리거 테스트 추가

### 문서

- Codex, Antigravity, Kiro, OpenCode, Cursor 어댑터 문서 감사 및 보강
- 모든 어댑터에 MCP 설정 및 프로젝트 루트 감지 문서 추가
- 모든 어댑터에 전문가 에이전트 실행 패턴 추가
- 스킬 카탈로그를 카테고리별 테이블로 재구성

## [4.3.0] - 2026-02-20

### 추가됨

- **TUI FlowMap**: U-커브 화살표를 트리 커넥터로 교체하여 에이전트 계층 시각화 개선 (#574)
- **TUI FlowMap**: `activeStage` 연동 및 단계별 에이전트 통계 추가 (#571)
- **TUI FlowMap**: 에이전트 노드에 `isParallel` 플래그 및 실행 모드 표시 (#550)
- **TUI FlowMap**: `renderAgentTree`를 다중 레벨 에이전트 서브트리 렌더링 지원으로 확장 (#557)
- **TUI ActivityVisualizer**: Activity 및 Live 패널 재설계로 가시성 향상 (#551)
- **TUI 푸터**: Agent, Skill, Tool 호출 횟수 추적 및 표시
- **TUI ChecklistPanel**: `ChecklistPanel`을 `FocusedAgentPanel`에서 분리하여 독립 표시 (#548)
- **TUI 에이전트 가시성**: 도구 중심 표시를 실제 에이전트 가시성으로 교체 (#549)
- **TUI 재시작**: MCP 툴 및 CLI 플래그를 통한 TUI 재시작 기능 구현 (#545)
- **에이전트**: `software-engineer`를 기본 ACT 에이전트로 추가 (#568)
- **에이전트**: `data-scientist` ACT 주 에이전트 추가 (#566)
- **에이전트**: `systems-developer` ACT 주 에이전트 추가 (#565)
- **에이전트**: `security-engineer` ACT 주 에이전트 추가
- **에이전트**: `test-engineer` ACT 주 에이전트 추가 (#563)
- **키워드 패턴**: 백엔드 키워드 감지에 리팩토링 및 타입 정의 패턴 추가 (#567)

### 수정됨

- **TUI FlowMap**: 진행 바에서 중간값 표시 (#572)
- **TUI FlowMap**: 완료 후 오래된 에이전트 FlowMap에서 제거 (#570)
- **TUI HeaderBar**: 헤더 바 오버플로우, 워크스페이스 경로 표시, `sess:` 접두사 제거 수정 (#547)
- **키워드 타입**: `ACT_PRIMARY_AGENTS`에 `ai-ml-engineer` 추가 (#562)
- **모드 핸들러**: ACT 모드에서 컨텍스트의 `recommendedActAgent` 자동 상속 (#561)

## [4.2.0] - 2026-02-18

### 추가됨

- **TUI 멀티세션**: 멀티세션 지원 및 MCP 연결 시 TUI 자동 실행 (#485)
- **TUI 자동 실행**: `--tui` CLI 플래그를 통한 자동 실행 활성화 (#522)
- **TUI ActivityVisualizer**: MonitorPanel을 ActivityVisualizer 패널로 교체 (#482)
- **TUI FlowMap**: 시각적 계층, 파이프라인 헤더, 진행 바 강화 (#468)
- **TUI MonitorPanel**: 이벤트 로그, 에이전트 타임라인, 작업 진행 표시
- **TUI 목표**: `parse_mode` 응답에서 목표 연동 (#473)
- **TUI 이벤트**: 대시보드 상태에 SKILL_RECOMMENDED 이벤트 반영 (#474)
- **TUI 이벤트**: PARALLEL_STARTED 이벤트로 전문가 사전 등록 (#475)
- **TUI 이벤트**: MODE_CHANGED로 실행 중인 에이전트 단계 동기화 (#476)
- **TUI 이벤트**: `parse_mode`에서 `recommended_act_agent` 및 `parallelAgentsRecommendation` 추출 (#477)
- **TUI 진행**: TOOL_INVOKED 카운트를 통한 진행률 추정 (#472)
- **TUI 레이아웃**: FocusedAgent 패널 너비 2배 확장 (#466)
- **TUI 레이아웃**: 정밀 그리드 레이아웃 시스템 (#458)
- **TUI 레이아웃**: 고정 너비 우측 정렬 FocusedAgent와 반응형 FlowMap (#462)
- **TUI StageHealthBar**: 하드코딩된 tokenCount를 실시간 도구 호출 카운트로 교체 (#490)
- **TUI 체크리스트**: `parse_mode`에서 초기 체크리스트 생성 및 작업 완료 추적 개선 (#504)
- **TUI FocusedAgent**: 아바타, 스파크라인, 개선된 진행 바 (#505)
- **TUI 테마**: BORDER_COLORS 상수를 통한 패널 테두리 색상 통합 (#494)
- **TUI 컨텍스트**: context:updated 이벤트로 FocusedAgentPanel에 결정/메모 표시 (#515)
- **TUI 세션**: SESSION_RESET 이벤트를 통한 `/clear` 명령 시 대시보드 상태 초기화 (#499)
- **Config**: codingbuddy MCP 우선순위 규칙 및 CLAUDE.md 섹션 추가 (#516, #512)
- **MCP 서버**: RED 단계 중단 방지를 위한 TDD 실행 연속성 규칙 (#463)
- **GitHub**: 커스텀 지침으로 Copilot 코드 리뷰 설정 (#460)
- **문서**: 자동 실행 시작 문제를 위한 TUI 트러블슈팅 가이드 (#520)

### 변경됨

- **TUI 활동**: Activity 히트맵을 수평 바 차트로 교체 (#517)
- **TUI 레이아웃**: FocusedAgent 패널 너비를 ~10% 줄이고 Activity/FlowMap 패널 확장 (#501)
- **TUI 작업**: task:synced를 단일 패스로 통합하고 이벤트 순서 수정 (#504)

### 수정됨

- **TUI HeaderBar**: AUTO 모드가 프로세스 플로우에서 순차적 단계로 잘못 표시되던 문제 (#488)
- **TUI 작업**: PLAN/EVAL 모드에서 작업 패널에 데이터가 없던 문제 — `extractFromUpdateContext`가 이제 decisions/findings/notes 읽기 (#492)
- **TUI Live**: Live 패널에 데이터가 거의 표시되지 않던 문제 — 시간 기반 버블을 `renderLiveContext`로 교체 (#502)
- **TUI 진행**: TOOL_INVOKED와 primary 에이전트 간 agentId 불일치로 진행률이 0%에 멈추던 문제 (#503)
- **TUI AutoLauncher**: TuiAutoLauncher에서 절대 바이너리 경로 해결 (#519)
- **빌드**: 오래된 내보내기 방지를 위해 TUI 번들을 메인 빌드 스크립트에 포함
- **Config**: prettier 및 tsconfig에서 `.next` 및 빌드 산출물 제외 (#496)

### 제거됨

- **MCP 서버**: 사용하지 않는 코드 및 죽은 내보내기 (#486)
- **TUI**: 순수 컴포넌트에서 deprecated 텍스트 포매터 함수 제거

## [4.1.0] - 2026-02-17

### 추가됨

- **TUI 대시보드**: Ink 기반 터미널 UI (Header, AgentCard, AgentTree, AgentGrid, StatusBar, ProgressBar 컴포넌트)
- **TUI EventBus**: EventEmitter2 기반 이벤트 시스템, `useEventBus` 및 `useAgentState` React 훅
- **TUI IPC**: Unix Domain Socket 기반 독립 프로세스 통신
- **TUI 컴팩트 디자인**: 24줄 터미널에 최적화된 단일 라인 레이아웃
- **TUI Interceptor**: 실시간 UI 업데이트를 위한 MCP 도구 디스패치 레이어
- **Landing Page**: Next.js 16 기반 다국어(5개국어) 랜딩 페이지
  - Widget Slot 아키텍처 (AgentsShowcase, CodeExample, QuickStart 위젯)
  - shadcn/ui 컴포넌트 라이브러리, 테마 및 쿠키 동의
  - `next/font`를 통한 셀프호스팅 폰트
  - next-intl i18n 설정, 병렬 라우트 및 로케일 슬롯 레이아웃
  - 정적 섹션: Hero, Problem, Solution, FAQ
  - 헤더 (언어 선택기, 테마 토글), Footer 및 접근성 개선
  - Vercel 배포 설정 및 애널리틱스 통합
  - SEO를 위한 JSON-LD 구조화 데이터 (#424)
  - WCAG 2.1 AA 접근성 명세
- **MCP Server**: SSE 엔드포인트 Bearer token 인증 (#416)
- **Agent 시스템**: `dispatch_agents` 도구 및 `parse_mode` 자동 디스패치 (#328)
- **Intent 패턴**: `frontend-developer`, `devops-engineer` 인텐트 패턴 추가
- **EVAL 모드**: EVAL 모드에서 `recommendedActAgent` 지원 (#361)

### 변경됨

- **Prettier**: `printWidth: 100`으로 전체 코드베이스 리포맷 (#423)
- **MCP Server**: `rules-core`, `keyword-core` 공유 모듈 분리 (#415)
- **Plugin**: build 스크립트에서 중복 `syncVersion` 제거 (#418)

### 수정됨

- plugin `isPathSafe()` 경로 정규화 및 대소문자 무시 매칭 (#419)
- MCP server `appendContext` `findLastIndex` 병합 로직 (#410)
- MCP server `bootstrap()` 미처리 Promise rejection 핸들러
- MCP server unsafe type assertion 런타임 검증 (#411)
- Landing Page `html lang` 속성 서버 렌더 시 로케일에서 설정 (#412)
- Landing Page radix-ui 메타패키지 제거, `@radix-ui/react-dialog` 직접 사용 (#413)
- `validate-rules.sh` `.ai-rules` 경로 참조 수정 (#422)
- keyword intent 기반 해상도에서 추천 모드 시 project config 스킵
- plugin 타이포 `codebuddy` → `codingbuddy` 수정
- CI release-drafter SHA 고정 및 setup action 버전 정렬

### 문서

- TUI 사용자 가이드, 아키텍처, 트러블슈팅 문서
- Landing Page README에 배포 가이드 및 프로젝트 구조 추가
- 문서 전체의 에이전트 수 불일치 수정 (#421)
- MCP_SSE_TOKEN 환경 변수 문서화 (#416)
- JSON-LD 구현 계획 (#424)

### 테스트

- context-document handler 테스트 추가 (#417)
- TUI EventBus-UI, App root, transport 통합 테스트
- TUI 성능 및 안정성 검증 테스트
- Landing Page root layout 및 CSP headers 테스트
- Landing Page async server component 테스트

---

## [4.0.1] - 2026-02-04

### 추가됨

- package.json과 git 태그 버전 불일치를 방지하기 위한 릴리스 프로세스 자동 검증 (#305)
- 명확한 오류 메시지와 수정 지침을 포함한 새로운 검증 스크립트 (`scripts/verify-release-versions.sh`)

### 변경됨

- 빠른 실패(fail-fast) 검증 단계가 포함된 릴리스 워크플로우 업데이트
- claude-code-plugin README 문서 간소화

## [4.0.0] - 2026-02-03

### ⚠️ 호환성 변경 사항 (Breaking Changes)

#### 모델 해상도 우선순위 변경

**이전 (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**이후 (v4.0.0)**:
1. Global Config → `ai.defaultModel` (최우선)
2. System Default

#### 설정 파일 형식이 JSON 전용으로 변경

**이전 (v3.x)**: `codingbuddy.config.js`와 `codingbuddy.config.json` 모두 지원

**이후 (v4.0.0)**: `codingbuddy.config.json`만 지원

**이유**: JavaScript 설정 파일은 ESM 프로젝트(`'type': 'module'`)에서 로드할 수 없어 MCP 서버가 언어 설정을 찾지 못하는 문제가 발생했습니다. JSON 형식은 모듈 시스템에 독립적입니다.

**마이그레이션**: 기존 `codingbuddy.config.js`를 `.json` 형식으로 변환:
- `module.exports` 래퍼 제거
- 키와 문자열에 큰따옴표 사용
- 후행 쉼표 제거

**이전**:
```javascript
module.exports = {
  language: 'ko',
}
```

**이후**:
```json
{
  "language": "ko"
}
```

#### 제거된 CLI 옵션

- `codingbuddy init` 명령에서 `--format` 옵션 제거 (JSON이 유일한 형식)

#### 마이그레이션 가이드

1. **글로벌 설정을 사용 중이라면 별도 작업 불필요**: `codingbuddy.config.json`에서 이미 `ai.defaultModel`을 설정했다면, 기존 설정이 그대로 작동합니다.

2. **Agent JSON의 model 필드는 이제 무시됩니다**: `packages/rules/.ai-rules/agents/*.json`에서 에이전트 모델 기본 설정을 커스터마이징했다면, 해당 설정은 더 이상 적용되지 않습니다. 대신 `codingbuddy.config.json`을 사용하세요:

**codingbuddy.config.json**:
```json
{
  "ai": {
    "defaultModel": "claude-opus-4-20250514"
  }
}
```

#### 제거된 API

- `ModelResolverService.resolveForMode()` → `resolve()` 사용
- `ModelResolverService.resolveForAgent()` → `resolve()` 사용
- `ModelSource` 타입: `'agent'` 및 `'mode'` 변형 제거
- `ResolveModelParams`: `agentModel` 및 `modeModel` 매개변수 제거

### 추가됨

- **Verbosity 시스템**: 설정 가능한 상세도 레벨(`minimal`, `compact`, `standard`, `detailed`)로 토큰 최적화된 응답 포맷팅
- **PR All-in-One 스킬**: 리뷰, 승인, 머지 작업을 통합한 풀 리퀘스트 워크플로우
- **SRP 복잡도 분류기**: 단일 책임 원칙 분석을 위한 다국어 지원

### 변경됨

- 더 이상 사용되지 않는 세션 모듈 제거 및 참조 정리
- 의존성 관리를 Dependabot에서 Renovate로 마이그레이션
- 재현성을 위해 모든 의존성을 정확한 버전으로 고정

---

## [3.1.1] - 2026-01-27

### 추가됨

- parse_mode 응답에 스킬과 에이전트 자동 포함

### 수정됨

- CI 워크플로우가 Dependabot PR에 yarn.lock 업데이트를 포함하도록 수정

---

## [3.1.0] - 2026-01-20

### 추가됨

- 다국어 지원이 포함된 SRP 복잡도 분류기
- 지원되는 모든 언어에 대한 플러그인 가이드 문서
