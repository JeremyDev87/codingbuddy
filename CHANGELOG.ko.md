# 변경 이력

이 프로젝트의 모든 주요 변경 사항을 이 파일에 문서화합니다.

이 문서는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며,
[Semantic Versioning](https://semver.org/lang/ko/spec/v2.0.0.html)을 준수합니다.

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
