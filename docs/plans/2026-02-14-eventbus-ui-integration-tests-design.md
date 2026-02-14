# EventBus ↔ UI 통합 테스트 설계

> **Issue**: [#348](https://github.com/JeremyDev87/codingbuddy/issues/348) - [Phase 4] EventBus ↔ UI 통합 검증

## 목표

EventBus에서 발행된 이벤트가 UI 컴포넌트까지 정상적으로 전파되는지 통합 테스트

## 접근 방식

- **단일 통합 테스트 파일**: `eventbus-ui.integration.spec.tsx`
- 이슈 체크리스트 7개 항목을 각각 `describe` 블록으로 매핑
- 기존 `app.spec.tsx`와 중복되지 않는 시나리오에 집중
- 실제 `TuiEventBus` 인스턴스 사용 (mock 없음)

## 파일

- **생성**: `apps/mcp-server/src/tui/eventbus-ui.integration.spec.tsx`

## 테스트 구조

### 1. Agent 활성화 → AgentCard 상태 변화
- primary agent 활성화 시 AgentTree에 running 상태로 표시
- specialist agent 활성화 시 AgentTree parallel 영역에 표시

### 2. Agent 비활성화 → AgentCard Idle 전환
- completed reason → StatusBar active 카운트 감소
- error reason → StatusBar active 카운트 감소
- 비활성화 후 primary agent가 없으면 AgentTree 영역 빈 상태

### 3. Mode 변경 → Header 업데이트
- PLAN → ACT 전환 시 Header에 ACT 모드 표시
- ACT → EVAL 전환 시 Header에 EVAL 모드 표시
- 연속 모드 변경이 최신 상태만 반영

### 4. Parallel 시작/완료 → AgentTree 업데이트
- PARALLEL_STARTED 후 specialists 활성화 시 AgentTree에 반영
- PARALLEL_COMPLETED 후 agents 비활성화 시 AgentTree 정리
- parallel 시작 → 개별 활성화 → 개별 비활성화 → 완료 전체 플로우

### 5. Skill 추천 → StatusBar 업데이트
- 여러 스킬 연속 추천 시 StatusBar에 모두 표시
- 스킬 추천 + 에이전트 활성화 동시 처리

### 6. 이벤트 버퍼링 (TUI 시작 전 이벤트)
- EventBus에 먼저 emit된 MODE_CHANGED가 렌더링 후 반영되지 않음(유실 문서화)
- EventBus에 먼저 emit된 AGENT_ACTIVATED가 렌더링 후 반영되지 않음
- 여러 이벤트 버퍼링 후 App 마운트 시 최종 상태 반영 (AGENTS_LOADED 재발행)

### 7. 복합 시나리오 통합 테스트
- 실제 워크플로우: PLAN → agent 활성화 → parallel 실행 → 완료
- 에러 시나리오: agent 활성화 → error 비활성화 → 재활성화

## 기존 app.spec.tsx와의 차별점

| 기존 app.spec.tsx | 새 integration spec |
|-------------------|---------------------|
| 단일 이벤트 → 단일 컴포넌트 | 이벤트 시퀀스 → 여러 컴포넌트 연계 |
| 기본 렌더링 확인 | 상태 전이 플로우 검증 |
| 없음 | PARALLEL 이벤트 시나리오 |
| 없음 | 이벤트 버퍼링/유실 시나리오 |
| 없음 | 복합 워크플로우 시나리오 |

## 기술 스택

- Vitest + ink-testing-library
- 실제 TuiEventBus (EventEmitter2 기반)
- React/Ink 컴포넌트 렌더링
