<p align="center">
  <a href="../plugin-faq.md">English</a> |
  <a href="plugin-faq.md">한국어</a> |
  <a href="../zh-CN/plugin-faq.md">中文</a> |
  <a href="../ja/plugin-faq.md">日本語</a> |
  <a href="../es/plugin-faq.md">Español</a> |
  <a href="../pt-BR/plugin-faq.md">Português</a>
</p>

# CodingBuddy FAQ

CodingBuddy Claude Code 플러그인에 대해 자주 묻는 질문입니다.

## 일반 질문

### CodingBuddy란 무엇인가요?

CodingBuddy는 AI 어시스턴트 전반에 걸쳐 일관된 코딩 관행을 제공하는 Multi-AI 규칙 시스템입니다. 다음을 포함합니다:

- **워크플로우 모드**: 구조화된 개발을 위한 PLAN/ACT/EVAL/AUTO
- **전문가 에이전트**: 35 AI 에이전트 (보안, 성능, 접근성 등)
- **스킬**: 재사용 가능한 워크플로우 (TDD, 디버깅, API 설계 등)
- **체크리스트**: 도메인별 품질 검사

### 플러그인이 필수인가요?

**아니요**, 하지만 권장됩니다. CodingBuddy를 두 가지 방법으로 사용할 수 있습니다:

1. **플러그인 + MCP 서버** (권장): Claude Code와 완전 통합
2. **MCP 서버만**: 수동 설정, 동일한 기능

플러그인이 제공하는 것:
- 자동 명령어 문서화
- 더 쉬운 설정
- Claude Code와 더 나은 통합

### 플러그인과 MCP 서버의 차이점은 무엇인가요?

| 구성 요소 | 목적 |
|-----------|------|
| **플러그인** | Claude Code 진입점 (매니페스트 + 설정) |
| **MCP 서버** | 실제 기능 (도구, 에이전트, 스킬) |

플러그인은 Claude Code에 MCP 서버 연결 방법을 알려주는 얇은 래퍼입니다.

### 다른 AI 도구에서도 작동하나요?

네! CodingBuddy는 여러 AI 어시스턴트를 지원합니다:

- **Claude Code**: 전체 플러그인 지원
- **Cursor**: `.cursor/rules/` 설정을 통해
- **GitHub Copilot**: `.codex/` 설정을 통해
- **Amazon Q**: `.q/` 설정을 통해
- **Kiro**: `.kiro/` 설정을 통해

모든 도구는 `packages/rules/.ai-rules/`의 동일한 규칙을 공유합니다.

---

## 설치 질문

### 플러그인을 어떻게 설치하나요?

```bash
# 1. 마켓플레이스 추가
claude marketplace add JeremyDev87/codingbuddy

# 2. 플러그인 설치
claude plugin install codingbuddy@jeremydev87

# 3. MCP 서버 설치
npm install -g codingbuddy
```

자세한 내용은 [설치 가이드](./plugin-guide.md)를 참조하세요.

### 플러그인과 MCP 서버 둘 다 설치해야 하나요?

**네**, 모든 기능을 사용하려면:

- **플러그인**: Claude Code 통합에 필요
- **MCP 서버**: 도구와 에이전트에 필요

MCP 서버 없이 플러그인만으로는 제한된 기능만 사용할 수 있습니다.

### 플러그인을 어떻게 업데이트하나요?

```bash
# 플러그인 업데이트
claude plugin update codingbuddy

# MCP 서버 업데이트
npm update -g codingbuddy
```

### 전역 npm 설치 없이 사용할 수 있나요?

네, npx를 사용하세요:

```json
// .mcp.json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy"]
    }
  }
}
```

---

## 워크플로우 질문

### PLAN과 AUTO의 차이점은 무엇인가요?

| 모드 | 제어 | 반복 | 언제 사용 |
|------|------|------|-----------|
| **PLAN** | 수동 | 1회 | 실행 전 검토하고 싶을 때 |
| **AUTO** | 자율 | 품질 달성까지 | 품질 게이트가 있는 완전한 기능에 |

**PLAN** → 검토 → **ACT** → 검토 → **EVAL** (선택사항)

**AUTO** → Critical=0, High=0 될 때까지 PLAN→ACT→EVAL 반복

### EVAL은 언제 사용해야 하나요?

EVAL을 사용하는 경우:
- 머지 전 보안 감사
- 접근성 검토
- 성능 분석
- 코드 품질 평가

EVAL은 **선택사항**입니다 - 품질 평가가 필요할 때만 사용하세요.

### 워크플로우 중간에 모드를 전환할 수 있나요?

네, 언제든지 어떤 모드든 트리거할 수 있습니다:

```
PLAN 기능 구현   → 계획 생성
ACT              → 계획 실행
PLAN 접근법 수정 → 새 계획 생성 (컨텍스트 초기화)
ACT              → 새 계획 실행
EVAL             → 구현 검토
```

### 컨텍스트 유지는 어떻게 작동하나요?

컨텍스트는 `docs/codingbuddy/context.md`에 저장됩니다:

- **PLAN**: 컨텍스트 초기화, 새 파일 생성
- **ACT**: PLAN 컨텍스트 읽기, 진행 상황 추가
- **EVAL**: 모든 컨텍스트 읽기, 결과 추가

이는 대화 컴팩션에서도 유지되므로, 초기 메시지가 요약되어도 ACT가 PLAN 결정사항에 접근할 수 있습니다.

### 다국어 키워드는 무엇인가요?

| 영어 | 한국어 | 일본어 | 중국어 | 스페인어 |
|------|--------|--------|--------|----------|
| PLAN | 계획 | 計画 | 计划 | PLANIFICAR |
| ACT | 실행 | 実行 | 执行 | ACTUAR |
| EVAL | 평가 | 評価 | 评估 | EVALUAR |
| AUTO | 자동 | 自動 | 自动 | AUTOMATICO |

---

## 전문가 에이전트 질문

### 어떤 전문가 에이전트를 사용할 수 있나요?

**기획 전문가**:
- 🏛️ architecture-specialist
- 🧪 test-strategy-specialist
- 📨 event-architecture-specialist
- 🔗 integration-specialist
- 📊 observability-specialist
- 🔄 migration-specialist

**구현 전문가**:
- 📏 code-quality-specialist
- ⚡ performance-specialist
- 🔒 security-specialist
- ♿ accessibility-specialist
- 🔍 seo-specialist
- 🎨 ui-ux-designer

**개발자 에이전트**:
- 🖥️ frontend-developer
- ⚙️ backend-developer
- 🔧 devops-engineer
- 📱 mobile-developer

### 에이전트는 어떻게 선택되나요?

에이전트는 다음을 기반으로 선택됩니다:

1. **작업 컨텍스트**: 프롬프트의 키워드
2. **모드**: PLAN vs ACT vs EVAL에 따라 다른 에이전트
3. **설정**: `codingbuddy.config.json`의 커스텀 에이전트

### 여러 에이전트를 사용할 수 있나요?

네, EVAL 모드에서 전문가가 병렬로 실행됩니다:

```
EVAL 보안과 접근성에 초점을 맞춰서
```

이렇게 하면 security-specialist와 accessibility-specialist가 모두 활성화됩니다.

### 에이전트 상세 정보를 어떻게 볼 수 있나요?

MCP 도구를 사용하세요:

```
/mcp call get_agent_details --agentName security-specialist
```

---

## 설정 질문

### 플러그인을 어떻게 설정하나요?

프로젝트 루트에 `codingbuddy.config.json` 생성:

```javascript
module.exports = {
  language: 'ko',
  defaultMode: 'PLAN',
  specialists: [
    'security-specialist',
    'accessibility-specialist'
  ]
};
```

### 어떤 설정 옵션을 사용할 수 있나요?

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `language` | string | 자동 감지 | 응답 언어 (en, ko, ja, zh, es) |
| `defaultMode` | string | PLAN | 시작 워크플로우 모드 |
| `specialists` | array | 전체 | 활성화할 전문가 에이전트 |

### 응답 언어를 어떻게 변경하나요?

세 가지 방법:

1. **설정 파일**:
   ```javascript
   module.exports = { language: 'ko' };
   ```

2. **환경 변수**:
   ```bash
   export CODINGBUDDY_LANGUAGE=ko
   ```

3. **한국어 키워드 사용**:
   ```
   계획 사용자 로그인 구현
   ```

---

## 문제 해결 질문

### 워크플로우 모드가 작동하지 않는 이유는?

일반적인 원인:

1. MCP 서버 미설치 → `npm install -g codingbuddy`
2. MCP 미설정 → `~/.claude/settings.json`에 추가
3. 키워드가 시작에 없음 → PLAN/ACT/EVAL을 먼저 입력

자세한 해결책은 [문제 해결 가이드](./plugin-troubleshooting.md)를 참조하세요.

### 컨텍스트가 유지되지 않는 이유는?

1. `docs/codingbuddy/context.md` 존재 확인
2. PLAN 모드가 파일을 생성함 - 항상 PLAN으로 시작
3. docs 폴더의 쓰기 권한 확인

### 컨텍스트를 어떻게 초기화하나요?

새 PLAN을 시작하세요:

```
PLAN 새로운 구현 시작
```

PLAN 모드는 자동으로 컨텍스트 문서를 초기화합니다.

### 버그는 어디에 리포트하나요?

GitHub Issues: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

포함할 내용:
- 버전 번호 (플러그인, MCP 서버, Claude Code)
- 재현 단계
- 오류 메시지

---

## 모범 사례

### 권장 워크플로우는 무엇인가요?

1. **PLAN으로 시작** - 항상 구현 전에 계획
2. **구체적인 프롬프트 사용** - "X 도움" 대신 "X 구현"
3. **ACT 전에 검토** - 계획이 합리적인지 확인
4. **머지 전 EVAL** - 품질 평가 받기
5. **복잡한 기능에 AUTO 사용** - 사이클이 실행되도록 허용

### 최상의 결과를 얻으려면?

1. **구체적으로**: "인증 추가"가 아닌 "리프레시 토큰이 있는 JWT 인증 추가"
2. **우려 사항 언급**: "보안에 초점을 맞춰"가 전문가를 활성화
3. **큰 작업 분할**: PLAN당 하나의 기능
4. **EVAL 결과 검토**: 머지 전 문제 해결

### TDD는 언제 사용해야 하나요?

TDD(테스트 먼저) 사용:
- 비즈니스 로직
- 유틸리티 및 헬퍼
- API 핸들러
- 데이터 변환

테스트-나중 사용:
- UI 컴포넌트
- 시각적 요소
- 레이아웃

---

## 관련 문서

- [설치 가이드](./plugin-guide.md)
- [빠른 참조](./plugin-quick-reference.md)
- [아키텍처](./plugin-architecture.md)
- [예시](./plugin-examples.md)
- [문제 해결](./plugin-troubleshooting.md)

---

<sub>🤖 이 문서는 AI의 도움을 받아 번역되었습니다. 오류나 개선 사항이 있으면 [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)에 알려주세요.</sub>
