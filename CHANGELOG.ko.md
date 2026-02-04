# 변경 이력

이 프로젝트의 모든 주요 변경 사항을 이 파일에 문서화합니다.

이 문서는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 형식을 따르며,
[Semantic Versioning](https://semver.org/lang/ko/spec/v2.0.0.html)을 준수합니다.

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
