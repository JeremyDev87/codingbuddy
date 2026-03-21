# Skill Evaluation Schemas Reference

스킬 평가 시스템의 JSON 스키마 정의 및 작업 디렉토리 구조 레퍼런스.

## Table of Contents

- [Workspace Directory Structure](#workspace-directory-structure)
- [Schema Definitions](#schema-definitions)
  - [1. evals.json](#1-evalsjson)
  - [2. eval_metadata.json](#2-eval_metadatajson)
  - [3. grading.json](#3-gradingjson)
  - [4. timing.json](#4-timingjson)
  - [5. feedback.json](#5-feedbackjson)
  - [6. benchmark.json](#6-benchmarkjson)
  - [7. trigger_eval.json](#7-trigger_evaljson)
- [Schema Relationships](#schema-relationships)
- [Validation](#validation)

---

## Workspace Directory Structure

스킬 평가 시 사용하는 작업 디렉토리 구조. 각 iteration은 스킬 수정 사이클을 나타내며, 각 eval은 `with_skill`(스킬 적용)과 `without_skill`(베이스라인) 비교 실행을 포함한다.

```
workspace/
├── evals.json                     # 평가 시나리오 정의 (전체 iteration 공유)
├── trigger_eval.json              # 트리거 평가 케이스 (벤치마크 모드)
└── iteration-N/                   # N번째 스킬 수정 사이클
    ├── eval-0/                    # 첫 번째 평가 (0-based)
    │   ├── with_skill/            # 스킬 적용 실행
    │   │   ├── outputs/           # 생성된 출력 파일
    │   │   ├── eval_metadata.json # 평가 메타데이터
    │   │   ├── grading.json       # 채점 결과
    │   │   └── timing.json        # 실행 시간 측정
    │   └── without_skill/         # 베이스라인 실행 (스킬 미적용)
    │       ├── outputs/           # 생성된 출력 파일
    │       ├── eval_metadata.json # 평가 메타데이터
    │       ├── grading.json       # 채점 결과
    │       └── timing.json        # 실행 시간 측정
    ├── eval-1/                    # 두 번째 평가
    │   ├── with_skill/
    │   │   └── ...
    │   └── without_skill/
    │       └── ...
    ├── benchmark.json             # iteration 벤치마크 종합 결과
    ├── benchmark.md               # 벤치마크 마크다운 리포트
    └── feedback.json              # 사용자 피드백
```

**디렉토리 명명 규칙:**
- `iteration-N`: 1-based 순차 번호. SKILL.md 수정 시마다 새 iteration 생성
- `eval-N`: 0-based 순차 번호. `evals.json`의 각 시나리오에 대응
- `with_skill/`: 스킬을 적용한 상태에서 평가 실행
- `without_skill/`: 스킬 없이 베이스라인 실행 (비교 대상)
- `outputs/`: 각 실행에서 생성된 파일 (코드, 문서 등)

**파일 위치 규칙:**
- `evals.json`, `trigger_eval.json`: workspace 루트 (iteration 독립)
- `eval_metadata.json`, `grading.json`, `timing.json`: 각 eval의 `with_skill/` 또는 `without_skill/` 내부
- `benchmark.json`, `benchmark.md`, `feedback.json`: iteration 루트

---

## Schema Definitions

### 1. evals.json

평가 시나리오 목록을 정의한다. workspace 루트에 위치하며 모든 iteration에서 공유된다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/evals.json",
  "title": "Skill Evaluation Scenarios",
  "description": "스킬 평가 시나리오 정의",
  "type": "object",
  "required": ["skill_name", "evals"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "평가 대상 스킬명 (kebab-case)",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "evals": {
      "type": "array",
      "description": "평가 시나리오 목록",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "prompt", "expected_output", "files"],
        "properties": {
          "id": {
            "type": "integer",
            "minimum": 1,
            "description": "시나리오 ID (1-based)"
          },
          "prompt": {
            "type": "string",
            "description": "사용자 작업 프롬프트"
          },
          "expected_output": {
            "type": "string",
            "description": "기대 결과 설명"
          },
          "files": {
            "type": "array",
            "items": { "type": "string" },
            "description": "입력 파일 경로 목록 (없으면 빈 배열)"
          }
        }
      }
    }
  }
}
```

**예시:**

```json
{
  "skill_name": "test-driven-development",
  "evals": [
    {
      "id": 1,
      "prompt": "Add a function that validates email addresses",
      "expected_output": "Test file created first with failing test, then implementation, then refactor",
      "files": ["src/utils/validators.ts"]
    },
    {
      "id": 2,
      "prompt": "Fix the login timeout bug",
      "expected_output": "Failing test reproducing the bug, then minimal fix, then cleanup",
      "files": ["src/auth/login.ts", "src/auth/login.test.ts"]
    }
  ]
}
```

---

### 2. eval_metadata.json

개별 평가 실행의 메타데이터를 기록한다. 각 `with_skill/` 및 `without_skill/` 디렉토리에 위치한다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/eval_metadata.json",
  "title": "Evaluation Metadata",
  "description": "개별 평가 실행의 메타데이터",
  "type": "object",
  "required": ["eval_id", "eval_name", "prompt", "assertions"],
  "properties": {
    "eval_id": {
      "type": "integer",
      "minimum": 0,
      "description": "평가 ID (0-based, evals.json의 id-1에 대응)"
    },
    "eval_name": {
      "type": "string",
      "description": "평가의 설명적 이름"
    },
    "prompt": {
      "type": "string",
      "description": "사용자 작업 프롬프트 (evals.json에서 복사)"
    },
    "assertions": {
      "type": "array",
      "description": "검증 항목 목록",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": {
            "type": "string",
            "description": "검증 가능한 항목명"
          },
          "description": {
            "type": "string",
            "description": "통과 기준 설명"
          }
        }
      }
    }
  }
}
```

**예시:**

```json
{
  "eval_id": 0,
  "eval_name": "Email Validation TDD Cycle",
  "prompt": "Add a function that validates email addresses",
  "assertions": [
    {
      "name": "test_file_created_first",
      "description": "테스트 파일이 구현 파일보다 먼저 생성됨"
    },
    {
      "name": "test_initially_fails",
      "description": "구현 전 테스트 실행 시 실패함"
    },
    {
      "name": "minimal_implementation",
      "description": "테스트를 통과하는 최소한의 코드만 작성됨"
    },
    {
      "name": "refactor_step_present",
      "description": "GREEN 이후 리팩토링 단계가 수행됨"
    }
  ]
}
```

---

### 3. grading.json

평가 실행의 채점 결과를 기록한다. 각 assertion에 대한 통과/실패 판정과 근거를 포함한다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/grading.json",
  "title": "Grading Results",
  "description": "평가 채점 결과",
  "type": "object",
  "required": ["expectations"],
  "properties": {
    "expectations": {
      "type": "array",
      "description": "assertion별 채점 결과",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["text", "passed", "evidence"],
        "properties": {
          "text": {
            "type": "string",
            "description": "assertion 설명 (eval_metadata.json의 assertion.description에 대응)"
          },
          "passed": {
            "type": "boolean",
            "description": "통과 여부"
          },
          "evidence": {
            "type": "string",
            "description": "판정 근거 (구체적 증거)"
          }
        }
      }
    }
  }
}
```

**예시:**

```json
{
  "expectations": [
    {
      "text": "테스트 파일이 구현 파일보다 먼저 생성됨",
      "passed": true,
      "evidence": "validators.test.ts가 validators.ts보다 2분 먼저 생성됨 (git log 확인)"
    },
    {
      "text": "구현 전 테스트 실행 시 실패함",
      "passed": true,
      "evidence": "RED 단계에서 'Expected isValidEmail to be defined' 에러 확인"
    },
    {
      "text": "테스트를 통과하는 최소한의 코드만 작성됨",
      "passed": false,
      "evidence": "초기 구현에서 불필요한 도메인 검증 로직이 포함됨 (asserting 범위 초과)"
    }
  ]
}
```

**통과율 계산:**

```
pass_rate = expectations.filter(e => e.passed).length / expectations.length
```

---

### 4. timing.json

평가 실행의 시간 및 토큰 사용량을 기록한다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/timing.json",
  "title": "Timing Data",
  "description": "평가 실행 시간 및 토큰 사용량",
  "type": "object",
  "required": ["total_tokens", "duration_ms", "total_duration_seconds"],
  "properties": {
    "total_tokens": {
      "type": "integer",
      "minimum": 0,
      "description": "총 토큰 사용량 (input + output)"
    },
    "duration_ms": {
      "type": "integer",
      "minimum": 0,
      "description": "실행 시간 (밀리초)"
    },
    "total_duration_seconds": {
      "type": "number",
      "minimum": 0,
      "description": "총 실행 시간 (초, 소수점 포함)"
    }
  }
}
```

**예시:**

```json
{
  "total_tokens": 45230,
  "duration_ms": 32150,
  "total_duration_seconds": 32.15
}
```

**벤치마크 비교 시 사용:**
- `with_skill`과 `without_skill`의 timing.json을 비교하여 스킬 적용에 따른 토큰/시간 오버헤드를 측정

---

### 5. feedback.json

평가에 대한 사용자 피드백을 기록한다. iteration 루트에 위치하며, 여러 eval 실행에 대한 피드백을 통합 관리한다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/feedback.json",
  "title": "Evaluation Feedback",
  "description": "평가에 대한 사용자 피드백",
  "type": "object",
  "required": ["reviews", "status"],
  "properties": {
    "reviews": {
      "type": "array",
      "description": "피드백 항목 목록",
      "items": {
        "type": "object",
        "required": ["run_id", "feedback", "timestamp"],
        "properties": {
          "run_id": {
            "type": "string",
            "description": "실행 식별자 (예: eval-0-with_skill, eval-1-without_skill)",
            "pattern": "^eval-[0-9]+-(?:with_skill|without_skill)$"
          },
          "feedback": {
            "type": "string",
            "description": "사용자 피드백 내용"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "피드백 작성 시각 (ISO 8601)"
          }
        }
      }
    },
    "status": {
      "type": "string",
      "enum": ["in_progress", "complete"],
      "description": "피드백 수집 상태"
    }
  }
}
```

**예시:**

```json
{
  "reviews": [
    {
      "run_id": "eval-0-with_skill",
      "feedback": "TDD 사이클이 잘 지켜졌으나, RED 단계에서 에러 메시지 확인이 생략됨",
      "timestamp": "2026-03-21T14:30:00.000Z"
    },
    {
      "run_id": "eval-0-without_skill",
      "feedback": "스킬 없이 실행 시 테스트를 나중에 작성하는 경향이 있음",
      "timestamp": "2026-03-21T14:35:00.000Z"
    }
  ],
  "status": "in_progress"
}
```

**run_id 형식:**
- `eval-{eval_id}-with_skill`: 스킬 적용 실행에 대한 피드백
- `eval-{eval_id}-without_skill`: 베이스라인 실행에 대한 피드백

---

### 6. benchmark.json

iteration 단위의 벤치마크 종합 결과를 기록한다. 모든 eval의 `with_skill` vs `without_skill` 비교 데이터를 집계한다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/benchmark.json",
  "title": "Benchmark Results",
  "description": "iteration 벤치마크 종합 결과",
  "type": "object",
  "required": ["skill_name", "iteration", "summary", "eval_results"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "평가 대상 스킬명",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "iteration": {
      "type": "integer",
      "minimum": 1,
      "description": "iteration 번호 (1-based)"
    },
    "summary": {
      "type": "object",
      "description": "전체 eval 통합 요약 통계",
      "required": ["pass_rate", "tokens", "duration_seconds"],
      "properties": {
        "pass_rate": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "평균 통과율 (0.0~1.0)"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "통과율 표준편차"
            }
          }
        },
        "tokens": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "description": "평균 토큰 사용량"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "토큰 표준편차"
            }
          }
        },
        "duration_seconds": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "description": "평균 실행 시간 (초)"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "시간 표준편차"
            }
          }
        }
      }
    },
    "eval_results": {
      "type": "array",
      "description": "개별 eval 비교 결과",
      "items": {
        "type": "object",
        "required": ["eval_id", "with_skill", "baseline"],
        "properties": {
          "eval_id": {
            "type": "integer",
            "minimum": 0,
            "description": "평가 ID (0-based)"
          },
          "with_skill": {
            "type": "object",
            "required": ["pass_rate", "tokens", "duration"],
            "description": "스킬 적용 결과",
            "properties": {
              "pass_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "통과율 (0.0~1.0)"
              },
              "tokens": {
                "type": "integer",
                "minimum": 0,
                "description": "토큰 사용량"
              },
              "duration": {
                "type": "number",
                "minimum": 0,
                "description": "실행 시간 (초)"
              }
            }
          },
          "baseline": {
            "type": "object",
            "required": ["pass_rate", "tokens", "duration"],
            "description": "베이스라인 (스킬 미적용) 결과",
            "properties": {
              "pass_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "tokens": {
                "type": "integer",
                "minimum": 0
              },
              "duration": {
                "type": "number",
                "minimum": 0
              }
            }
          }
        }
      }
    }
  }
}
```

**예시:**

```json
{
  "skill_name": "test-driven-development",
  "iteration": 1,
  "summary": {
    "pass_rate": { "mean": 0.85, "stddev": 0.12 },
    "tokens": { "mean": 42000, "stddev": 5200 },
    "duration_seconds": { "mean": 35.5, "stddev": 8.3 }
  },
  "eval_results": [
    {
      "eval_id": 0,
      "with_skill": { "pass_rate": 0.75, "tokens": 45230, "duration": 32.15 },
      "baseline": { "pass_rate": 0.50, "tokens": 38400, "duration": 28.90 }
    },
    {
      "eval_id": 1,
      "with_skill": { "pass_rate": 1.0, "tokens": 38770, "duration": 38.85 },
      "baseline": { "pass_rate": 0.25, "tokens": 35200, "duration": 25.40 }
    }
  ]
}
```

**해석 가이드:**
- `with_skill.pass_rate > baseline.pass_rate`: 스킬이 품질을 향상시킴
- `with_skill.tokens > baseline.tokens`: 스킬 적용 시 토큰 오버헤드 발생
- `summary.pass_rate.stddev`가 낮을수록 일관된 성능

---

### 7. trigger_eval.json

스킬 추천 트리거 평가를 위한 테스트 케이스를 정의한다. `recommend_skills`의 트리거 정확도를 측정하는 벤치마크 모드에서 사용된다.

**스키마:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/trigger_eval.json",
  "title": "Trigger Evaluation Cases",
  "description": "스킬 추천 트리거 정확도 테스트 케이스",
  "type": "array",
  "minItems": 1,
  "items": {
    "type": "object",
    "required": ["query", "should_trigger"],
    "properties": {
      "query": {
        "type": "string",
        "description": "사용자 프롬프트 (테스트 입력)"
      },
      "should_trigger": {
        "type": "boolean",
        "description": "이 프롬프트에서 스킬이 추천되어야 하는가"
      }
    }
  }
}
```

**예시:**

```json
[
  {
    "query": "Add a new feature to validate user registration",
    "should_trigger": true
  },
  {
    "query": "Fix the null pointer exception in the payment module",
    "should_trigger": true
  },
  {
    "query": "What does this function do?",
    "should_trigger": false
  },
  {
    "query": "Deploy the application to production",
    "should_trigger": false
  }
]
```

**사용 방법:**
1. `trigger_eval.json`의 각 `query`를 `recommend_skills`에 전달
2. 결과에 해당 스킬이 포함되었는지 확인
3. `should_trigger`와 비교하여 정확도 계산

**정확도 지표:**
- **Precision**: 추천된 것 중 올바른 비율
- **Recall**: 추천되어야 할 것 중 실제 추천된 비율
- **F1 Score**: Precision과 Recall의 조화 평균

---

## Schema Relationships

```
evals.json (workspace 루트)
    │
    │ eval.id → eval_id 매핑
    ▼
iteration-N/eval-{id}/
    ├── with_skill/
    │   ├── eval_metadata.json ◄── evals.json의 prompt, assertions 정의
    │   ├── grading.json ◄── eval_metadata.json의 assertions 채점
    │   └── timing.json ── 독립 측정
    └── without_skill/
        ├── eval_metadata.json
        ├── grading.json
        └── timing.json
    │
    ▼ 집계
iteration-N/
    ├── benchmark.json ◄── 모든 eval의 with_skill vs without_skill 비교
    └── feedback.json ◄── 사용자 피드백 (run_id로 eval 참조)

trigger_eval.json (workspace 루트) ── recommend_skills 정확도 측정 (독립)
```

**데이터 흐름:**
1. `evals.json`에 평가 시나리오 정의
2. 각 eval에 대해 `with_skill/`과 `without_skill/` 실행
3. `eval_metadata.json`에 실행 정보 기록
4. `grading.json`에 assertion별 채점 결과 저장
5. `timing.json`에 토큰/시간 측정
6. `benchmark.json`에서 모든 eval 결과 집계 및 비교
7. `feedback.json`에 사용자 피드백 수집
8. `trigger_eval.json`으로 추천 정확도 별도 측정

**ID 매핑:**
- `evals.json`의 `id` (1-based) → `eval-{id-1}/` 디렉토리 (0-based)
- `eval_metadata.json`의 `eval_id` (0-based) = 디렉토리의 eval 번호
- `feedback.json`의 `run_id` = `eval-{eval_id}-{with_skill|without_skill}`

---

## Validation

### ajv CLI로 검증

```bash
# evals.json 검증
npx ajv-cli@5.0.0 validate \
  -s schemas/evals.schema.json \
  -d workspace/evals.json \
  --spec=draft7

# iteration 내 모든 grading.json 검증
for f in workspace/iteration-*/eval-*/*/grading.json; do
  npx ajv-cli@5.0.0 validate \
    -s schemas/grading.schema.json \
    -d "$f" \
    --spec=draft7
done

# trigger_eval.json 검증
npx ajv-cli@5.0.0 validate \
  -s schemas/trigger_eval.schema.json \
  -d workspace/trigger_eval.json \
  --spec=draft7
```

### 프로그래밍 방식 검증

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// 스키마 로드
const evalsSchema = require('./schemas/evals.schema.json');
const gradingSchema = require('./schemas/grading.schema.json');
const timingSchema = require('./schemas/timing.schema.json');

// 검증 함수 컴파일
const validateEvals = ajv.compile(evalsSchema);
const validateGrading = ajv.compile(gradingSchema);
const validateTiming = ajv.compile(timingSchema);

// 데이터 검증
const evalsData = require('./workspace/evals.json');
if (!validateEvals(evalsData)) {
  console.error('evals.json validation errors:', validateEvals.errors);
}
```

### 일관성 검증

스키마 간 참조 무결성을 확인하는 추가 검증:

```typescript
// evals.json의 id와 eval 디렉토리 매핑 확인
function validateConsistency(workspacePath: string): string[] {
  const errors: string[] = [];
  const evals = require(`${workspacePath}/evals.json`);

  for (const eval of evals.evals) {
    const evalDir = `${workspacePath}/iteration-1/eval-${eval.id - 1}`;

    // with_skill 디렉토리 존재 확인
    if (!fs.existsSync(`${evalDir}/with_skill/eval_metadata.json`)) {
      errors.push(`Missing: ${evalDir}/with_skill/eval_metadata.json`);
    }

    // without_skill 디렉토리 존재 확인
    if (!fs.existsSync(`${evalDir}/without_skill/eval_metadata.json`)) {
      errors.push(`Missing: ${evalDir}/without_skill/eval_metadata.json`);
    }
  }

  return errors;
}
```
