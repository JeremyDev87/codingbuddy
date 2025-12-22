# Keyword Invocation 설계 문서

## 개요

프롬프트 시작에 특정 키워드(PLAN, ACT, EVAL)를 입력하면 자동으로 MCP를 호출하여 모드별 규칙을 반환하는 기능.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Tool (Claude Code, Cursor 등)         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 규칙 파일 (.claude/, .cursor/)                          ││
│  │ "PLAN/ACT/EVAL로 시작하면 parse_mode 도구 호출"         ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP 호출
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐│
│  │ parse_mode 도구 │───▶│ keyword-modes.json 설정 읽기    ││
│  └─────────────────┘    └─────────────────────────────────┘│
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 반환: { mode, prompt, rules[] }                         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**핵심 흐름:**
1. 사용자가 `PLAN 인증 기능 설계해줘` 입력
2. AI 도구 규칙이 키워드 감지 → `parse_mode` MCP 도구 호출
3. MCP 서버가 키워드 파싱, 설정 파일에서 규칙 매핑 조회
4. 모드 지침 + 관련 규칙 번들 반환

## MCP 도구 설계

### 도구 정의

```typescript
{
  name: 'parse_mode',
  description: 'Parse workflow mode keyword from prompt and return mode-specific rules',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'User prompt that may start with PLAN/ACT/EVAL'
      }
    },
    required: ['prompt']
  }
}
```

### 반환 구조

```typescript
interface ParseModeResult {
  mode: 'PLAN' | 'ACT' | 'EVAL';
  originalPrompt: string;      // 키워드 제거된 순수 프롬프트
  instructions: string;        // 모드별 행동 지침
  rules: Array<{
    name: string;              // 예: "core.md"
    content: string;           // 규칙 파일 내용
  }>;
  warnings?: string[];         // 경고 메시지 (선택)
}
```

### 처리 로직

- 키워드 대소문자 혼용 지원 (`PLAN`, `plan`, `Plan`, `pLaN` 모두 인식)
- 키워드 없음 → `mode: 'PLAN'`, `warnings: ['No keyword found, defaulting to PLAN']`
- 다중 키워드 → 첫 번째만 사용, `warnings: ['Multiple keywords found, using first']`
- 내용 없음 → `originalPrompt: ''`, `warnings: ['No prompt content after keyword']`

## 설정 파일 구조

**파일 위치:** `packages/rules/.ai-rules/keyword-modes.json`

```json
{
  "modes": {
    "PLAN": {
      "description": "Task planning and design phase",
      "instructions": "설계 우선 접근. TDD 관점에서 테스트 케이스 먼저 정의. 구현 전 아키텍처 검토.",
      "rules": ["rules/core.md", "rules/augmented-coding.md"]
    },
    "ACT": {
      "description": "Actual task execution phase",
      "instructions": "Red-Green-Refactor 사이클 준수. 최소 구현 후 점진적 개선. 품질 기준 충족 확인.",
      "rules": ["rules/core.md", "rules/project.md", "rules/augmented-coding.md"]
    },
    "EVAL": {
      "description": "Result review and assessment phase",
      "instructions": "코드 품질 검토. SOLID 원칙 준수 확인. 테스트 커버리지 점검. 개선점 제안.",
      "rules": ["rules/core.md", "rules/augmented-coding.md"]
    }
  },
  "defaultMode": "PLAN"
}
```

## 구현 범위

### 새로 생성할 파일

```
packages/rules/.ai-rules/
└── keyword-modes.json          # 모드별 규칙 매핑 설정

mcp-server/src/
├── keyword/
│   ├── keyword.module.ts       # 키워드 모듈
│   ├── keyword.service.ts      # 파싱 로직 (순수 함수)
│   └── keyword.types.ts        # 타입 정의
```

### 수정할 파일

```
mcp-server/src/
├── app.module.ts               # KeywordModule 임포트 추가
├── mcp/mcp.service.ts          # parse_mode 도구 등록

.claude/rules/custom-instructions.md   # 키워드 지시 추가
.cursor/rules/main.mdc                 # 키워드 지시 추가
(기타 AI 도구 규칙 파일들)
```

### 테스트 파일

```
mcp-server/src/keyword/
└── keyword.service.spec.ts     # 파싱 로직 단위 테스트
```

### 구현 제외 (YAGNI)

- 키워드 별칭 기능 (P → PLAN 등)
- 모드 조합 기능 (PLAN+ACT 등)

## 클라이언트 규칙 설정

### Claude Code (`.claude/rules/custom-instructions.md`)

```markdown
### Keyword Invocation

사용자 프롬프트가 `PLAN`, `ACT`, `EVAL` 키워드로 시작하면:
1. `parse_mode` MCP 도구를 호출하여 모드와 규칙을 가져옴
2. 반환된 `instructions`를 따라 작업 수행
3. 반환된 `rules`를 컨텍스트로 활용
4. `warnings`가 있으면 사용자에게 안내

예시: `PLAN 인증 기능 설계` → parse_mode 호출 → PLAN 모드로 작업
```

### Cursor (`.cursor/rules/main.mdc`)

```markdown
## Keyword Mode Activation

When user prompt starts with PLAN, ACT, or EVAL:
- Call `parse_mode` tool with the full prompt
- Follow returned `instructions` for the detected mode
- Use returned `rules` as context for the task
```

## 테스트 케이스

### keyword.service.spec.ts

```typescript
describe('KeywordService', () => {
  describe('parseMode', () => {
    // 정상 케이스 - 각 키워드별
    it('PLAN 키워드 파싱');
    it('ACT 키워드 파싱');
    it('EVAL 키워드 파싱');

    // 대소문자 혼용 - 각 키워드별
    it('plan (소문자) 파싱');
    it('act (소문자) 파싱');
    it('eval (소문자) 파싱');
    it('Plan (첫 글자 대문자) 파싱');
    it('pLaN (혼합) 파싱');

    // 기본값 케이스
    it('키워드 없으면 PLAN 기본값 + 경고');
    it('빈 문자열은 PLAN 기본값 + 경고');
    it('공백만 있으면 PLAN 기본값 + 경고');

    // 경고 케이스
    it('다중 키워드는 첫 번째만 사용 + 경고');
    it('키워드 후 내용 없으면 경고');
    it('키워드 후 공백만 있으면 경고');

    // 엣지 케이스
    it('키워드가 중간에 있으면 키워드로 인식 안함');
    it('키워드와 유사한 단어 구분 (PLANNING, ACTION 등)');
    it('특수문자 포함 프롬프트 처리');
    it('줄바꿈 포함 프롬프트 처리');
    it('탭 포함 프롬프트 처리');
  });

  describe('loadModeConfig', () => {
    it('keyword-modes.json 정상 로드');
    it('설정 파일 없으면 기본 설정 사용');
    it('잘못된 JSON 형식이면 기본 설정 사용 + 경고');
  });

  describe('getRulesForMode', () => {
    it('PLAN 모드 규칙 번들 반환');
    it('ACT 모드 규칙 번들 반환');
    it('EVAL 모드 규칙 번들 반환');
    it('규칙 파일 없으면 해당 파일 스킵 + 경고');
  });
});
```

## 구현 태스크

- [ ] `packages/rules/.ai-rules/keyword-modes.json` 설정 파일 생성
- [ ] `keyword.types.ts` 타입 정의
- [ ] `keyword.service.ts` 파싱 로직 구현
- [ ] `keyword.service.spec.ts` 테스트 작성 (100% 커버리지)
- [ ] `keyword.module.ts` 모듈 생성
- [ ] `app.module.ts`에 KeywordModule 임포트
- [ ] `mcp.service.ts`에 parse_mode 도구 등록
- [ ] `.claude/rules/custom-instructions.md` 키워드 지시 추가
- [ ] `.cursor/rules/main.mdc` 키워드 지시 추가
- [ ] 기타 AI 도구 규칙 파일 업데이트
