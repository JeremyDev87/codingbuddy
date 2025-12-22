<p align="center">
  <a href="../getting-started.md">English</a> |
  <a href="getting-started.md">한국어</a> |
  <a href="../zh-CN/getting-started.md">中文</a> |
  <a href="../ja/getting-started.md">日本語</a> |
  <a href="../es/getting-started.md">Español</a>
</p>

# 시작하기

몇 분 만에 Codingbuddy를 시작해 보세요.

## 사전 요구사항

- **Node.js**: v18 이상
- **AI 도구**: 지원되는 AI 코딩 어시스턴트 ([전체 목록](./supported-tools.md))

## 빠른 시작

### 1단계: 프로젝트 초기화

```bash
# Anthropic API 키 설정 (프로젝트 분석에 필요)
export ANTHROPIC_API_KEY=sk-ant-...

# 프로젝트에서 Codingbuddy 초기화
npx codingbuddy init
```

이 명령어는 프로젝트를 분석하고 다음 내용이 포함된 `codingbuddy.config.js` 파일을 생성합니다:

- 감지된 기술 스택 (언어, 프레임워크, 도구)
- 아키텍처 패턴
- 코딩 컨벤션
- 테스트 전략

### 2단계: AI 도구 설정

AI 어시스턴트에 Codingbuddy를 추가합니다. Claude Desktop 예시:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy-mcp"]
    }
  }
}
```

다른 AI 도구는 [지원 도구](./supported-tools.md)를 참조하세요.

### 3단계: 코딩 시작

이제 AI 어시스턴트가 다음에 접근할 수 있습니다:

- **프로젝트 컨텍스트**: 기술 스택, 아키텍처, 컨벤션
- **워크플로우 모드**: PLAN → ACT → EVAL
- **전문가 에이전트**: 보안, 성능, 접근성 전문가

사용 예시:

```
사용자: PLAN 사용자 인증 기능 만들어줘

AI: # Mode: PLAN
    프로젝트 패턴에 맞는 인증 기능을 설계하겠습니다...
```

## 설정

### 생성된 설정 파일

`codingbuddy.config.js` 파일로 AI 동작을 커스터마이징합니다:

```javascript
module.exports = {
  // AI가 이 언어로 응답
  language: 'ko',

  // 프로젝트 메타데이터
  projectName: 'my-app',

  // 기술 스택
  techStack: {
    languages: ['TypeScript'],
    frontend: ['React', 'Next.js'],
    backend: ['Node.js'],
  },

  // 아키텍처 패턴
  architecture: {
    pattern: 'feature-sliced-design',
  },

  // 코딩 컨벤션
  conventions: {
    naming: {
      files: 'kebab-case',
      components: 'PascalCase',
    },
  },

  // 테스트 방식
  testStrategy: {
    approach: 'tdd',
    coverage: 80,
  },
};
```

모든 옵션은 [설정 스키마](../config-schema.md)를 참조하세요.

### 추가 컨텍스트

AI가 알아야 할 프로젝트별 문서를 추가합니다:

```
my-project/
├── codingbuddy.config.js
└── .codingbuddy/
    └── context/
        ├── architecture.md    # 시스템 아키텍처 문서
        └── api-conventions.md # API 설계 가이드라인
```

### 무시 패턴

`.codingignore`를 생성하여 AI 분석에서 파일을 제외합니다:

```gitignore
# 의존성
node_modules/

# 빌드 결과물
dist/
.next/

# 민감한 파일
.env*
*.pem
```

## 워크플로우 모드 사용하기

### PLAN 모드 (기본)

변경하기 전에 계획부터 시작합니다:

```
사용자: PLAN 다크 모드 지원 추가해줘

AI: # Mode: PLAN

    ## 구현 계획
    1. 테마 컨텍스트 생성...
    2. 토글 컴포넌트 추가...
    3. 설정 저장...
```

### ACT 모드

계획에 따라 코드를 변경합니다:

```
사용자: ACT

AI: # Mode: ACT

    테마 컨텍스트 생성 중...
    [TDD에 따라 코드 변경]
```

### EVAL 모드

구현을 검토하고 개선합니다:

```
사용자: EVAL

AI: # Mode: EVAL

    ## 코드 리뷰
    - ✅ 테마 컨텍스트 타입 정의 완료
    - ⚠️ 시스템 설정 감지 추가 고려
```

## 전문가 에이전트 사용하기

특정 작업을 위해 도메인 전문가를 활성화합니다:

```
사용자: security-specialist 에이전트를 활성화해서 인증 검토해줘

AI: [security-specialist 활성화]

    ## 보안 검토
    - 비밀번호 해싱: ✅ bcrypt 사용 중
    - 세션 관리: ⚠️ 토큰 만료 시간 단축 고려
    ...
```

사용 가능한 전문가:

- `security-specialist` - 보안 감사
- `performance-specialist` - 최적화
- `accessibility-specialist` - WCAG 준수
- `code-reviewer` - 코드 품질
- 그 외 [전문가들](../../packages/rules/.ai-rules/agents/README.md)

## 다음 단계

- [지원 도구](./supported-tools.md) - 각 AI 도구별 설정 가이드
- [철학](./philosophy.md) - 설계 원칙 이해하기
- [API 레퍼런스](../api.md) - MCP 서버 기능
- [개발 가이드](../development.md) - Codingbuddy에 기여하기
